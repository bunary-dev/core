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
 * ORM configuration type (matches @bunary/orm OrmConfig)
 * Defined here to avoid circular dependency
 */
export interface OrmConfig {
  database: {
    type: "sqlite" | "mysql" | "postgres";
    sqlite?: {
      path: string;
    };
    mysql?: {
      host: string;
      port?: number;
      user: string;
      password: string;
      database: string;
    };
    postgres?: {
      host: string;
      port?: number;
      user: string;
      password: string;
      database: string;
    };
  };
}

/**
 * Root Bunary configuration
 */
export interface BunaryConfig {
  app: AppConfig;
  /** Optional ORM configuration (from @bunary/orm) */
  orm?: OrmConfig;
}
