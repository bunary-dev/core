/**
 * The project's typed environment.
 *
 * A real project writes `from "@bunary/core"`; this in-repo example imports
 * the package barrel by path so it runs against the working tree.
 */

import { z } from "zod";
import { defineEnv, type EnvOf } from "../../src/index.js";

export const envSchema = z.object({
  APP_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_DEBUG: z.stringbool().default(false),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.url(),
});

/** The validated, frozen environment this app runs on. */
export type AppEnv = EnvOf<typeof envSchema>;

/**
 * Validate the environment, failing fast with `ValidationError` when a
 * variable is missing or the wrong shape.
 *
 * The `source` parameter exists so tests can feed a broken environment; an
 * app calls `loadEnv()` and gets `Bun.env`.
 */
export function loadEnv(
  source: Record<string, string | undefined> = Bun.env,
): AppEnv {
  return defineEnv(envSchema, source);
}
