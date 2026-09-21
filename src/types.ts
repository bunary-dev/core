import type { Command } from "./command.js";
import type { EnvironmentType } from "./constants.js";

/**
 * App configuration
 */
export interface AppConfig {
  /** Application name */
  name: string;
  /** Environment: development, production, test */
  env?: EnvironmentType;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Root Bunary configuration
 *
 * This interface is extended by other packages via module augmentation:
 * - @bunary/orm adds `orm?: OrmConfig`
 * - @bunary/http adds `http?: HttpConfig` (future)
 *
 * @example
 * ```ts
 * // In @bunary/orm:
 * declare module "@bunary/core" {
 *   interface BunaryConfig {
 *     orm?: OrmConfig;
 *   }
 * }
 * ```
 *
 * `defineConfig(schema, values)` infers the shape of a single config from its
 * schema, which is the right tool for one app's `bunary.config.ts`. It does
 * not replace augmentation: a package declares the namespace it reads here,
 * so `config.get("orm.host")` is known to every app that installs it,
 * schema or not.
 */
export interface BunaryConfig {
  app: AppConfig;
  /** Custom CLI commands registered by this project */
  commands?: Command[];
}
