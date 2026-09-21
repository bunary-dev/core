/**
 * @bunary/core - Environment Tests
 * TDD: Testing env(), defineEnv(), resolveEnvironment(), environment(),
 * isDev(), isProd(), isTest()
 */

import { afterEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import { Environment } from "../src/constants";
import {
  defineEnv,
  env,
  environment,
  isDev,
  isProd,
  isTest,
  resolveEnvironment,
} from "../src/environment";
import { BunaryError } from "../src/errors";
import { ValidationError } from "../src/schema";

/** Snapshot Bun.env and restore it after each test in the calling describe. */
function restoreEnvAfterEach(): void {
  const originalEnv = { ...Bun.env };

  afterEach(() => {
    for (const key of Object.keys(Bun.env)) {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    }
    Object.assign(Bun.env, originalEnv);
  });
}

describe("env()", () => {
  restoreEnvAfterEach();

  it("returns the value of an existing environment variable", () => {
    Bun.env.TEST_VAR = "test_value";
    expect(env("TEST_VAR")).toBe("test_value");
  });

  it("returns default value when variable is not set", () => {
    delete Bun.env.MISSING_VAR;
    expect(env("MISSING_VAR", "default")).toBe("default");
  });

  it("returns undefined when variable is not set and no default provided", () => {
    delete Bun.env.MISSING_VAR;
    expect(env("MISSING_VAR")).toBeUndefined();
  });

  it("returns the actual value even when default is provided", () => {
    Bun.env.EXISTING = "actual";
    expect(env("EXISTING", "default")).toBe("actual");
  });

  it("coerces 'true' string to boolean true", () => {
    Bun.env.BOOL_VAR = "true";
    expect(env("BOOL_VAR", false)).toBe(true);
  });

  it("coerces 'false' string to boolean false", () => {
    Bun.env.BOOL_VAR = "false";
    expect(env("BOOL_VAR", true)).toBe(false);
  });

  it("coerces numeric string to number", () => {
    Bun.env.NUM_VAR = "3000";
    expect(env("NUM_VAR", 0)).toBe(3000);
  });

  it("coerces '1' to boolean true when default is boolean", () => {
    Bun.env.BOOL_VAR = "1";
    expect(env("BOOL_VAR", false)).toBe(true);
  });

  it("coerces 'yes' to boolean true when default is boolean", () => {
    Bun.env.BOOL_VAR = "yes";
    expect(env("BOOL_VAR", false)).toBe(true);
  });

  it("coerces other strings to boolean false when default is boolean", () => {
    Bun.env.BOOL_VAR = "nope";
    expect(env("BOOL_VAR", true)).toBe(false);
  });

  // Type isolation tests - ensure types don't bleed into each other
  it("returns '1' as string when default is string", () => {
    Bun.env.STR_VAR = "1";
    expect(env("STR_VAR", "default")).toBe("1");
    expect(typeof env("STR_VAR", "default")).toBe("string");
  });

  it("returns 'true' as string when default is string", () => {
    Bun.env.STR_VAR = "true";
    expect(env("STR_VAR", "default")).toBe("true");
    expect(typeof env("STR_VAR", "default")).toBe("string");
  });

  it("returns 'yes' as string when default is string", () => {
    Bun.env.STR_VAR = "yes";
    expect(env("STR_VAR", "default")).toBe("yes");
    expect(typeof env("STR_VAR", "default")).toBe("string");
  });

  it("returns numeric string as string when default is string", () => {
    Bun.env.STR_VAR = "3000";
    expect(env("STR_VAR", "default")).toBe("3000");
    expect(typeof env("STR_VAR", "default")).toBe("string");
  });

  it("returns value as string when no default provided", () => {
    Bun.env.STR_VAR = "1";
    expect(env("STR_VAR")).toBe("1");
    expect(typeof env("STR_VAR")).toBe("string");
  });

  it("returns default when value is not a valid number", () => {
    Bun.env.NUM_VAR = "not-a-number";
    expect(env("NUM_VAR", 42)).toBe(42);
  });

  it("handles negative numbers", () => {
    Bun.env.NUM_VAR = "-100";
    expect(env("NUM_VAR", 0)).toBe(-100);
  });

  it("handles floating point numbers", () => {
    Bun.env.NUM_VAR = "3.14";
    expect(env("NUM_VAR", 0)).toBe(3.14);
  });
});

// Issue #48: env() coercion edge cases.
describe("env() coercion edge cases (#48)", () => {
  restoreEnvAfterEach();

  it("treats an empty string as unset for numbers", () => {
    Bun.env.NUM_VAR = "";
    expect(env("NUM_VAR", 42)).toBe(42);
  });

  it("treats a whitespace-only string as unset for numbers", () => {
    Bun.env.NUM_VAR = "   ";
    expect(env("NUM_VAR", 42)).toBe(42);
  });

  it("treats an empty string as unset for booleans", () => {
    Bun.env.BOOL_VAR = "";
    expect(env("BOOL_VAR", true)).toBe(true);
  });

  it("treats an empty string as unset for strings", () => {
    Bun.env.STR_VAR = "";
    expect(env("STR_VAR", "default")).toBe("default");
  });

  it("returns undefined for an empty string with no default", () => {
    Bun.env.STR_VAR = "";
    expect(env("STR_VAR")).toBeUndefined();
  });

  it.each(["TRUE", "True", "YES", "Yes", "On", "ON", "1"])(
    "coerces %s to true",
    (value) => {
      Bun.env.BOOL_VAR = value;
      expect(env("BOOL_VAR", false)).toBe(true);
    },
  );

  it.each(["FALSE", "False", "NO", "No", "Off", "OFF", "0"])(
    "coerces %s to false",
    (value) => {
      Bun.env.BOOL_VAR = value;
      expect(env("BOOL_VAR", true)).toBe(false);
    },
  );

  it("returns the default for an unrecognised boolean value", () => {
    Bun.env.BOOL_VAR = "maybe";
    expect(env("BOOL_VAR", true)).toBe(true);
    Bun.env.BOOL_VAR = "maybe";
    expect(env("BOOL_VAR", false)).toBe(false);
  });

  it("trims surrounding whitespace before coercing booleans", () => {
    Bun.env.BOOL_VAR = "  true  ";
    expect(env("BOOL_VAR", false)).toBe(true);
  });

  it("trims surrounding whitespace before coercing numbers", () => {
    Bun.env.NUM_VAR = "  3000  ";
    expect(env("NUM_VAR", 0)).toBe(3000);
  });

  it("returns strings verbatim, without trimming", () => {
    Bun.env.STR_VAR = "  padded  ";
    expect(env("STR_VAR", "default")).toBe("  padded  ");
  });
});

describe("resolveEnvironment()", () => {
  restoreEnvAfterEach();

  it("prefers an explicit value over APP_ENV and NODE_ENV", () => {
    Bun.env.APP_ENV = "production";
    Bun.env.NODE_ENV = "test";
    expect(resolveEnvironment("development")).toBe(Environment.DEVELOPMENT);
  });

  it("prefers APP_ENV over NODE_ENV", () => {
    Bun.env.APP_ENV = "production";
    Bun.env.NODE_ENV = "development";
    expect(resolveEnvironment()).toBe(Environment.PRODUCTION);
  });

  it("falls back to NODE_ENV when APP_ENV is unset", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "production";
    expect(resolveEnvironment()).toBe(Environment.PRODUCTION);
  });

  it("defaults to development when neither is set", () => {
    delete Bun.env.APP_ENV;
    delete Bun.env.NODE_ENV;
    expect(resolveEnvironment()).toBe(Environment.DEVELOPMENT);
  });

  it("treats an empty APP_ENV as unset", () => {
    Bun.env.APP_ENV = "";
    Bun.env.NODE_ENV = "production";
    expect(resolveEnvironment()).toBe(Environment.PRODUCTION);
  });

  it("treats a whitespace-only APP_ENV as unset", () => {
    Bun.env.APP_ENV = "   ";
    Bun.env.NODE_ENV = "test";
    expect(resolveEnvironment()).toBe(Environment.TEST);
  });

  it("treats an empty NODE_ENV as unset", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "";
    expect(resolveEnvironment()).toBe(Environment.DEVELOPMENT);
  });

  it("treats an empty explicit value as unset", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "production";
    expect(resolveEnvironment("")).toBe(Environment.PRODUCTION);
  });

  it("throws on an unknown explicit value", () => {
    expect(() => resolveEnvironment("staging")).toThrow(
      'Unknown environment "staging" (expected development, production, test)',
    );
  });

  it("throws a BunaryError on an unknown APP_ENV", () => {
    Bun.env.APP_ENV = "qa";
    expect(() => resolveEnvironment()).toThrow(BunaryError);
    expect(() => resolveEnvironment()).toThrow(
      'Unknown environment "qa" (expected development, production, test)',
    );
  });

  it("throws on an unknown NODE_ENV", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "staging";
    expect(() => resolveEnvironment()).toThrow(
      'Unknown environment "staging" (expected development, production, test)',
    );
  });

  it("accepts every valid environment name", () => {
    expect(resolveEnvironment("development")).toBe(Environment.DEVELOPMENT);
    expect(resolveEnvironment("production")).toBe(Environment.PRODUCTION);
    expect(resolveEnvironment("test")).toBe(Environment.TEST);
  });
});

