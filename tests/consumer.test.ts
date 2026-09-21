/**
 * @bunary/core - Example consumer test (#60)
 *
 * Runs `examples/basic-app` end to end, the way a real project would: a typed
 * env, a `bunary.config.ts` with an augmented namespace, two providers with
 * tokens, `createApp`, `await app.boot()`, `app.get(token)` and
 * `app.config.get(path)`.
 *
 * Every symbol in the rc public API table (#61) is exercised here or in the
 * example it drives:
 *
 * | Symbol                  | Exercised in                                      |
 * |-------------------------|---------------------------------------------------|
 * | `createApp`             | examples/basic-app/main.ts                        |
 * | `Application.config`    | main.ts, providers/http.ts, this file             |
 * | `Application.env`       | main.ts, this file ("resolved environment")       |
 * | `Application.boot()`    | main.ts                                           |
 * | `Application.booted`    | main.ts (report.booted), this file                |
 * | `Application.set`       | providers/database.ts, providers/http.ts          |
 * | `Application.get`       | providers/http.ts, main.ts, this file             |
 * | `createToken`           | providers/database.ts, providers/http.ts, this file |
 * | `MissingBindingError`   | this file ("unknown token")                       |
 * | `Provider`              | providers/database.ts, providers/http.ts          |
 * | `defineProvider`        | providers/database.ts, providers/http.ts          |
 * | `defineConfig`          | examples/basic-app/bunary.config.ts (schema form) |
 * | `config.get`            | providers/database.ts, providers/http.ts, main.ts |
 * | `config.has`            | main.ts (report.hasDatabaseNamespace), this file  |
 * | `config.filled`         | main.ts (report.commandsFilled), this file        |
 * | `BunaryConfig` (augment)| bunary.config.ts (`declare module`)               |
 * | `defineEnv`             | examples/basic-app/env.ts                         |
 * | `env()`                 | bunary.config.ts (APP_NAME)                       |
 * | `environment()`         | main.ts (report.environment)                      |
 * | `isDev()`               | main.ts (report.dev), this file                   |
 * | `isProd()`              | this file                                         |
 * | `isTest()`              | this file                                         |
 * | `Command` + `commands`  | bunary.config.ts, main.ts, this file              |
 *
 * Supporting exports also used: `BunaryError`, `ValidationError`,
 * `Environment`, `EnvironmentType`, `EnvOf`, `Token`, `ConfigPath`.
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { loadEnv } from "../examples/basic-app/env.js";
import {
  createConnection,
  DATABASE,
} from "../examples/basic-app/providers/database.js";
import { HTTP_SERVER } from "../examples/basic-app/providers/http.js";
import type { Application } from "../src/application";
import type { Command } from "../src/command";
import { Environment } from "../src/constants";
import { environment, isDev, isProd, isTest } from "../src/environment";
import { BunaryError, MissingBindingError } from "../src/errors";
import { ValidationError } from "../src/schema";
import { createToken } from "../src/token";

type MainModule = typeof import("../examples/basic-app/main.js");

const ENV_VARS = {
  APP_ENV: "test",
  APP_NAME: "Basic App",
  APP_DEBUG: "true",
  PORT: "8080",
  DATABASE_URL: "postgres://localhost:5432/basic_app",
} as const;

const original = new Map<string, string | undefined>();

let main: MainModule;
let app: Application;
let report: Awaited<ReturnType<MainModule["runExample"]>>["report"];

beforeAll(async () => {
  for (const [key, value] of Object.entries(ENV_VARS)) {
    original.set(key, Bun.env[key]);
    Bun.env[key] = value;
  }

  // Imported after the env is in place: `bunary.config.ts` reads it at module
  // scope, exactly as a real project's config file does.
  main = await import("../examples/basic-app/main.js");
  const result = await main.runExample();
  app = result.app;
  report = result.report;
});

afterAll(() => {
  for (const [key, value] of original) {
    if (value === undefined) {
      delete Bun.env[key];
    } else {
      Bun.env[key] = value;
    }
  }
});

describe("example consumer: examples/basic-app", () => {
  it("boots the app and reports the resolved environment", () => {
    expect(report.appName).toBe("Basic App");
    expect(report.environment).toBe(Environment.TEST);
    expect(report.booted).toBe(true);
    expect(app.booted).toBe(true);
  });

  it("agrees with the standalone environment helpers", () => {
    expect(app.env).toBe(report.environment);
    expect(environment()).toBe(app.env);
    expect(isTest()).toBe(true);
    expect(isProd()).toBe(false);
    expect(isDev()).toBe(false);
    expect(report.dev).toBe(isDev());
    expect(report.dev).toBe(app.env === Environment.DEVELOPMENT);
  });

  it("coerces PORT to a number through the env schema", () => {
    expect(report.port).toBe(8080);
    expect(app.config.get<number>("http.port")).toBe(8080);
    expect(report.httpUrl).toBe("http://127.0.0.1:8080");
  });

  it("reads a DEBUG-style boolean out of the environment", () => {
    expect(report.debug).toBe(true);
    expect(app.config.get<boolean>("app.debug")).toBe(true);
  });

  it("opens the database connection during boot", () => {
    expect(report.databaseOpen).toBe(true);
    expect(report.databaseRows).toBe(1);
    expect(app.get(DATABASE).open).toBe(true);
    expect(app.get(DATABASE).url).toBe(ENV_VARS.DATABASE_URL);
  });

  it("runs every register() before any boot(), in declaration order", () => {
    expect(report.bootOrder).toEqual([
      "database:register",
      "http:register",
      "database:open",
      "http:listen",
    ]);
  });

  it("would have failed had http booted before the database", async () => {
    const cold = createConnection("postgres://localhost:5432/cold", 1);

    expect(cold.open).toBe(false);
    await expect(cold.query("select 1 as one")).rejects.toThrow(
      "Connection is not open",
    );
  });

  it("serves the http provider its dependency, already booted", () => {
    const server = app.get(HTTP_SERVER);
    expect(server.listening).toBe(true);
    expect(server.databaseReady).toBe(true);
    expect(server.port).toBe(8080);
  });

  it("reads the augmented namespaces by dot path", () => {
    expect(app.config.get<string>("database.url")).toBe(ENV_VARS.DATABASE_URL);
    expect(app.config.get<number>("database.poolSize")).toBe(5);
    expect(app.config.get("nope.missing")).toBeUndefined();
    expect(app.config.get("nope.missing", "fallback")).toBe("fallback");

    expect(app.config.has("database.url")).toBe(true);
    expect(app.config.has("database.password")).toBe(false);
    expect(report.hasDatabaseNamespace).toBe(true);

    expect(app.config.filled("commands")).toBe(true);
    expect(report.commandsFilled).toBe(true);
  });

  it("registers the project's own commands through config", async () => {
    expect(report.commands).toEqual(["app:greet"]);

    const commands = app.config.get<Command[]>("commands") ?? [];
    const greet = commands[0];
    expect(greet?.name).toBe("app:greet");
    expect(greet?.category).toBe("app");
    expect(greet?.usage).toBe("bunary app:greet <name>");

    await greet?.run(["Ada"], { loud: true });
    expect(main.greetings()).toEqual(["HELLO, ADA!"]);
  });

  it("throws MissingBindingError for a token nothing bound", () => {
    const CACHE = createToken<{ hit: (key: string) => boolean }>("cache");

    expect(app.has(CACHE)).toBe(false);
    expect(() => app.get(CACHE)).toThrow(MissingBindingError);

    try {
      app.get(CACHE);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BunaryError);
      const missing = error as MissingBindingError;
      expect(missing.token).toBe(CACHE);
      expect(missing.message).toBe('No binding registered for token "cache"');
    }
  });

  it("fails fast with ValidationError when the env is broken", () => {
    const broken = {
      APP_ENV: "test",
      PORT: "8080",
      // DATABASE_URL missing
    };

    expect(() => loadEnv(broken)).toThrow(ValidationError);

    try {
      loadEnv(broken);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const failure = error as ValidationError;
      expect(failure.issues).toHaveLength(1);
      expect(failure.issues[0]?.path).toBe("DATABASE_URL");
      expect(failure.message).toStartWith("Environment validation failed:");
    }
  });
});
