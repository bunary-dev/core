/**
 * The project's single config file.
 *
 * A real project writes `from "@bunary/core"`; this in-repo example imports
 * the package barrel by path so it runs against the working tree, and for the
 * same reason augments `"../../src/index.js"` where a consumer augments
 * `"@bunary/core"`.
 */

import { z } from "zod";
import {
  type Command,
  defineConfig,
  type EnvironmentType,
  env,
} from "../../src/index.js";
import { loadEnv } from "./env.js";

const databaseSchema = z.object({
  url: z.url(),
  poolSize: z.number().int().positive(),
});

// `host` is optional on purpose: an augmented namespace is a contract every
// other file in the program is then held to, so it must stay permissive.
const httpSchema = z.object({
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65_535),
});

/** The namespaces this project owns, declared the way a package declares its own. */
export type DatabaseConfig = z.infer<typeof databaseSchema>;
export type HttpConfig = z.infer<typeof httpSchema>;

declare module "../../src/index.js" {
  interface BunaryConfig {
    database?: DatabaseConfig;
    http?: HttpConfig;
  }
}

/**
 * A command run records here instead of writing to stdout, so the example can
 * be asserted on. A real project's `run` would print.
 */
const greetingLog: string[] = [];

export function greetings(): readonly string[] {
  return [...greetingLog];
}

const greetCommand: Command = {
  name: "app:greet",
  description: "Greet someone by name",
  usage: "bunary app:greet <name>",
  category: "app",
  args: [{ name: "name", required: true, description: "Who to greet" }],
  flags: [{ name: "loud", alias: "l", description: "Shout the greeting" }],
  run: async (args, flags) => {
    const greeting = `Hello, ${args[0] ?? "world"}!`;
    greetingLog.push(flags.loud ? greeting.toUpperCase() : greeting);
  },
};

const configSchema = z.object({
  app: z.object({
    name: z.string().min(1),
    env: z.enum(["development", "production", "test"]).optional(),
    debug: z.boolean().optional(),
  }),
  database: databaseSchema,
  http: httpSchema,
  commands: z.array(z.custom<Command>()).optional(),
});

const appEnv = loadEnv();

export default defineConfig(configSchema, {
  app: {
    name: env("APP_NAME", "Bunary App"),
    env: appEnv.APP_ENV satisfies EnvironmentType,
    debug: appEnv.APP_DEBUG,
  },
  database: {
    url: appEnv.DATABASE_URL,
    poolSize: 5,
  },
  http: {
    host: "127.0.0.1",
    port: appEnv.PORT,
  },
  commands: [greetCommand],
});
