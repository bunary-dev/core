/**
 * Dot-path traversal.
 *
 * Internal to core — deliberately not exported from the package barrel. It
 * walks plain objects and arrays by dot-separated segments (`"http.port"`,
 * `"servers.0.host"`) and exists so the config repository can answer
 * "does this path exist?" and "what is at this path?" from one walk.
 *
 * Only own properties count, so inherited members (`toString`, `constructor`)
 * are invisible and a path can never reach the prototype chain. Traversal
 * stops at anything that is not an object: `"app.name.length"` is a miss, not
 * the length of the string.
 *
 * No `dot-prop` dependency: core ships zero runtime dependencies beyond the
 * types-only Standard Schema spec.
 */

/** The outcome of one {@link resolvePath} walk. */
export interface PathResult {
  /** Whether every segment resolved to an own property. */
  readonly exists: boolean;
  /** The value at the path, or `undefined` when it does not exist. */
  readonly value: unknown;
}

const MISSING: PathResult = Object.freeze({ exists: false, value: undefined });

/** Only objects and arrays can be walked into; `null` cannot. */
function isTraversable(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Walk a dot-path and report both whether it exists and what it holds.
 *
 * Existence and value are separate answers: a key explicitly set to
 * `undefined` exists, while a missing key does not, and both read back as
 * `undefined`.
 *
 * @param source - The object to walk
 * @param path - Dot-separated path, e.g. `"http.cors.origins"`
 * @returns Whether the path exists, and the value found there
 *
 * @example
 * ```ts
 * resolvePath({ app: { name: "MyApp" } }, "app.name");
 * // { exists: true, value: "MyApp" }
 *
 * resolvePath({ app: {} }, "app.name");
 * // { exists: false, value: undefined }
 * ```
 */
export function resolvePath(source: unknown, path: string): PathResult {
  if (path === "") {
    return MISSING;
  }

  let current: unknown = source;

  for (const segment of path.split(".")) {
    if (!isTraversable(current) || !Object.hasOwn(current, segment)) {
      return MISSING;
    }

    current = current[segment];
  }

  return { exists: true, value: current };
}

/**
 * Read the value at a dot-path.
 *
 * @param source - The object to read from
 * @param path - Dot-separated path, e.g. `"servers.0.host"`
 * @returns The value at the path, or `undefined` when it does not exist
 *
 * @example
 * ```ts
 * const config = { http: { port: 3000 }, servers: [{ host: "one" }] };
 *
 * getPath(config, "http.port");      // 3000
 * getPath(config, "servers.0.host"); // "one"
 * getPath(config, "http.tls");       // undefined
 * ```
 */
export function getPath(source: unknown, path: string): unknown {
  return resolvePath(source, path).value;
}

/**
 * Check whether a dot-path exists, whatever it holds.
 *
 * `false`, `0`, `""` and `null` all count as present; only a missing own
 * property is absent.
 *
 * @param source - The object to check
 * @param path - Dot-separated path, e.g. `"http.host"`
 * @returns `true` when every segment resolved to an own property
 *
 * @example
 * ```ts
 * const config = { http: { host: "" } };
 *
 * hasPath(config, "http.host"); // true — set, but empty
 * hasPath(config, "http.port"); // false
 * ```
 */
export function hasPath(source: unknown, path: string): boolean {
  return resolvePath(source, path).exists;
}
