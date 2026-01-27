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
 * Instance-scoped configuration container.
 *
 * This replaces global mutable config and allows multiple independent app instances
 * to exist in the same process.
 */
export interface BunaryConfigStore {
  /** Set the current config for this instance */
  set: (config: BunaryConfig) => void;
  /** Get the current config for this instance */
  get: () => BunaryConfig;
  /** Clear the current config for this instance (useful for tests) */
  clear: () => void;
}

/**
 * Create an isolated Bunary config store.
 *
 * @param initial - Optional initial config to set
 * @returns A config store with get/set/clear methods
 *
 * @example
 * ```ts
 * import { createConfig, defineConfig } from "@bunary/core";
 *
 * const config = createConfig(defineConfig({ app: { name: "MyApp" } }));
 * const current = config.get();
 * ```
 */
export function createConfig(initial?: BunaryConfig): BunaryConfigStore {
  let current: BunaryConfig | null = initial ? defineConfig(initial) : null;

  return {
    set: (config: BunaryConfig) => {
      current = defineConfig(config);
    },
    get: () => {
      if (!current) {
        throw new Error("Bunary configuration not set. Call set() first.");
      }
      return current;
    },
    clear: () => {
      current = null;
    },
  };
}

/**
 * Define Bunary configuration with type safety
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
 *   orm: {
 *     database: {
 *       type: "sqlite",
 *       sqlite: { path: "./database.sqlite" }
 *     }
 *   }
 * });
 * ```
 */
export function defineConfig(config: BunaryConfig): BunaryConfig {
  const rawEnv = config.app.env ?? Bun.env.NODE_ENV;

  const validated: BunaryConfig = {
    app: {
      name: config.app.name,
      env: normalizeEnv(rawEnv),
      debug: config.app.debug ?? envVar("DEBUG", false),
    },
  };

  // Include ORM config if provided (from @bunary/orm)
  if (config.orm) {
    validated.orm = config.orm;
  }

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
