/**
 * @bunary/core - Application Tests
 * TDD: Testing createApp()
 */

import { afterEach, describe, expect, it } from "bun:test";
import { createApp } from "../src/application.js";
import { Environment } from "../src/constants.js";
import { MissingBindingError } from "../src/errors.js";
import { createToken } from "../src/token.js";

interface Db {
  query: (sql: string) => string;
}

describe("createApp()", () => {
  it("exposes a config store built from the given config", () => {
    const app = createApp({ config: { app: { name: "MyApp" } } });

    expect(app.config.has()).toBe(true);
    expect(app.config.get().app.name).toBe("MyApp");
  });

  it("validates the config through defineConfig", () => {
    expect(() => createApp({ config: { app: { name: "" } } })).toThrow(
      "BunaryConfig: app.name is required",
    );
    expect(() => createApp({ config: { app: { name: "   " } } })).toThrow(
      "BunaryConfig: app.name is required",
    );
  });

  it("resolves env from the config", () => {
    const app = createApp({
      config: { app: { name: "MyApp", env: Environment.PRODUCTION } },
    });

    expect(app.env).toBe(Environment.PRODUCTION);
  });

  describe("environment resolution", () => {
    const originalAppEnv = Bun.env.APP_ENV;
    const originalNodeEnv = Bun.env.NODE_ENV;

    afterEach(() => {
      if (originalAppEnv === undefined) {
        delete Bun.env.APP_ENV;
      } else {
        Bun.env.APP_ENV = originalAppEnv;
      }

      if (originalNodeEnv === undefined) {
        delete Bun.env.NODE_ENV;
      } else {
        Bun.env.NODE_ENV = originalNodeEnv;
      }
    });

    it("prefers the config value over APP_ENV", () => {
      Bun.env.APP_ENV = "production";

      const app = createApp({
        config: { app: { name: "MyApp", env: Environment.TEST } },
      });

      expect(app.env).toBe(Environment.TEST);
    });

    it("falls back to APP_ENV when the config omits env", () => {
      Bun.env.APP_ENV = "production";
      Bun.env.NODE_ENV = "development";

      const app = createApp({ config: { app: { name: "MyApp" } } });

      expect(app.env).toBe(Environment.PRODUCTION);
    });

    it("falls back to NODE_ENV when APP_ENV is unset", () => {
      delete Bun.env.APP_ENV;
      Bun.env.NODE_ENV = "production";

      const app = createApp({ config: { app: { name: "MyApp" } } });

      expect(app.env).toBe(Environment.PRODUCTION);
    });

    it("defaults to development when nothing is set", () => {
      delete Bun.env.APP_ENV;
      delete Bun.env.NODE_ENV;

      const app = createApp({ config: { app: { name: "MyApp" } } });

      expect(app.env).toBe(Environment.DEVELOPMENT);
    });

    it("throws when the config env is unknown", () => {
      expect(() =>
        createApp({
          // biome-ignore lint/suspicious/noExplicitAny: testing runtime validation
          config: { app: { name: "MyApp", env: "staging" as any } },
        }),
      ).toThrow(
        'Unknown environment "staging" (expected development, production, test)',
      );
    });

    it("throws when APP_ENV is unknown", () => {
      Bun.env.APP_ENV = "qa";

      expect(() => createApp({ config: { app: { name: "MyApp" } } })).toThrow(
        'Unknown environment "qa" (expected development, production, test)',
      );
    });
  });

  it("does not share config between two apps in one process", () => {
    const first = createApp({ config: { app: { name: "First" } } });
    const second = createApp({ config: { app: { name: "Second" } } });

    expect(first.config.get().app.name).toBe("First");
    expect(second.config.get().app.name).toBe("Second");

    second.config.set({ app: { name: "Renamed" } });

    expect(first.config.get().app.name).toBe("First");
    expect(second.config.get().app.name).toBe("Renamed");
  });

  it("does not share bindings between two apps in one process", () => {
    const token = createToken<string>("db");
    const first = createApp({ config: { app: { name: "First" } } });
    const second = createApp({ config: { app: { name: "Second" } } });

    first.set(token, "first-db");

    expect(first.get(token)).toBe("first-db");
    expect(second.has(token)).toBe(false);
    expect(() => second.get(token)).toThrow(MissingBindingError);
  });
});

