/**
 * Typed registry keys for application bindings.
 *
 * A token is an opaque object: identity is the object itself, never its name.
 * Two tokens created with the same name are different keys, so packages can
 * export their own tokens without colliding with anyone else's.
 */

declare const tokenValue: unique symbol;

/**
 * An explicit, typed registry key.
 *
 * The value type `T` is carried as a phantom type: it exists only at compile
 * time and makes `app.get(token)` return `T` without any casting.
 *
 * @example
 * ```ts
 * import { createToken, type Token } from "@bunary/core";
 *
 * interface Db {
 *   query: (sql: string) => Promise<unknown>;
 * }
 *
 * export const DB: Token<Db> = createToken<Db>("db");
 * ```
 */
export interface Token<T> {
  /** Human-readable name, used in error messages only. */
  readonly name: string;
  /** Phantom type marker; never present at runtime. */
  readonly [tokenValue]: T;
  /** Renders as `Token(name)` in `Object.prototype.toString`. */
  readonly [Symbol.toStringTag]: string;
  /** Renders as `Token(name)` in messages and template strings. */
  toString: () => string;
}

/**
 * Create a typed registry key for `Application.set` / `Application.get`.
 *
 * The returned token is frozen and unique: calling `createToken("db")` twice
 * produces two distinct keys. Export the token from your package so consumers
 * bind and read the same identity.
 *
 * @param name - Human-readable name, used only in error messages
 * @returns A frozen, uniquely identified token carrying the value type `T`
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
 * app.get(DB).url; // "postgres://localhost/app", typed as string
 * ```
 */
export function createToken<T>(name: string): Token<T> {
  const token = {
    name,
    [Symbol.toStringTag]: `Token(${name})`,
    toString: () => `Token(${name})`,
  };

  return Object.freeze(token) as unknown as Token<T>;
}
