import { Environment } from "./constants.js";
import type { BunaryConfig } from "./types";

let globalBunaryConfig: BunaryConfig | null = null;

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
  const validated: BunaryConfig = {
    app: {
      name: config.app.name,
      env:
        config.app.env ??
        (Bun.env.NODE_ENV as BunaryConfig["app"]["env"]) ??
        Environment.DEVELOPMENT,
      debug: config.app.debug ?? Bun.env.DEBUG === "true",
    },
  };

  // Include ORM config if provided (from @bunary/orm)
  if (config.orm) {
    validated.orm = config.orm;
  }

  globalBunaryConfig = validated;
  return validated;
}

/**
 * Get the global Bunary configuration
 *
 * @returns The current Bunary configuration
 * @throws If configuration has not been set
 */
export function getBunaryConfig(): BunaryConfig {
  if (!globalBunaryConfig) {
    throw new Error("Bunary configuration not set. Call defineConfig() first.");
  }
  return globalBunaryConfig;
}

/**
 * Clear the global Bunary configuration (useful for testing)
 *
 * @internal
 */
export function clearBunaryConfig(): void {
  globalBunaryConfig = null;
}