describe("Application bindings", () => {
  it("stores and reads a binding by token", () => {
    const token = createToken<Db>("db");
    const app = createApp({ config: { app: { name: "MyApp" } } });
    const db: Db = { query: (sql: string) => sql };

    app.set(token, db);

    expect(app.get(token)).toBe(db);
    expect(app.has(token)).toBe(true);
  });

  it("returns the app from set() for chaining", () => {
    const a = createToken<string>("a");
    const b = createToken<string>("b");
    const app = createApp({ config: { app: { name: "MyApp" } } });

    expect(app.set(a, "A").set(b, "B")).toBe(app);
    expect(app.get(a)).toBe("A");
    expect(app.get(b)).toBe("B");
  });

  it("overwrites an existing binding", () => {
    const token = createToken<string>("db");
    const app = createApp({ config: { app: { name: "MyApp" } } });

    app.set(token, "one");
    app.set(token, "two");

    expect(app.get(token)).toBe("two");
  });

  it("allows set() after boot", async () => {
    const token = createToken<string>("late");
    const app = createApp({ config: { app: { name: "MyApp" } } });

    await app.boot();
    app.set(token, "late-value");

    expect(app.get(token)).toBe("late-value");
  });

  it("treats two tokens with the same name as distinct bindings", () => {
    const first = createToken<string>("db");
    const second = createToken<string>("db");
    const app = createApp({ config: { app: { name: "MyApp" } } });

    app.set(first, "first");

    expect(app.has(second)).toBe(false);
    expect(() => app.get(second)).toThrow(MissingBindingError);
  });

  it("stores falsy and nullish values as real bindings", () => {
    const zero = createToken<number>("zero");
    const nothing = createToken<undefined>("nothing");
    const app = createApp({ config: { app: { name: "MyApp" } } });

    app.set(zero, 0).set(nothing, undefined);

    expect(app.has(zero)).toBe(true);
    expect(app.get(zero)).toBe(0);
    expect(app.has(nothing)).toBe(true);
    expect(app.get(nothing)).toBeUndefined();
  });

  it("throws MissingBindingError naming the token when unset", () => {
    const token = createToken<Db>("db");
    const app = createApp({ config: { app: { name: "MyApp" } } });

    expect(() => app.get(token)).toThrow(MissingBindingError);

    try {
      app.get(token);
      expect.unreachable("get() should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingBindingError);
      const missing = error as MissingBindingError;
      expect(missing.token).toBe(token);
      expect(missing.message).toContain("db");
    }
  });

  it("returns the token's value type from get()", () => {
    const token = createToken<Db>("db");
    const app = createApp({ config: { app: { name: "MyApp" } } });
    app.set(token, { query: (sql: string) => sql });

    // Compile-time check: `get` is inferred as Db, not unknown.
    const db: Db = app.get(token);
    // @ts-expect-error - the binding is a Db, not a string
    const wrong: string = app.get(token);

    expect(db.query("select 1")).toBe("select 1");
    expect(wrong).toBe(db as unknown as string);
  });

  it("rejects a value that does not match the token type", () => {
    const token = createToken<number>("port");
    const app = createApp({ config: { app: { name: "MyApp" } } });

    // @ts-expect-error - the token holds a number
    app.set(token, "3000");

    expect(app.has(token)).toBe(true);
  });
});

describe("Application boot()", () => {
  it("starts unbooted", () => {
    const app = createApp({ config: { app: { name: "MyApp" } } });

    expect(app.booted).toBe(false);
  });

  it("flips booted and resolves to the app", async () => {
    const app = createApp({ config: { app: { name: "MyApp" } } });

    const booted = await app.boot();

    expect(booted).toBe(app);
    expect(app.booted).toBe(true);
  });

  it("is idempotent across repeated calls", async () => {
    const app = createApp({ config: { app: { name: "MyApp" } } });

    const first = app.boot();
    const second = app.boot();

    expect(second).toBe(first);
    expect(await first).toBe(app);
    expect(await second).toBe(app);
    expect(app.booted).toBe(true);

    const third = await app.boot();

    expect(third).toBe(app);
    expect(app.booted).toBe(true);
  });

  it("resolves concurrent boots once", async () => {
    const app = createApp({ config: { app: { name: "MyApp" } } });

    const results = await Promise.all([app.boot(), app.boot(), app.boot()]);

    expect(results).toEqual([app, app, app]);
    expect(app.booted).toBe(true);
  });
});
