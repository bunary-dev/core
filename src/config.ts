import { Environment } from "./constants.js";
import { env as envVar } from "./environment.js";
import type { BunaryConfig } from "./types";

function normalizeEnv(value: unknown): BunaryConfig["app"]["env"] {
  if (value === Environment.DEVELOPMENT) return Environment.DEVELOPMENT;
  if (value === Environment.PRODUCTION) return Environment.PRODUCTION;
  if (value === Environment.TEST) return Environment.TEST;
  return Environment.DEVELOPMENT;
}

/**
 * Recursively freeze an object and all nested objects.
 * Arrays and plain objects are frozen; primitives and functions are skipped.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  Object.freeze(obj);
  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value);
    }
  }
  return obj;
}

/**
 * Instance-scoped configuration container.
 *
 * This replaces global mutable config and allows multiple independent app instances
 * to exist in the same process.
 */
export interface BunaryConfigStore {
  /** Set the current config for this instance */
  set: (config: BunaryConfig) => void;
  /**
   * Get the current config for this instance
   *
   * Returns a shallow-frozen object to prevent accidental mutation.
   * Use `set()` to update the config.
   */
  get: () => Readonly<BunaryConfig>;
  /** Check whether a config has been set for this instance */
  has: () => boolean;
  /** Clear the current config for this instance (useful for tests) */
  clear: () => void;
}

/**
 * Create an isolated Bunary config store.
 *
 * @param initial - Optional initial config to set
 * @returns A config store with get/set/has/clear methods
 *
 * @example
 * ```ts
 * import { createConfig, defineConfig } from "@bunary/core";
 *
 * const config = createConfig(defineConfig({ app: { name: "MyApp" } }));
 *
 * if (config.has()) {
 *   const current = config.get(); // Readonly<BunaryConfig>
 * }
 * ```
 */
export function createConfig(initial?: BunaryConfig): BunaryConfigStore {
  let current: BunaryConfig | null = initial ? defineConfig(initial) : null;

  return {
    set: (config: BunaryConfig) => {
      current = defineConfig(config);
    },
    get: (): Readonly<BunaryConfig> => {
      if (!current) {
        throw new Error("Bunary configuration not set. Call set() first.");
      }
      return deepFreeze({ ...current });
    },
    has: (): boolean => {
      return current !== null;
    },
    clear: () => {
      current = null;
    },
  };
}

/**
 * Define Bunary configuration with type safety
 *
 * Validates `app.name` is non-empty and normalises `env` and `debug`.
 * Any additional properties added via module augmentation (e.g. `orm`
 * from `@bunary/orm`) are passed through unchanged.
 *
 * @param config - The configuration object
 * @returns The validated configuration
 * @throws If `app.name` is empty or whitespace-only
 *
 * @example
 * ```ts
 * import { defineConfig } from "@bunary/core";
 *
 * export default defineConfig({
 *   app: {
 *     name: "MyApp",
 *     env: "development",
 *   },
 * });
 * ```
 */
export function defineConfig(config: BunaryConfig): BunaryConfig {
  if (typeof config.app.name !== "string" || !config.app.name.trim()) {
    throw new Error("BunaryConfig: app.name is required");
  }

  const rawEnv = config.app.env ?? Bun.env.NODE_ENV;

  // Extract app config, pass through any additional properties (orm, http, etc.)
  // These are added via module augmentation by other packages
  const { app, ...rest } = config;

  const validated: BunaryConfig = {
    ...rest,
    app: {
      name: app.name,
      env: normalizeEnv(rawEnv),
      debug: app.debug ?? envVar("DEBUG", false),
    },
  };

  return validated;
}

/**
 * Get the global Bunary configuration
 *
 * @returns The current Bunary configuration
 * @throws If configuration has not been set
 */
export function getBunaryConfig(): BunaryConfig {
  throw new Error(
    "Global Bunary configuration has been removed. Create an instance config store with createConfig() and call store.get().",
  );
}

/**
 * Clear the global Bunary configuration (useful for testing)
 *
 * @internal
 */
export function clearBunaryConfig(): void {
  // No-op: global config has been removed.
}
