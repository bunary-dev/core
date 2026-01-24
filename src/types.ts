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
 */
export interface BunaryConfig {
  app: AppConfig;
}
