/**
 * @bunary/core - Config Tests
 * TDD: Testing defineConfig() and the ConfigRepository.
 */

import { afterEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import { createApp } from "../src/application.js";
import { createConfig, defineConfig } from "../src/config.js";
import { Environment } from "../src/constants.js";
import { ValidationError } from "../src/schema.js";
import type { BunaryConfig } from "../src/types.js";

/** Restore the env vars defineConfig reads, whatever a test did to them. */
function restoreEnv(keys: string[]): () => void {
  const original = new Map(keys.map((key) => [key, Bun.env[key]]));

  return () => {
    for (const [key, value] of original) {
      if (value === undefined) {
        delete Bun.env[key];
      } else {
        Bun.env[key] = value;
      }
    }
  };
}

describe("defineConfig(values)", () => {
  const restore = restoreEnv(["NODE_ENV", "APP_ENV", "APP_DEBUG", "DEBUG"]);

  afterEach(restore);

  it("returns a config object with provided values", () => {
    const config = defineConfig({
      app: { name: "TestApp", env: "development" },
    });

    expect(config.app.name).toBe("TestApp");
    expect(config.app.env).toBe("development");
  });

  it("defaults env to current NODE_ENV when not specified", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "production";

    const config = defineConfig({ app: { name: "TestApp" } });

    expect(config.app.env).toBe(Environment.PRODUCTION);
  });

  it("prefers APP_ENV over NODE_ENV when env is not specified", () => {
    Bun.env.APP_ENV = "test";
    Bun.env.NODE_ENV = "production";

    const config = defineConfig({ app: { name: "TestApp" } });

    expect(config.app.env).toBe(Environment.TEST);
  });

  it("defaults env to development when nothing is set", () => {
    delete Bun.env.APP_ENV;
    delete Bun.env.NODE_ENV;

    const config = defineConfig({ app: { name: "TestApp" } });

    expect(config.app.env).toBe(Environment.DEVELOPMENT);
  });

  it("prefers explicit config env over NODE_ENV", () => {
    Bun.env.NODE_ENV = "production";

    const config = defineConfig({
      app: { name: "TestApp", env: "development" },
    });

    expect(config.app.env).toBe("development");
  });

  it("accepts all valid env values", () => {
    expect(
      defineConfig({ app: { name: "Test", env: "development" } }).app.env,
    ).toBe("development");
    expect(
      defineConfig({ app: { name: "Test", env: "production" } }).app.env,
    ).toBe("production");
    expect(defineConfig({ app: { name: "Test", env: "test" } }).app.env).toBe(
      "test",
    );
  });

  it("throws when NODE_ENV is invalid", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "staging";

    expect(() => defineConfig({ app: { name: "TestApp" } })).toThrow(
      'Unknown environment "staging" (expected development, production, test)',
    );
  });

  it("throws when APP_ENV is invalid", () => {
    Bun.env.APP_ENV = "qa";

    expect(() => defineConfig({ app: { name: "TestApp" } })).toThrow(
      'Unknown environment "qa" (expected development, production, test)',
    );
  });

  it("throws when config.app.env is invalid", () => {
    expect(() =>
      defineConfig({
        // biome-ignore lint/suspicious/noExplicitAny: testing runtime validation
        app: { name: "TestApp", env: "staging" as any },
      }),
    ).toThrow(
      'Unknown environment "staging" (expected development, production, test)',
    );
  });

  it("defaults debug to false when nothing is set", () => {
    delete Bun.env.APP_DEBUG;
    delete Bun.env.DEBUG;

    expect(defineConfig({ app: { name: "TestApp" } }).app.debug).toBe(false);
  });

  it("preserves debug value when explicitly set", () => {
    expect(
      defineConfig({ app: { name: "TestApp", debug: true } }).app.debug,
    ).toBe(true);
  });

  it("prefers explicit debug over APP_DEBUG", () => {
    Bun.env.APP_DEBUG = "1";

    expect(
      defineConfig({ app: { name: "TestApp", debug: false } }).app.debug,
    ).toBe(false);
  });

  it("reads debug from APP_DEBUG", () => {
    delete Bun.env.DEBUG;

    for (const value of ["1", "true", "yes", "on"]) {
      Bun.env.APP_DEBUG = value;
      expect(defineConfig({ app: { name: "TestApp" } }).app.debug).toBe(true);
    }

    Bun.env.APP_DEBUG = "0";
    expect(defineConfig({ app: { name: "TestApp" } }).app.debug).toBe(false);
  });

  it("prefers APP_DEBUG over DEBUG", () => {
    Bun.env.APP_DEBUG = "false";
    Bun.env.DEBUG = "true";

    expect(defineConfig({ app: { name: "TestApp" } }).app.debug).toBe(false);
  });

  it("falls back to DEBUG when APP_DEBUG is unset", () => {
    delete Bun.env.APP_DEBUG;
    Bun.env.DEBUG = "1";

    expect(defineConfig({ app: { name: "TestApp" } }).app.debug).toBe(true);
  });

  it("throws when app.name is empty", () => {
    expect(() => defineConfig({ app: { name: "" } })).toThrow(
      "BunaryConfig: app.name is required",
    );
  });

  it("throws when app.name is whitespace-only", () => {
    expect(() => defineConfig({ app: { name: "   " } })).toThrow(
      "BunaryConfig: app.name is required",
    );
  });

  it("throws when app.name is not a string", () => {
    // biome-ignore lint/suspicious/noExplicitAny: testing JS runtime safety
    expect(() => defineConfig({ app: { name: 123 as any } })).toThrow(
      "BunaryConfig: app.name is required",
    );
    // biome-ignore lint/suspicious/noExplicitAny: testing JS runtime safety
    expect(() => defineConfig({ app: { name: undefined as any } })).toThrow(
      "BunaryConfig: app.name is required",
    );
    // biome-ignore lint/suspicious/noExplicitAny: testing JS runtime safety
    expect(() => defineConfig({ app: { name: null as any } })).toThrow(
      "BunaryConfig: app.name is required",
    );
  });

  it("throws when app itself is missing", () => {
    // biome-ignore lint/suspicious/noExplicitAny: testing JS runtime safety
    expect(() => defineConfig({} as any)).toThrow(
      "BunaryConfig: app.name is required",
    );
  });

  it("preserves augmented namespaces", () => {
    const orm = {
      database: { type: "sqlite" as const, sqlite: { path: "./test.db" } },
    };

    const augmented = {
      app: { name: "TestApp" },
      orm,
    } as unknown as BunaryConfig;

    const config = defineConfig(augmented) as BunaryConfig & {
      orm?: typeof orm;
    };

    expect(config.orm).toEqual(orm);
  });
});

