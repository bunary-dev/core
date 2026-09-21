/**
 * Error types thrown by @bunary/core.
 */

import type { Token } from "./token.js";

/**
 * Base class for every error thrown by Bunary.
 *
 * Catch this to handle any framework error; catch a subclass for a specific
 * failure. The standard `cause` option is supported and preserved.
 *
 * @example
 * ```ts
 * import { BunaryError } from "@bunary/core";
 *
 * try {
 *   app.get(DB);
 * } catch (error) {
 *   if (error instanceof BunaryError) {
 *     console.error(error.name, error.message);
 *   }
 * }
 * ```
 */
export class BunaryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "BunaryError";
  }
}

/**
 * Thrown by `Application.get` when no value is bound to the given token.
 *
 * The offending token is kept on the error so callers can report or recover
 * without parsing the message.
 *
 * @example
 * ```ts
 * import { createApp, createToken, MissingBindingError } from "@bunary/core";
 *
 * const DB = createToken<{ url: string }>("db");
 * const app = createApp({ config: { app: { name: "MyApp" } } });
 *
 * try {
 *   app.get(DB);
 * } catch (error) {
 *   if (error instanceof MissingBindingError) {
 *     error.message; // 'No binding registered for token "db"'
 *     error.token === DB; // true
 *   }
 * }
 * ```
 */
export class MissingBindingError extends BunaryError {
  /** The token that had no binding. */
  readonly token: Token<unknown>;

  constructor(token: Token<unknown>, options?: ErrorOptions) {
    super(`No binding registered for token "${token.name}"`, options);
    this.name = "MissingBindingError";
    this.token = token;
  }
}