describe("environment()", () => {
  restoreEnvAfterEach();

  it("resolves from APP_ENV", () => {
    Bun.env.APP_ENV = "production";
    expect(environment()).toBe(Environment.PRODUCTION);
  });

  it("resolves from NODE_ENV when APP_ENV is unset", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "test";
    expect(environment()).toBe(Environment.TEST);
  });

  it("defaults to development", () => {
    delete Bun.env.APP_ENV;
    delete Bun.env.NODE_ENV;
    expect(environment()).toBe(Environment.DEVELOPMENT);
  });
});

describe("isDev()", () => {
  restoreEnvAfterEach();

  it("returns true when the environment is 'development'", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "development";
    expect(isDev()).toBe(true);
  });

  it("returns true when nothing is set", () => {
    delete Bun.env.APP_ENV;
    delete Bun.env.NODE_ENV;
    expect(isDev()).toBe(true);
  });

  it("returns false when the environment is 'production'", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "production";
    expect(isDev()).toBe(false);
  });

  it("returns false when the environment is 'test'", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "test";
    expect(isDev()).toBe(false);
  });

  it("follows APP_ENV over NODE_ENV", () => {
    Bun.env.APP_ENV = "development";
    Bun.env.NODE_ENV = "production";
    expect(isDev()).toBe(true);
  });
});

