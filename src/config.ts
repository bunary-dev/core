/**
 * Instance-scoped configuration.
 *
 * One `bunary.config.ts` holds top-level namespaces (`app`, `http`,
 * `database`, ...). `defineConfig` normalises and optionally validates it;
 * `createConfig` turns it into a {@link ConfigRepository}, an immutable
 * snapshot with Laravel-style `get` / `has` / `filled`.
 *
 * The repository never freezes and never mutates the object it is given
 * (issue #47): it keeps a shallow copy of the top level and of `app`, and
 * holds nested values by reference. Those nested values are read-only by
 * convention — core will not stop you mutating your own config object, it
 * just refuses to do it for you.
 */

import { env as envVar, resolveEnvironment } from "./environment.js";
import { BunaryError } from "./errors.js";
import { resolvePath } from "./path.js";
import {
  type SchemaLike,
  type StandardSchemaV1,
  validateWith,
} from "./schema.js";
import type { BunaryConfig } from "./types.js";

/** Values a dot-path can never be walked into. */
type Leaf =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | readonly unknown[]
  // biome-ignore lint/complexity/noBannedTypes: matching any callable shape
  | Function;

/** Every dot-path reachable in `T`, to a fixed depth. */
type PathsOf<
  T,
  Depth extends readonly unknown[] = [],
> = Depth["length"] extends 5
  ? never
  : [T] extends [Leaf]
    ? never
    : {
        [K in Extract<keyof T, string>]-?:
          | K
          | `${K}.${PathsOf<NonNullable<T[K]>, [unknown, ...Depth]>}`;
      }[Extract<keyof T, string>];

/**
 * A dot-path into {@link BunaryConfig}.
 *
 * Known paths (including those added by module augmentation) are offered as
 * completions; any other string is still accepted, because a package may read
 * a namespace whose types it does not import.
 *
 * @example
 * ```ts
 * const path: ConfigPath = "app.name"; // completed
 * const other: ConfigPath = "http.cors.origins"; // accepted even if untyped
 * ```
 */
export type ConfigPath =
  | PathsOf<BunaryConfig>
  | (string & Record<never, never>);

/**
 * Anything {@link defineConfig} accepts as a validator.
 *
 * Standard Schema objects take an `unknown` input, because coercing schemas
 * declare an input wider than the config interface.
 */
export type ConfigSchema<Output extends BunaryConfig> =
  | StandardSchemaV1<unknown, Output>
  | ((input: BunaryConfig) => Output);

/**
 * An app's configuration, read-only, resolved once.
 *
 * Instance-scoped and never global: you hold the repository, or you do not
 * reach the config. There is no `set` and no `clear` — the snapshot is built
 * by `createApp`/`createConfig` and never changes, so nothing can reconfigure
 * an app behind its own back.
 *
 * @example
 * ```ts
 * import { createConfig } from "@bunary/core";
 *
 * const config = createConfig({
 *   app: { name: "MyApp" },
 *   http: { port: 3000, host: "" },
 * });
 *
 * config.get().app.name;          // "MyApp" — the whole, typed config
 * config.get("http.port");        // 3000
 * config.get("http.tls", false);  // false — fallback for a missing path
 * config.has("http.host");        // true — set, but empty
 * config.filled("http.host");     // false — empty string is not filled
 * ```
 */
export interface ConfigRepository {
  /**
   * Read the whole config.
   *
   * @returns This app's resolved config; the same object on every call
   */
  get(): BunaryConfig;
  /**
   * Read the value at a dot-path.
   *
   * Untyped by default — pass a type argument (`get<number>("http.port")`)
   * when you know the shape, or a fallback to have it inferred.
   *
   * @param path - Dot-notation path, e.g. `"http.port"` or `"servers.0.host"`
   * @returns The value, or `undefined` when the path does not exist
   */
  get(path: ConfigPath): unknown;
  /**
   * Read the value at a dot-path, typed by the caller.
   *
   * @param path - Dot-notation path, e.g. `"http.port"`
   * @returns The value as `T`, or `undefined` when the path does not exist
   */
  get<T>(path: ConfigPath): T | undefined;
  /**
   * Read the value at a dot-path, with a fallback.
   *
   * The fallback is used only when the path is missing or holds `undefined`;
   * `false`, `0`, `""` and `null` are returned as themselves.
   *
   * @param path - Dot-notation path, e.g. `"http.port"`
   * @param fallback - Returned when the path is missing
   * @returns The stored value, or `fallback`
   */
  get<T>(path: ConfigPath, fallback: T): T;
  /**
   * Check whether a path exists, whatever it holds.
   *
   * Without a path, reports whether this repository holds any config, which
   * a built repository always does.
   *
   * @param path - Optional dot-notation path, e.g. `"orm"`, `"orm.host"`
   * @returns `true` when the key exists, even when its value is empty
   */
  has(path?: ConfigPath): boolean;
  /**
   * Check whether a path exists *and* holds something.
   *
   * Laravel's `filled` semantics: `null`, `undefined`, a blank string, an
   * empty array and an empty plain object are all unfilled. `false` and `0`
   * are filled — they are real values.
   *
   * @param path - Dot-notation path, e.g. `"orm.host"`
   * @returns `true` when the path exists and its value is non-empty
   */
  filled(path: ConfigPath): boolean;
  /**
   * Read the whole config; an alias of {@link ConfigRepository.get}.
   *
   * @returns This app's resolved config
   */
  all(): BunaryConfig;
}

