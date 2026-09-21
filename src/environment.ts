/**
 * Environment helpers using Bun.env.
 *
 * Two different things live here and are easy to confuse:
 * the environment *name* (`development` | `production` | `test`, resolved from
 * `APP_ENV` then `NODE_ENV`), and environment *variables* (`env`, `defineEnv`).
 */

import { Environment, type EnvironmentType } from "./constants.js";
import { BunaryError } from "./errors.js";
import {
  type SchemaLike,
  type StandardSchemaV1,
  validateWith,
} from "./schema.js";

const ENVIRONMENT_NAMES = Object.values(Environment);

const TRUTHY = new Set(["true", "1", "yes", "on"]);
const FALSY = new Set(["false", "0", "no", "off"]);

/** Treat empty and whitespace-only values as unset. */
function present(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value.trim() === "" ? undefined : value;
}

/**
 * Get an environment variable with optional default and automatic type coercion.
 *
 * Coercion follows the default value's type. Empty and whitespace-only values
 * count as unset, booleans are case-insensitive (`true/1/yes/on` and
 * `false/0/no/off`, anything else falls back to the default), numbers are
 * trimmed before parsing and fall back on `NaN`, and strings are returned
 * verbatim — never trimmed.
 *
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set (also determines return type)
 * @returns The environment variable value, coerced to match defaultValue type
 *
 * @example
 * ```ts
 * import { env } from "@bunary/core";
 *
 * const port = env("PORT", 3000);      // number
 * const debug = env("DEBUG", false);   // boolean, accepts "TRUE" / "on" / "1"
 * const name = env("APP_NAME", "app"); // string
 * const secret = env("SECRET");        // string | undefined
 * ```
 */
export function env(key: string): string | undefined;
export function env(key: string, defaultValue: string): string;
export function env(key: string, defaultValue: number): number;
export function env(key: string, defaultValue: boolean): boolean;
export function env(
  key: string,
  defaultValue?: string | number | boolean,
): string | number | boolean | undefined {
  const value = present(Bun.env[key]);

  if (value === undefined) {
    return defaultValue;
  }

  if (typeof defaultValue === "boolean") {
    const normalized = value.trim().toLowerCase();

    if (TRUTHY.has(normalized)) return true;
    if (FALSY.has(normalized)) return false;

    return defaultValue;
  }

  if (typeof defaultValue === "number") {
    const num = Number(value.trim());
    return Number.isNaN(num) ? defaultValue : num;
  }

  return value;
}

/**
 * Resolve the environment name an app runs in.
 *
 * Precedence: the explicit value, then `APP_ENV`, then `NODE_ENV`, then
 * `development`. Empty and whitespace-only values count as unset. An
 * unrecognised value throws rather than falling back, so a typo like
 * `APP_ENV=prod` never silently boots an app in development mode.
 *
 * @param explicit - A value that wins over both env vars, e.g. `config.app.env`
 * @returns The resolved environment name
 * @throws {BunaryError} If the winning value is not a known environment
 *
 * @example
 * ```ts
 * import { resolveEnvironment } from "@bunary/core";
 *
 * // APP_ENV=production NODE_ENV=development
 * resolveEnvironment();              // "production"
 * resolveEnvironment("test");        // "test"
 * resolveEnvironment("staging");     // throws BunaryError
 * ```
 */
export function resolveEnvironment(explicit?: string): EnvironmentType {
  const value =
    present(explicit) ??
    present(Bun.env.APP_ENV) ??
    present(Bun.env.NODE_ENV) ??
    Environment.DEVELOPMENT;

  if (!ENVIRONMENT_NAMES.includes(value as EnvironmentType)) {
    throw new BunaryError(
      `Unknown environment "${value}" (expected ${ENVIRONMENT_NAMES.join(", ")})`,
    );
  }

  return value as EnvironmentType;
}

