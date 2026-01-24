import type { BunaryConfig } from "./types";

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
 * });
 * ```
 */
export function defineConfig(config: BunaryConfig): BunaryConfig {
  return {
    app: {
      name: config.app.name,
      env:
        config.app.env ??
        (Bun.env.NODE_ENV as BunaryConfig["app"]["env"]) ??
        "development",
      debug: config.app.debug ?? Bun.env.DEBUG === "true",
    },
  };
}
