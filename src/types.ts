/**
 * App configuration
 */
export interface AppConfig {
  /** Application name */
  name: string;
  /** Environment: development, production, test */
  env?: "development" | "production" | "test";
  /** Debug mode */
  debug?: boolean;
}

/**
 * Root Bunary configuration
 */
export interface BunaryConfig {
  app: AppConfig;
}