/** Objects whose emptiness is meaningful: `{}` is empty, `new Date()` is not. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

/** Laravel's `filled`: present, and not blank. */
function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim() !== "";
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isPlainObject(value)) {
    return Object.keys(value).length > 0;
  }

  return true;
}

class BunaryConfigRepository implements ConfigRepository {
  readonly #values: BunaryConfig;

  constructor(values: BunaryConfig) {
    // Shallow copy of the top level and of `app`, so the repository's own
    // snapshot cannot be renamed by a later mutation of the caller's object.
    // Nested namespaces stay by reference: cloning them would break class
    // instances and is not core's call to make.
    this.#values = { ...values, app: { ...values.app } };
  }

  get(): BunaryConfig;
  get(path: ConfigPath): unknown;
  get<T>(path: ConfigPath): T | undefined;
  get<T>(path: ConfigPath, fallback: T): T;
  get<T>(path?: ConfigPath, fallback?: T): BunaryConfig | T | undefined {
    if (path === undefined) {
      return this.#values;
    }

    const value = resolvePath(this.#values, path).value;

    return value === undefined ? fallback : (value as T);
  }

  has(path?: ConfigPath): boolean {
    if (path === undefined) {
      return true;
    }

    return resolvePath(this.#values, path).exists;
  }

  filled(path: ConfigPath): boolean {
    const { exists, value } = resolvePath(this.#values, path);

    return exists && isFilled(value);
  }

  all(): BunaryConfig {
    return this.get();
  }
}

/**
 * Normalise a config: require `app.name`, resolve `app.env` and `app.debug`.
 *
 * Returns a new object; the input is never mutated.
 */
function normalise<T extends BunaryConfig>(values: T): T {
  const name = values.app?.name;

  if (typeof name !== "string" || !name.trim()) {
    throw new BunaryError("BunaryConfig: app.name is required");
  }

  const { app, ...rest } = values;

  return {
    ...rest,
    app: {
      ...app,
      name,
      env: resolveEnvironment(app.env),
      debug: app.debug ?? envVar("APP_DEBUG", envVar("DEBUG", false)),
    },
  } as T;
}

/**
 * Define Bunary configuration, optionally validated by a schema.
 *
 * Both forms require a non-empty `app.name`, resolve `app.env` through
 * `resolveEnvironment` (`app.env`, then `APP_ENV`, then `NODE_ENV`, then
 * `development`; an unknown value throws), and resolve `app.debug` from
 * `APP_DEBUG`, falling back to `DEBUG`. Augmented namespaces (`orm`, `http`,
 * ...) pass through untouched.
 *
 * With a schema, validation runs first and the schema's output is what gets
 * normalised, so a coercing schema (`z.coerce.number()`) decides what the
 * config actually holds. The schema is any
 * [Standard Schema](https://standardschema.dev) validator or a plain
 * function; core depends on the spec's types only.
 *
 * @param schema - Optional Standard Schema object or plain function
 * @param values - The configuration object
 * @returns The validated, normalised configuration
 * @throws {ValidationError} If the schema rejects the values, with a
 * `Config validation failed: ...` message
 * @throws {BunaryError} If `app.name` is empty or the environment is unknown
 *
 * @example
 * ```ts
 * import { defineConfig } from "@bunary/core";
 *
 * export default defineConfig({
 *   app: { name: "MyApp", env: "development" },
 * });
 * ```
 *
 * @example
 * ```ts
 * import { defineConfig } from "@bunary/core";
 * import { z } from "zod";
 *
 * // A bad PORT fails here, at module load, not at first request.
 * export default defineConfig(
 *   z.object({
 *     app: z.object({ name: z.string().min(1) }),
 *     http: z.object({ port: z.coerce.number() }),
 *   }),
 *   { app: { name: "MyApp" }, http: { port: Bun.env.PORT } },
 * );
 * ```
 */
export function defineConfig(values: BunaryConfig): BunaryConfig;
export function defineConfig<Output extends BunaryConfig>(
  schema: ConfigSchema<Output>,
  values: BunaryConfig,
): Output;
export function defineConfig<Output extends BunaryConfig>(
  schemaOrValues: ConfigSchema<Output> | BunaryConfig,
  values?: BunaryConfig,
): BunaryConfig | Output {
  if (values === undefined) {
    return normalise(schemaOrValues as BunaryConfig);
  }

  const schema = schemaOrValues as SchemaLike<BunaryConfig, Output>;

  return normalise(validateWith(schema, values, "Config"));
}

/**
 * Build this app's {@link ConfigRepository}.
 *
 * The values are normalised through `defineConfig`, so an invalid config
 * fails here rather than at first read. The caller's object is neither frozen
 * nor mutated, and two repositories in one process share nothing.
 *
 * @param values - The configuration object
 * @returns An immutable, instance-scoped config repository
 * @throws {BunaryError} If `app.name` is empty or the environment is unknown
 *
 * @example
 * ```ts
 * import { createConfig, defineConfig } from "@bunary/core";
 *
 * const config = createConfig(
 *   defineConfig({ app: { name: "MyApp" } }),
 * );
 *
 * config.has("orm");        // false until @bunary/orm's namespace is set
 * config.filled("orm.host") // false
 * config.get("app.name");   // "MyApp"
 * ```
 */
export function createConfig(values: BunaryConfig): ConfigRepository {
  return new BunaryConfigRepository(defineConfig(values));
}
