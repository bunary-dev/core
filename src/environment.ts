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
export function env<T extends string | number | boolean | undefined>(
  key: string,
  defaultValue?: T
): T extends undefined ? string | undefined : T {
  const value = Bun.env[key];

  if (value === undefined) {
    return defaultValue as T extends undefined ? string | undefined : T;
  }

  // Type coercion based on defaultValue type
  if (typeof defaultValue === "boolean") {
    return (value === "true") as T extends undefined ? string | undefined : T;
  }

  if (typeof defaultValue === "number") {
    const num = Number(value);
    return (Number.isNaN(num) ? defaultValue : num) as T extends undefined ? string | undefined : T;
  }

  // Default: return as string
  return value as T extends undefined ? string | undefined : T;
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return Bun.env.NODE_ENV === "development" || !Bun.env.NODE_ENV;
}

/**
 * Check if running in production mode
 */
export function isProd(): boolean {
  return Bun.env.NODE_ENV === "production";
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return Bun.env.NODE_ENV === "test";
}
