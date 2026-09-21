/**
 * Service providers: the unit of bootstrap for a Bunary application.
 *
 * A provider is a plain object with two optional hooks. `register` is
 * synchronous and only binds tokens; `boot` may be async and may read them.
 * The app runs every `register` first, then every `boot`, both in the order
 * the providers were declared. There is no dependency graph and no container:
 * ordering is the array you wrote.
 */

import type { Application } from "./application.js";

/**
 * A unit of application bootstrap.
 *
 * Providers are plain objects, so no class, base class or decorator is
 * needed. Both hooks are optional: a provider that only binds services has a
 * `register`, a provider that only starts something has a `boot`.
 *
 * @example
 * ```ts
 * import { createApp, createToken, type Provider } from "@bunary/core";
 *
 * const DB = createToken<{ url: string }>("db");
 *
 * const databaseProvider: Provider = {
 *   name: "database",
 *   register(app) {
 *     app.set(DB, { url: "postgres://localhost/app" });
 *   },
 *   async boot(app) {
 *     await Promise.resolve(app.get(DB).url);
 *   },
 * };
 *
 * const app = createApp({
 *   config: { app: { name: "MyApp" } },
 *   providers: [databaseProvider],
 * });
 *
 * await app.boot();
 *
 * app.get(DB).url; // "postgres://localhost/app"
 * ```
 */
export interface Provider {
  /** Optional name used in error messages and debugging. */
  readonly name?: string;
  /**
   * Bind this provider's tokens.
   *
   * Runs before every provider's `boot`, so it must be synchronous and must
   * not read other providers' bindings - they may not exist yet. Returning a
   * promise is an error: `app.boot()` rejects and names the provider.
   *
   * @param app - The app being booted
   */
  register?(app: Application): void;
  /**
   * Start this provider's work.
   *
   * Runs after every provider's `register`, so every declared binding is
   * available here. May be async; the app awaits it before booting the next
   * provider.
   *
   * @param app - The app being booted
   * @returns Nothing, or a promise the app awaits
   */
  boot?(app: Application): void | Promise<void>;
}

/**
 * Identity helper that types a provider literal as a {@link Provider}.
 *
 * Purely for authoring: it returns the very object it was given, but the
 * contextual type means `app` is typed inside the hooks and a typo in a hook
 * name is caught where you wrote it rather than at boot.
 *
 * @param provider - The provider object
 * @returns The same object, typed as a {@link Provider}
 *
 * @example
 * ```ts
 * import { createApp, createToken, defineProvider } from "@bunary/core";
 *
 * const CLOCK = createToken<() => Date>("clock");
 *
 * export const clockProvider = defineProvider({
 *   name: "clock",
 *   register(app) {
 *     app.set(CLOCK, () => new Date());
 *   },
 *   async boot(app) {
 *     await Promise.resolve(app.get(CLOCK)());
 *   },
 * });
 *
 * const app = createApp({
 *   config: { app: { name: "MyApp" } },
 *   providers: [clockProvider],
 * });
 *
 * await app.boot();
 * ```
 */
export function defineProvider(provider: Provider): Provider {
  return provider;
}

/**
 * Describe a provider for an error message.
 *
 * @param provider - The provider to describe
 * @param index - Its position in the declaration order
 * @returns Its name when it has one, otherwise its index
 *
 * @internal
 */
export function describeProvider(provider: Provider, index: number): string {
  return provider.name === undefined
    ? `provider at index ${index}`
    : `provider "${provider.name}"`;
}
