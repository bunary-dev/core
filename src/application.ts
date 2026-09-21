/**
 * Instance-scoped application.
 *
 * Everything an app owns — config, environment, bindings, boot state — lives on
 * the instance, never in module scope, so several apps can run side by side in
 * one process (tests, workers, a CLI driving two projects).
 */

import { type ConfigRepository, createConfig } from "./config.js";
import type { EnvironmentType } from "./constants.js";
import { resolveEnvironment } from "./environment.js";
import { MissingBindingError } from "./errors.js";
import type { Token } from "./token.js";
import type { BunaryConfig } from "./types.js";

/**
 * Options accepted by {@link createApp}.
 *
 * @example
 * ```ts
 * import { createApp, type CreateAppOptions } from "@bunary/core";
 *
 * const options: CreateAppOptions = {
 *   config: { app: { name: "MyApp", env: "development" } },
 * };
 *
 * const app = createApp(options);
 * ```
 */
export interface CreateAppOptions {
  /** Root config for this app; validated through `defineConfig`. */
  config: BunaryConfig;
}

/**
 * An instance-scoped Bunary application.
 *
 * Holds this app's config repository, resolved environment and token registry.
 * The environment comes from `config.app.env`, then `APP_ENV`, then
 * `NODE_ENV`, then `development`.
 * No global state, no container, no facades: you hold the instance, or you
 * do not reach it.
 *
 * @example
 * ```ts
 * import { createApp, createToken } from "@bunary/core";
 *
 * const DB = createToken<{ url: string }>("db");
 *
 * const app = createApp({ config: { app: { name: "MyApp" } } });
 * app.set(DB, { url: "postgres://localhost/app" });
 *
 * await app.boot();
 *
 * app.booted; // true
 * app.env; // "development"
 * app.get(DB).url; // "postgres://localhost/app"
 * ```
 */
export interface Application {
  /** This app's config repository, built from `options.config`. */
  readonly config: ConfigRepository;
  /** The environment this app runs in. */
  readonly env: EnvironmentType;
  /** Whether {@link Application.boot} has completed. */
  readonly booted: boolean;
  /**
   * Bind a value to a token.
   *
   * Allowed at any time, including after boot, but providers should register
   * their bindings before boot so everything booting can rely on them.
   *
   * @param token - The token to bind
   * @param value - The value to store
   * @returns This app, for chaining
   */
  set: <T>(token: Token<T>, value: NoInfer<T>) => this;
  /**
   * Read the value bound to a token.
   *
   * @param token - The token to read
   * @returns The bound value, typed by the token
   * @throws {MissingBindingError} If nothing is bound to the token
   */
  get: <T>(token: Token<T>) => T;
  /**
   * Check whether a token has a binding.
   *
   * @param token - The token to check
   * @returns `true` when a value is bound, even when that value is nullish
   */
  has: (token: Token<unknown>) => boolean;
  /**
   * Boot the app.
   *
   * Idempotent: repeated calls return the same promise and boot runs once,
   * so concurrent callers cannot double-boot.
   *
   * @returns A promise resolving to this app
   */
  boot: () => Promise<this>;
}

class BunaryApplication implements Application {
  readonly config: ConfigRepository;
  readonly env: EnvironmentType;

  readonly #bindings = new Map<Token<unknown>, unknown>();
  #booted = false;
  #bootPromise: Promise<this> | undefined;

  constructor(options: CreateAppOptions) {
    this.config = createConfig(options.config);
    this.env = resolveEnvironment(this.config.get().app.env);
  }

  get booted(): boolean {
    return this.#booted;
  }

  set<T>(token: Token<T>, value: NoInfer<T>): this {
    this.#bindings.set(token as Token<unknown>, value);
    return this;
  }

  get<T>(token: Token<T>): T {
    const key = token as Token<unknown>;

    if (!this.#bindings.has(key)) {
      throw new MissingBindingError(token);
    }

    return this.#bindings.get(key) as T;
  }

  has(token: Token<unknown>): boolean {
    return this.#bindings.has(token);
  }

  boot(): Promise<this> {
    this.#bootPromise ??= this.#runBoot();
    return this.#bootPromise;
  }

  async #runBoot(): Promise<this> {
    // #57 runs provider register/boot hooks here, in declaration order.
    this.#booted = true;
    return this;
  }
}

/**
 * Create an instance-scoped Bunary application.
 *
 * The config is validated through `defineConfig`, so an invalid config fails
 * here rather than at first use. Two apps created in one process share no
 * config and no bindings.
 *
 * @param options - The app's config
 * @returns A new, unbooted {@link Application}
 * @throws If the config is invalid (for example an empty `app.name`, or an
 * unknown `app.env` / `APP_ENV` / `NODE_ENV` value)
 *
 * @example
 * ```ts
 * import { createApp, createToken } from "@bunary/core";
 *
 * const CLOCK = createToken<() => Date>("clock");
 *
 * const app = createApp({ config: { app: { name: "MyApp" } } });
 * app.set(CLOCK, () => new Date());
 *
 * await app.boot();
 *
 * app.get(CLOCK)(); // Date
 * ```
 */
export function createApp(options: CreateAppOptions): Application {
  return new BunaryApplication(options);
}
