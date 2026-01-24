/**
 * @bunary/core - Environment Tests
 * TDD: Testing env(), isDev(), isProd(), isTest()
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { env, isDev, isProd, isTest } from "../src/environment";

describe("env()", () => {
  const originalEnv = { ...Bun.env };

  beforeEach(() => {
    // Reset env before each test
  });

  afterEach(() => {
    // Restore original env
    Object.keys(Bun.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete Bun.env[key];
      }
    });
    Object.assign(Bun.env, originalEnv);
  });

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

  // Type coercion tests - these will fail initially (RED)
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

  // Extended boolean coercion tests
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

  // Number edge cases
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

describe("isDev()", () => {
  const originalNodeEnv = Bun.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv) {
      Bun.env.NODE_ENV = originalNodeEnv;
    } else {
      delete Bun.env.NODE_ENV;
    }
  });

  it("returns true when NODE_ENV is 'development'", () => {
    Bun.env.NODE_ENV = "development";
    expect(isDev()).toBe(true);
  });

  it("returns true when NODE_ENV is not set", () => {
    delete Bun.env.NODE_ENV;
    expect(isDev()).toBe(true);
  });

  it("returns false when NODE_ENV is 'production'", () => {
    Bun.env.NODE_ENV = "production";
    expect(isDev()).toBe(false);
  });

  it("returns false when NODE_ENV is 'test'", () => {
    Bun.env.NODE_ENV = "test";
    expect(isDev()).toBe(false);
  });
});

describe("isProd()", () => {
  const originalNodeEnv = Bun.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv) {
      Bun.env.NODE_ENV = originalNodeEnv;
    } else {
      delete Bun.env.NODE_ENV;
    }
  });

  it("returns true when NODE_ENV is 'production'", () => {
    Bun.env.NODE_ENV = "production";
    expect(isProd()).toBe(true);
  });

  it("returns false when NODE_ENV is 'development'", () => {
    Bun.env.NODE_ENV = "development";
    expect(isProd()).toBe(false);
  });

  it("returns false when NODE_ENV is not set", () => {
    delete Bun.env.NODE_ENV;
    expect(isProd()).toBe(false);
  });
});

describe("isTest()", () => {
  const originalNodeEnv = Bun.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv) {
      Bun.env.NODE_ENV = originalNodeEnv;
    } else {
      delete Bun.env.NODE_ENV;
    }
  });

  it("returns true when NODE_ENV is 'test'", () => {
    Bun.env.NODE_ENV = "test";
    expect(isTest()).toBe(true);
  });

  it("returns false when NODE_ENV is 'development'", () => {
    Bun.env.NODE_ENV = "development";
    expect(isTest()).toBe(false);
  });

  it("returns false when NODE_ENV is not set", () => {
    delete Bun.env.NODE_ENV;
    expect(isTest()).toBe(false);
  });
});