describe("isProd()", () => {
  restoreEnvAfterEach();

  it("returns true when the environment is 'production'", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "production";
    expect(isProd()).toBe(true);
  });

  it("returns false when the environment is 'development'", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "development";
    expect(isProd()).toBe(false);
  });

  it("returns false when nothing is set", () => {
    delete Bun.env.APP_ENV;
    delete Bun.env.NODE_ENV;
    expect(isProd()).toBe(false);
  });

  it("follows APP_ENV over NODE_ENV", () => {
    Bun.env.APP_ENV = "production";
    Bun.env.NODE_ENV = "development";
    expect(isProd()).toBe(true);
  });
});

describe("isTest()", () => {
  restoreEnvAfterEach();

  it("returns true when the environment is 'test'", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "test";
    expect(isTest()).toBe(true);
  });

  it("returns false when the environment is 'development'", () => {
    delete Bun.env.APP_ENV;
    Bun.env.NODE_ENV = "development";
    expect(isTest()).toBe(false);
  });

  it("returns false when nothing is set", () => {
    delete Bun.env.APP_ENV;
    delete Bun.env.NODE_ENV;
    expect(isTest()).toBe(false);
  });

  it("follows APP_ENV over NODE_ENV", () => {
    Bun.env.APP_ENV = "test";
    Bun.env.NODE_ENV = "development";
    expect(isTest()).toBe(true);
  });
});

describe("defineEnv()", () => {
  restoreEnvAfterEach();

  const schema = z.object({
    PORT: z.coerce.number(),
    DEBUG: z.stringbool().optional(),
  });

  it("validates an explicit source with a zod schema", () => {
    const parsed = defineEnv(schema, { PORT: "8080", DEBUG: "true" });

    expect(parsed.PORT).toBe(8080);
    expect(parsed.DEBUG).toBe(true);
  });

  it("defaults the source to Bun.env", () => {
    Bun.env.PORT = "4242";
    delete Bun.env.DEBUG;

    expect(defineEnv(schema).PORT).toBe(4242);
  });

  it("returns a frozen object", () => {
    const parsed = defineEnv(schema, { PORT: "1" });

    expect(Object.isFrozen(parsed)).toBe(true);
  });

  it("throws a ValidationError when the schema rejects the source", () => {
    expect(() => defineEnv(schema, { PORT: "not-a-port" })).toThrow(
      ValidationError,
    );
  });

  it("reports the failing key and an Environment-prefixed message", () => {
    try {
      defineEnv(schema, { PORT: "not-a-port" });
      expect.unreachable();
    } catch (error) {
      const validation = error as ValidationError;
      expect(validation.issues[0]?.path).toBe("PORT");
      expect(validation.message).toStartWith("Environment validation failed");
    }
  });

  it("accepts a plain validation function", () => {
    const parsed = defineEnv(
      (source: Record<string, string | undefined>) => ({
        port: Number(source.PORT ?? 3000),
      }),
      { PORT: "5000" },
    );

    expect(parsed.port).toBe(5000);
  });

  it("wraps an error thrown by a plain validation function", () => {
    expect(() =>
      defineEnv(() => {
        throw new Error("DATABASE_URL is required");
      }, {}),
    ).toThrow("Environment validation failed: (root): DATABASE_URL is required");
  });
});
