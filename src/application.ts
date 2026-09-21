/**
 * Instance-scoped application.
 *
 * Everything an app owns — config, environment, bindings, boot state — lives on
 * the instance, never in module scope, so several apps can run side by side in
 * one process (tests, workers, a CLI driving two projects).
 */

import { type BunaryConfigStore, createConfig } from "./config.js";
import type { EnvironmentType } from "./constants.js";
import { resolveEnvironment } from "./environment.js";
import { BunaryError, MissingBindingError } from "./errors.js";
import { describeProvider, type Provider } from "./provider.js";
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
 *   providers: [{ name: "noop" }],
 * };
 *
 * const app = createApp(options);
 * ```
 */
export interface CreateAppOptions {
  /** Root config for this app; validated through `defineConfig`. */
  config: BunaryConfig;
  /**
   * Service providers, run by {@link Application.boot} in this exact order.
   *
   * There is no dependency graph: every `register` runs in declaration
   * order, then every `boot` in declaration order. The array is copied, so
   * mutating it afterwards does not change what the app boots.
   */
  providers?: readonly Provider[];
}

/**
 * An instance-scoped Bunary application.
 *
 * Holds this app's config store, resolved environment and token registry.
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
  /** This app's config store, built from `options.config`. */
  readonly config: BunaryConfigStore;
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
   * Append a provider to this app's declaration order.
   *
   * Only valid before boot starts: once {@link Application.boot} has been
   * called the provider list is sealed, because `register` would run after
   * other providers had already booted.
   *
   * @param provider - The provider to append
   * @returns This app, for chaining
   * @throws {BunaryError} If boot has already started
   *
   * @example
   * ```ts
   * import { createApp, createToken, defineProvider } from "@bunary/core";
   *
   * const CLOCK = createToken<() => Date>("clock");
   * const app = createApp({ config: { app: { name: "MyApp" } } });
   *
   * app.use(
   *   defineProvider({
   *     name: "clock",
   *     register: (a) => {
   *       a.set(CLOCK, () => new Date());
   *     },
   *     boot: (a) => {
   *       a.get(CLOCK)();
   *     },
   *   }),
   * );
   *
   * await app.boot();
   * ```
   */
  use: (provider: Provider) => this;
  /**
   * Boot the app.
   *
   * Runs every provider's `register` in declaration order, then every
   * provider's `boot` in declaration order, awaiting each one before the
   * next. {@link Application.booted} flips only once all of them resolve.
   *
   * Idempotent: repeated calls return the same promise and boot runs once,
   * so concurrent callers cannot double-boot.
   *
   * A failed boot is permanent. The rejected promise is cached, so every
   * later `boot()` returns the same rejection and `booted` stays `false`:
   * an app that failed to boot is dead, create a new one.
   *
   * @returns A promise resolving to this app
   * @throws {BunaryError} (as a rejection) If a `register` returns a promise,
   * or if any hook throws something that is not already a `BunaryError`, in
   * which case the original error is kept as `cause`
   *
   * @example
   * ```ts
   * import { createApp, createToken, defineProvider } from "@bunary/core";
   *
   * const DB = createToken<{ url: string }>("db");
   *
   * const app = createApp({
   *   config: { app: { name: "MyApp" } },
   *   providers: [
   *     defineProvider({
   *       name: "database",
   *       register: (a) => {
   *         a.set(DB, { url: "postgres://localhost/app" });
   *       },
   *       boot: async (a) => {
   *         await Promise.resolve(a.get(DB).url);
   *       },
   *     }),
   *   ],
   * });
   *
   * await app.boot();
   *
   * app.booted; // true
   * ```
   */
  boot: () => Promise<this>;
}

/**
 * Whether a value returned by a hook is thenable.
 *
 * `register` is declared `: void`, and TypeScript lets an `async` function
 * satisfy a void-returning signature, so an accidental `async register` only
 * shows up at runtime.
 */
function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof (value as PromiseLike<unknown> | undefined)?.then === "function"
  );
}

/**
 * Re-throw a provider failure, wrapping anything that is not already ours.
 */
function rethrowProviderFailure(
  error: unknown,
  provider: Provider,
  index: number,
  hook: "register" | "boot",
): never {
  if (error instanceof BunaryError) {
    throw error;
  }

  throw new BunaryError(
    `${describeProvider(provider, index)} failed during ${hook}()`,
    { cause: error },
  );
}

class BunaryApplication implements Application {
  readonly config: BunaryConfigStore;
  readonly env: EnvironmentType;

  readonly #bindings = new Map<Token<unknown>, unknown>();
  readonly #providers: Provider[] = [];
  #booted = false;
  #bootPromise: Promise<this> | undefined;

  constructor(options: CreateAppOptions) {
    this.config = createConfig(options.config);
    this.env = resolveEnvironment(this.config.get().app.env);
    this.#providers.push(...(options.providers ?? []));
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

  use(provider: Provider): this {
    if (this.#bootPromise !== undefined) {
      throw new BunaryError(
        `Cannot add ${describeProvider(provider, this.#providers.length)} after boot() has started`,
      );
    }

    this.#providers.push(provider);
    return this;
  }

  boot(): Promise<this> {
    this.#bootPromise ??= this.#runBoot();
    return this.#bootPromise;
  }

  async #runBoot(): Promise<this> {
    // Every register first, synchronously and in declaration order, so no
    // boot can observe a half-registered app.
    for (const [index, provider] of this.#providers.entries()) {
      let result: unknown;

      try {
        result = provider.register?.(this);
      } catch (error) {
        rethrowProviderFailure(error, provider, index, "register");
      }

      if (isThenable(result)) {
        throw new BunaryError(
          `${describeProvider(provider, index)} returned a promise from register(); register must be synchronous - move async work into boot()`,
        );
      }
    }

    // Then every boot, awaited one at a time, in the same order.
    for (const [index, provider] of this.#providers.entries()) {
      try {
        await provider.boot?.(this);
      } catch (error) {
        rethrowProviderFailure(error, provider, index, "boot");
      }
    }

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
