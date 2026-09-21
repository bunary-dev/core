/**
 * Application environment constants.
 *
 * @example
 * ```ts
 * import { Environment } from "@bunary/core";
 *
 * Environment.DEVELOPMENT; // "development"
 * Environment.PRODUCTION;  // "production"
 * Environment.TEST;        // "test"
 * ```
 */
export const Environment = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;

/**
 * The set of recognised environment names: `"development" | "production" | "test"`.
 *
 * @example
 * ```ts
 * import { resolveEnvironment, type EnvironmentType } from "@bunary/core";
 *
 * const env: EnvironmentType = resolveEnvironment();
 * ```
 */
export type EnvironmentType = (typeof Environment)[keyof typeof Environment];
