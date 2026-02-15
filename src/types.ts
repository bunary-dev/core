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
 */
export interface BunaryConfig {
  app: AppConfig;
}