/**
 * The environment name resolved from the process, ignoring any app config.
 *
 * Shorthand for `resolveEnvironment()`. Prefer `app.env` when you hold an
 * `Application`: that one also honours `config.app.env`.
 *
 * @returns The resolved environment name
 * @throws {BunaryError} If `APP_ENV` or `NODE_ENV` holds an unknown value
 *
 * @example
 * ```ts
 * import { environment } from "@bunary/core";
 *
 * environment(); // "development" when neither APP_ENV nor NODE_ENV is set
 * ```
 */
export function environment(): EnvironmentType {
  return resolveEnvironment();
}

/**
 * Check if running in development mode.
 *
 * @returns `true` when the resolved environment is `development`
 *
 * @example
 * ```ts
 * import { isDev } from "@bunary/core";
 *
 * if (isDev()) {
 *   console.log("Running in development mode");
 * }
 * ```
 */
export function isDev(): boolean {
  return environment() === Environment.DEVELOPMENT;
}

/**
 * Check if running in production mode.
 *
 * @returns `true` when the resolved environment is `production`
 *
 * @example
 * ```ts
 * import { isProd } from "@bunary/core";
 *
 * const logLevel = isProd() ? "warn" : "debug";
 * ```
 */
export function isProd(): boolean {
  return environment() === Environment.PRODUCTION;
}

/**
 * Check if running in test mode.
 *
 * @returns `true` when the resolved environment is `test`
 *
 * @example
 * ```ts
 * import { isTest } from "@bunary/core";
 *
 * if (isTest()) {
 *   // skip the outbound mailer
 * }
 * ```
 */
export function isTest(): boolean {
  return environment() === Environment.TEST;
}

/**
 * The raw values {@link defineEnv} validates: `Bun.env` or something shaped
 * like it.
 */
export type EnvSource = Record<string, string | undefined>;

/**
 * Anything {@link defineEnv} accepts.
 *
 * Standard Schema objects are taken with an `unknown` input, because coercing
 * schemas (`z.coerce.number()`) declare an input wider than `string`.
 */
export type EnvSchema<Output> =
  | StandardSchemaV1<unknown, Output>
  | ((input: EnvSource) => Output);

/**
 * The parsed shape produced by a {@link defineEnv} schema.
 *
 * @example
 * ```ts
 * import { defineEnv, type EnvOf } from "@bunary/core";
 * import { z } from "zod";
 *
 * const schema = z.object({ PORT: z.coerce.number() });
 * type AppEnv = EnvOf<typeof schema>; // Readonly<{ PORT: number }>
 *
 * export const appEnv: AppEnv = defineEnv(schema);
 * ```
 */
export type EnvOf<S> =
  S extends StandardSchemaV1<unknown, infer Output>
    ? Readonly<Output>
    : S extends (input: EnvSource) => infer Output
      ? Readonly<Output>
      : never;

/**
 * Validate the process environment once and return it typed and frozen.
 *
 * Call it at the top level of `bunary.config.ts` so a bad `.env` fails at
 * boot, with the offending key and the validator's own message, rather than at
 * first use. It reads `Bun.env` by default; pass a source to validate
 * something else (a test fixture, a parsed `.env` file).
 *
 * `env()` stays available for one-off lookups, but the `defineEnv` output is
 * what apps should read.
 *
 * @param schema - A Standard Schema object or plain function
 * @param source - The values to validate; defaults to `Bun.env`
 * @returns The schema's output, frozen
 * @throws {ValidationError} If the schema rejects the source
 *
 * @example
 * ```ts
 * import { defineEnv } from "@bunary/core";
 * import { z } from "zod";
 *
 * export const appEnv = defineEnv(
 *   z.object({
 *     PORT: z.coerce.number().default(3000),
 *     DATABASE_URL: z.string(),
 *   }),
 * );
 *
 * appEnv.PORT; // number
 * ```
 */
export function defineEnv<Output>(
  schema: EnvSchema<Output>,
  source: EnvSource = Bun.env,
): Readonly<Output> {
  // Safe widening: a schema declaring an `unknown` input accepts an EnvSource.
  const validator = schema as SchemaLike<EnvSource, Output>;

  return Object.freeze(validateWith(validator, source, "Environment"));
}
