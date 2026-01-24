/**
 * Application environment constants
 */
export const Environment = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;

export type EnvironmentType = (typeof Environment)[keyof typeof Environment];
