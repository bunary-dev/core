/**
 * @bunary/core - Config Tests
 * TDD: Testing defineConfig()
 */

import { afterEach, describe, expect, it } from "bun:test";
import {
  clearBunaryConfig,
  createConfig,
  defineConfig,
  getBunaryConfig,
} from "../src/config";
import { Environment } from "../src/constants";
import type { BunaryConfig } from "../src/types";

describe("defineConfig()", () => {
  const originalNodeEnv = Bun.env.NODE_ENV;
  const originalAppEnv = Bun.env.APP_ENV;
  const originalDebug = Bun.env.DEBUG;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete Bun.env.NODE_ENV;
    } else {
      Bun.env.NODE_ENV = originalNodeEnv;
    }

    if (originalAppEnv === undefined) {
      delete Bun.env.APP_ENV;
    } else {
      Bun.env.APP_ENV = originalAppEnv;
    }

    if (originalDebug === undefined) {
      delete Bun.env.DEBUG;
    } else {
      Bun.env.DEBUG = originalDebug;
    }
  });

  it("returns a config object with provided values", () => {
    const config = defineConfig({
      app: {
        name: "TestApp",
        env: "development",
      },
    });

    expect(config.app.name).toBe("TestApp");
    expect(config.app.env).toBe("development");
  });

  it("defaults env to current NODE_ENV when not specified", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "production";

    const config = defineConfig({
      app: {
        name: "TestApp",
      },
    });

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
      app: {
        name: "TestApp",
        env: "development",
      },
    });
    expect(config.app.env).toBe("development");
  });

  it("defaults debug to false when not specified", () => {
    const config = defineConfig({
      app: {
        name: "TestApp",
      },
    });

    expect(config.app.debug).toBe(false);
  });

  it("preserves debug value when explicitly set", () => {
    const config = defineConfig({
      app: {
        name: "TestApp",
        debug: true,
      },
    });

    expect(config.app.debug).toBe(true);
  });

  it("prefers explicit debug over DEBUG env var", () => {
    Bun.env.DEBUG = "1";
    const config = defineConfig({
      app: {
        name: "TestApp",
        debug: false,
      },
    });
    expect(config.app.debug).toBe(false);
  });

  it("accepts all valid env values", () => {
    const devConfig = defineConfig({
      app: { name: "Test", env: "development" },
    });
    const prodConfig = defineConfig({
      app: { name: "Test", env: "production" },
    });
    const testConfig = defineConfig({ app: { name: "Test", env: "test" } });

    expect(devConfig.app.env).toBe("development");
    expect(prodConfig.app.env).toBe("production");
    expect(testConfig.app.env).toBe("test");
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

  it("parses DEBUG=1 as true", () => {
    Bun.env.DEBUG = "1";
    const config = defineConfig({ app: { name: "TestApp" } });
    expect(config.app.debug).toBe(true);
  });

  it("parses DEBUG=true as true", () => {
    Bun.env.DEBUG = "true";
    const config = defineConfig({ app: { name: "TestApp" } });
    expect(config.app.debug).toBe(true);
  });

  it("parses DEBUG=yes as true", () => {
    Bun.env.DEBUG = "yes";
    const config = defineConfig({ app: { name: "TestApp" } });
    expect(config.app.debug).toBe(true);
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

  it("throws when app.name is a number", () => {
    // biome-ignore lint/suspicious/noExplicitAny: testing JS runtime safety
    expect(() => defineConfig({ app: { name: 123 as any } })).toThrow(
      "BunaryConfig: app.name is required",
    );
  });

  it("throws when app.name is undefined", () => {
    // biome-ignore lint/suspicious/noExplicitAny: testing JS runtime safety
    expect(() => defineConfig({ app: { name: undefined as any } })).toThrow(
      "BunaryConfig: app.name is required",
    );
  });

  it("throws when app.name is null", () => {
    // biome-ignore lint/suspicious/noExplicitAny: testing JS runtime safety
    expect(() => defineConfig({ app: { name: null as any } })).toThrow(
      "BunaryConfig: app.name is required",
    );
  });

  it("preserves augmented properties through defineConfig", () => {
    const ormConfig = {
      database: { type: "sqlite" as const, sqlite: { path: "./test.db" } },
    };

    // Simulate module augmentation — extra properties should pass through
    const augmented = {
      app: { name: "TestApp" },
      orm: ormConfig,
    } as unknown as BunaryConfig;
    const config = defineConfig(augmented) as BunaryConfig & {
      orm?: typeof ormConfig;
    };

    expect(config.orm).toEqual(ormConfig);
  });
});

describe("getBunaryConfig()", () => {
  it("throws with migration guidance (global config removed)", () => {
    expect(() => getBunaryConfig()).toThrow(
      "Global Bunary configuration has been removed. Create an instance config store with createConfig() and call store.get().",
    );
  });
});

describe("clearBunaryConfig()", () => {
  it("is a no-op now the global config is gone", () => {
    expect(() => clearBunaryConfig()).not.toThrow();
  });
});

describe("createConfig()", () => {
  it("creates an isolated config instance", () => {
    const cfgA = createConfig(
      defineConfig({
        app: { name: "A", env: "development", debug: true },
      }),
    );
    const cfgB = createConfig(
      defineConfig({
        app: { name: "B", env: "production", debug: false },
      }),
    );

    expect(cfgA.get().app.name).toBe("A");
    expect(cfgB.get().app.name).toBe("B");
  });

  it("throws when get() called before set()", () => {
    const cfg = createConfig();
    expect(() => cfg.get()).toThrow(
      "Bunary configuration not set. Call set() first.",
    );
  });

  it("can be cleared without affecting other instances", () => {
    const cfgA = createConfig(defineConfig({ app: { name: "A" } }));
    const cfgB = createConfig(defineConfig({ app: { name: "B" } }));

    cfgA.clear();

    expect(() => cfgA.get()).toThrow(
      "Bunary configuration not set. Call set() first.",
    );
    expect(cfgB.get().app.name).toBe("B");
  });

  it("normalizes config when set() is called", () => {
    const cfg = createConfig();
    cfg.set({
      app: {
        name: "Normalized",
      },
    });

    const current = cfg.get();
    expect(current.app.name).toBe("Normalized");
    expect(current.app.env).toBeDefined();
    expect(current.app.debug).toBeDefined();
  });

  it("preserves augmented properties through set() and get()", () => {
    const ormConfig = {
      database: { type: "sqlite" as const, sqlite: { path: "./test.db" } },
    };

    const cfg = createConfig();
    // biome-ignore lint/suspicious/noExplicitAny: testing augmented property passthrough
    cfg.set({ app: { name: "TestApp" }, orm: ormConfig } as any);

    // biome-ignore lint/suspicious/noExplicitAny: testing augmented property passthrough
    expect((cfg.get() as any).orm).toEqual(ormConfig);
  });

  it("returns a frozen object from get()", () => {
    const cfg = createConfig(defineConfig({ app: { name: "Frozen" } }));
    const config = cfg.get();

    expect(Object.isFrozen(config)).toBe(true);
    expect(() => {
      // biome-ignore lint/suspicious/noExplicitAny: testing mutation safety
      (config as any).app = { name: "Mutated" };
    }).toThrow();
  });

  it("deep-freezes nested objects from get()", () => {
    const cfg = createConfig(defineConfig({ app: { name: "Deep" } }));
    const config = cfg.get();

    expect(Object.isFrozen(config.app)).toBe(true);
    expect(() => {
      // biome-ignore lint/suspicious/noExplicitAny: testing nested mutation safety
      (config.app as any).name = "Mutated";
    }).toThrow();
  });

  it("get() returns a snapshot that does not leak internal state", () => {
    const cfg = createConfig(defineConfig({ app: { name: "Snap" } }));
    const first = cfg.get();

    cfg.set({ app: { name: "Updated" } });
    const second = cfg.get();

    expect(first.app.name).toBe("Snap");
    expect(second.app.name).toBe("Updated");
  });

  it("has() returns false before set()", () => {
    const cfg = createConfig();
    expect(cfg.has()).toBe(false);
  });

  it("has() returns true after createConfig with initial value", () => {
    const cfg = createConfig(defineConfig({ app: { name: "HasTest" } }));
    expect(cfg.has()).toBe(true);
  });

  it("has() returns true after set()", () => {
    const cfg = createConfig();
    cfg.set({ app: { name: "HasTest" } });
    expect(cfg.has()).toBe(true);
  });

  it("has() returns false after clear()", () => {
    const cfg = createConfig(defineConfig({ app: { name: "HasTest" } }));
    expect(cfg.has()).toBe(true);
    cfg.clear();
    expect(cfg.has()).toBe(false);
  });
});