describe("defineConfig(schema, values)", () => {
  const schema = z.object({
    app: z.object({
      name: z.string().min(1),
      env: z.enum(["development", "production", "test"]).optional(),
      debug: z.boolean().optional(),
    }),
    http: z.object({ port: z.coerce.number() }),
  });

  it("validates with a Standard Schema object and keeps the output", () => {
    const config = defineConfig(schema, {
      app: { name: "Schema" },
      http: { port: "3000" },
    } as unknown as BunaryConfig);

    expect(config.app.name).toBe("Schema");
    expect(config.http.port).toBe(3000);
  });

  it("still resolves env and debug on the schema output", () => {
    const config = defineConfig(schema, {
      app: { name: "Schema", env: "test" },
      http: { port: 1 },
    } as unknown as BunaryConfig);

    expect(config.app.env).toBe(Environment.TEST);
    expect(config.app.debug).toBe(false);
  });

  it("validates with a plain function", () => {
    const config = defineConfig(
      (values: BunaryConfig) => ({
        ...values,
        app: { ...values.app, name: values.app.name.trim() },
      }),
      { app: { name: "  Trimmed  " } },
    );

    expect(config.app.name).toBe("Trimmed");
  });

  it("throws ValidationError with a Config prefix when a zod schema fails", () => {
    expect(() =>
      defineConfig(schema, {
        app: { name: "Schema" },
      } as unknown as BunaryConfig),
    ).toThrow(ValidationError);

    try {
      defineConfig(schema, {
        app: { name: "Schema" },
      } as unknown as BunaryConfig);
      expect.unreachable("defineConfig should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const failure = error as ValidationError;
      expect(failure.message).toStartWith("Config validation failed: ");
      expect(failure.issues[0]?.path).toBe("http");
    }
  });

  it("reports the offending nested path", () => {
    try {
      defineConfig(schema, {
        app: { name: "" },
        http: { port: 1 },
      } as unknown as BunaryConfig);
      expect.unreachable("defineConfig should have thrown");
    } catch (error) {
      const failure = error as ValidationError;
      expect(failure.issues[0]?.path).toBe("app.name");
    }
  });

  it("wraps a throwing plain function in a ValidationError", () => {
    expect(() =>
      defineConfig(
        (): BunaryConfig => {
          throw new Error("no good");
        },
        { app: { name: "Fn" } },
      ),
    ).toThrow("Config validation failed: (root): no good");
  });

  it("still enforces app.name after the schema has run", () => {
    expect(() =>
      defineConfig(
        (values: BunaryConfig) => ({ ...values, app: { name: "  " } }),
        { app: { name: "Fn" } },
      ),
    ).toThrow("BunaryConfig: app.name is required");
  });
});

describe("ConfigRepository", () => {
  const values = {
    app: { name: "MyApp", env: "development", debug: true },
    http: { port: 0, host: "", cors: { origins: [] } },
    servers: [{ host: "one" }, { host: "two" }],
    empty: {},
    nothing: null,
  } as unknown as BunaryConfig;

  const repository = createConfig(values);

  it("returns the whole config from get()", () => {
    const config = repository.get();

    expect(config.app.name).toBe("MyApp");
    expect(config.app.env).toBe("development");
  });

  it("all() is an alias of get()", () => {
    expect(repository.all()).toEqual(repository.get());
  });

  it("reads nested paths", () => {
    expect(repository.get("app.name")).toBe("MyApp");
    expect(repository.get("http.cors.origins")).toEqual([]);
  });

  it("reads array index paths", () => {
    expect(repository.get("servers.0.host")).toBe("one");
    expect(repository.get("servers.1.host")).toBe("two");
  });

  it("reads falsy-but-set values as themselves", () => {
    expect(repository.get("http.port")).toBe(0);
    expect(repository.get("http.host")).toBe("");
    expect(repository.get("nothing")).toBeNull();
    expect(repository.get("empty")).toEqual({});
  });

  it("returns undefined for a missing path", () => {
    expect(repository.get("database")).toBeUndefined();
    expect(repository.get("app.version")).toBeUndefined();
    expect(repository.get("servers.9.host")).toBeUndefined();
  });

  it("returns the fallback for a missing path", () => {
    expect(repository.get("database.host", "localhost")).toBe("localhost");
    expect(repository.get("http.timeout", 30)).toBe(30);
  });

  it("does not use the fallback for a falsy-but-set value", () => {
    expect(repository.get("http.port", 3000)).toBe(0);
    expect(repository.get("http.host", "example.com")).toBe("");
    expect(repository.get("app.debug", false)).toBe(true);
  });

  it("uses the fallback when the stored value is undefined", () => {
    const repo = createConfig({
      app: { name: "Undef" },
      // biome-ignore lint/suspicious/noExplicitAny: augmented namespace stand-in
      orm: { host: undefined } as any,
    } as unknown as BunaryConfig);

    expect(repo.has("orm.host")).toBe(true);
    expect(repo.get("orm.host", "localhost")).toBe("localhost");
  });

  it("types get() through its type parameter", () => {
    const name = repository.get<string>("app.name");
    const port = repository.get<number>("http.port", 3000);

    expect(name?.toUpperCase()).toBe("MYAPP");
    expect(port.toFixed(0)).toBe("0");
  });

  it("has() with no path is true for a built repository", () => {
    expect(repository.has()).toBe(true);
  });

  it("has() is true for keys that exist, even when empty", () => {
    expect(repository.has("app")).toBe(true);
    expect(repository.has("app.name")).toBe(true);
    expect(repository.has("http.host")).toBe(true);
    expect(repository.has("http.port")).toBe(true);
    expect(repository.has("empty")).toBe(true);
    expect(repository.has("nothing")).toBe(true);
    expect(repository.has("servers.0.host")).toBe(true);
  });

  it("has() is false for missing keys", () => {
    expect(repository.has("orm")).toBe(false);
    expect(repository.has("http.tls")).toBe(false);
    expect(repository.has("app.name.length")).toBe(false);
  });

  it("filled() is true for non-empty values", () => {
    expect(repository.filled("app")).toBe(true);
    expect(repository.filled("app.name")).toBe(true);
    expect(repository.filled("app.debug")).toBe(true);
    expect(repository.filled("servers")).toBe(true);
    expect(repository.filled("servers.0.host")).toBe(true);
    expect(repository.filled("http.port")).toBe(true);
  });

  it("filled() is false for missing, null, empty string, empty array and empty object", () => {
    expect(repository.filled("orm")).toBe(false);
    expect(repository.filled("x.y.z")).toBe(false);
    expect(repository.filled("nothing")).toBe(false);
    expect(repository.filled("http.host")).toBe(false);
    expect(repository.filled("http.cors.origins")).toBe(false);
    expect(repository.filled("empty")).toBe(false);
  });

  it("filled() is false for a whitespace-only string", () => {
    const repo = createConfig({
      app: { name: "Blank" },
      // biome-ignore lint/suspicious/noExplicitAny: augmented namespace stand-in
      orm: { host: "   " } as any,
    } as unknown as BunaryConfig);

    expect(repo.has("orm.host")).toBe(true);
    expect(repo.filled("orm.host")).toBe(false);
  });

  it("filled() is false for an explicit undefined value", () => {
    const repo = createConfig({
      app: { name: "Undef" },
      // biome-ignore lint/suspicious/noExplicitAny: augmented namespace stand-in
      orm: { host: undefined } as any,
    } as unknown as BunaryConfig);

    expect(repo.has("orm.host")).toBe(true);
    expect(repo.filled("orm.host")).toBe(false);
  });

  it("filled() is true for a non-plain object such as a Date", () => {
    const repo = createConfig({
      app: { name: "Dated" },
      // biome-ignore lint/suspicious/noExplicitAny: augmented namespace stand-in
      startedAt: new Date(0) as any,
    } as unknown as BunaryConfig);

    expect(repo.filled("startedAt")).toBe(true);
  });

  it("filled() is false for an empty null-prototype object", () => {
    const repo = createConfig({
      app: { name: "Bare" },
      // biome-ignore lint/suspicious/noExplicitAny: augmented namespace stand-in
      bare: Object.create(null) as any,
    } as unknown as BunaryConfig);

    expect(repo.filled("bare")).toBe(false);
  });
});

describe("ConfigRepository immutability (#47)", () => {
  it("does not freeze the caller's config object", () => {
    const caller: BunaryConfig = { app: { name: "Caller" } };

    const repository = createConfig(caller);
    repository.get();
    repository.get("app.name");

    expect(Object.isFrozen(caller)).toBe(false);
    expect(Object.isFrozen(caller.app)).toBe(false);
  });

  it("does not freeze the caller's nested namespaces", () => {
    const orm = { host: "localhost", pool: { max: 10 } };
    const caller = {
      app: { name: "Caller" },
      orm,
    } as unknown as BunaryConfig;

    const repository = createConfig(caller);
    repository.get();

    expect(Object.isFrozen(orm)).toBe(false);
    expect(Object.isFrozen(orm.pool)).toBe(false);

    orm.pool.max = 20;

    expect(orm.pool.max).toBe(20);
  });

  it("does not mutate the caller's config object", () => {
    const caller = {
      app: { name: "Caller" },
      orm: { host: "localhost" },
    } as unknown as BunaryConfig;
    const before = structuredClone(caller);

    createConfig(caller).get();

    expect(caller).toEqual(before);
  });

  it("leaves the caller untouched through createApp", () => {
    const caller: BunaryConfig = { app: { name: "Caller" } };
    const before = structuredClone(caller);

    const app = createApp({ config: caller });
    app.config.get();

    expect(Object.isFrozen(caller)).toBe(false);
    expect(Object.isFrozen(caller.app)).toBe(false);
    expect(caller).toEqual(before);
  });

  it("does not let a later caller mutation reach the repository", () => {
    const caller: BunaryConfig = { app: { name: "Caller" } };
    const repository = createConfig(caller);

    caller.app.name = "Renamed";

    expect(repository.get("app.name")).toBe("Caller");
  });
});

describe("createConfig()", () => {
  it("validates through defineConfig", () => {
    expect(() => createConfig({ app: { name: "" } })).toThrow(
      "BunaryConfig: app.name is required",
    );
  });

  it("normalises the config it is given", () => {
    const repository = createConfig({ app: { name: "Normalised" } });

    expect(repository.get("app.env")).toBeDefined();
    expect(repository.get("app.debug")).toBeDefined();
  });

  it("returns a stable snapshot from get()", () => {
    const repository = createConfig({ app: { name: "Stable" } });

    expect(repository.get()).toBe(repository.get());
  });

  it("keeps two repositories in one process independent", () => {
    const first = createConfig({ app: { name: "First", debug: true } });
    const second = createConfig({ app: { name: "Second", debug: false } });

    expect(first.get("app.name")).toBe("First");
    expect(second.get("app.name")).toBe("Second");
    expect(first.get("app.debug")).toBe(true);
    expect(second.get("app.debug")).toBe(false);
  });

  it("preserves augmented namespaces", () => {
    const orm = { database: { type: "sqlite", path: "./test.db" } };
    const repository = createConfig({
      app: { name: "Augmented" },
      orm,
    } as unknown as BunaryConfig);

    expect(repository.get("orm.database.type")).toBe("sqlite");
    expect(repository.filled("orm.database.path")).toBe(true);
  });
});

describe("createApp() config end to end", () => {
  it("exposes a ConfigRepository on the app", () => {
    const app = createApp({
      config: {
        app: { name: "EndToEnd" },
        // biome-ignore lint/suspicious/noExplicitAny: augmented namespace stand-in
        http: { port: 3000 } as any,
      } as unknown as BunaryConfig,
    });

    expect(app.config.get("app.name")).toBe("EndToEnd");
    expect(app.config.get("http.port")).toBe(3000);
    expect(app.config.has("http.port")).toBe(true);
    expect(app.config.filled("http.port")).toBe(true);
    expect(app.config.get("http.tls", false)).toBe(false);
  });
});
