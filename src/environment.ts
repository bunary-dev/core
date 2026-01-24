import { Environment } from "./constants";
/**
 * Environment helpers using Bun.env
 */

/**
 * Get an environment variable with optional default and automatic type coercion
 * @param key - Environment variable name
 * @param defaultValue - Default value if not set (also determines return type)
 * @returns The environment variable value, coerced to match defaultValue type
 * @example
 * ```ts
 * const port = env('PORT', 3000);     // Returns number
 * const debug = env('DEBUG', false);  // Returns boolean
 * const name = env('APP_NAME', 'app'); // Returns string
 * const secret = env('SECRET');        // Returns string | undefined
 * ```
 */
export function env(key: string): string | undefined;
export function env(key: string, defaultValue: string): string;
export function env(key: string, defaultValue: number): number;
export function env(key: string, defaultValue: boolean): boolean;
export function env(
  key: string,
  defaultValue?: string | number | boolean,
): string | number | boolean | undefined {
  const value = Bun.env[key];

  if (value === undefined) {
    return defaultValue;
  }

  if (typeof defaultValue === "boolean") {
    return value === "true" || value === "1" || value === "yes";
  }

  if (typeof defaultValue === "number") {
    const num = Number(value);
    return Number.isNaN(num) ? defaultValue : num;
  }

  return value;
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return Bun.env.NODE_ENV === Environment.DEVELOPMENT || !Bun.env.NODE_ENV;
}

/**
 * Check if running in production mode
 */
export function isProd(): boolean {
  return Bun.env.NODE_ENV === Environment.PRODUCTION;
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return Bun.env.NODE_ENV === Environment.TEST;
}
