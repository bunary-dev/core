/**
 * @bunary/core - Dot-path helper tests
 * TDD: Testing getPath(), hasPath() and the shared resolvePath() traversal.
 */

import { describe, expect, it } from "bun:test";
import { getPath, hasPath, resolvePath } from "../src/path.js";

const source = {
  app: { name: "MyApp", debug: false, tags: ["a", "b"] },
  http: { port: 0, host: "", cors: { origins: [] } },
  servers: [{ host: "one" }, { host: "two" }],
  nothing: null,
  undef: undefined,
};

describe("getPath()", () => {
  it("reads a top-level key", () => {
    expect(getPath(source, "app")).toBe(source.app);
  });

  it("reads a nested key", () => {
    expect(getPath(source, "app.name")).toBe("MyApp");
  });

  it("reads a deeply nested key", () => {
    expect(getPath(source, "http.cors.origins")).toEqual([]);
  });

  it("reads falsy-but-set values", () => {
    expect(getPath(source, "app.debug")).toBe(false);
    expect(getPath(source, "http.port")).toBe(0);
    expect(getPath(source, "http.host")).toBe("");
    expect(getPath(source, "nothing")).toBeNull();
  });

  it("reads array elements by index segment", () => {
    expect(getPath(source, "servers.0.host")).toBe("one");
    expect(getPath(source, "servers.1.host")).toBe("two");
    expect(getPath(source, "app.tags.1")).toBe("b");
  });

  it("returns undefined for a missing key", () => {
    expect(getPath(source, "database")).toBeUndefined();
    expect(getPath(source, "app.version")).toBeUndefined();
  });

  it("returns undefined when an out-of-range index is used", () => {
    expect(getPath(source, "servers.9")).toBeUndefined();
    expect(getPath(source, "servers.9.host")).toBeUndefined();
  });

  it("returns undefined when walking through a primitive", () => {
    expect(getPath(source, "app.name.length")).toBeUndefined();
    expect(getPath(source, "http.port.toFixed")).toBeUndefined();
  });

  it("returns undefined when walking through null or undefined", () => {
    expect(getPath(source, "nothing.anything")).toBeUndefined();
    expect(getPath(source, "undef.anything")).toBeUndefined();
  });

  it("ignores inherited properties", () => {
    expect(getPath(source, "app.toString")).toBeUndefined();
    expect(getPath(source, "constructor")).toBeUndefined();
  });

  it("returns undefined for an empty path", () => {
    expect(getPath(source, "")).toBeUndefined();
  });

  it("returns undefined for a path with an empty segment", () => {
    expect(getPath(source, "app..name")).toBeUndefined();
  });

  it("returns undefined when the source is not traversable", () => {
    expect(getPath(null, "app")).toBeUndefined();
    expect(getPath(undefined, "app")).toBeUndefined();
    expect(getPath("string", "length")).toBeUndefined();
    expect(getPath(42, "toFixed")).toBeUndefined();
  });

  it("walks objects with a null prototype", () => {
    const bare = Object.create(null) as Record<string, unknown>;
    bare.key = "value";

    expect(getPath({ bare }, "bare.key")).toBe("value");
  });
});

describe("hasPath()", () => {
  it("is true for keys that exist, including falsy values", () => {
    expect(hasPath(source, "app")).toBe(true);
    expect(hasPath(source, "app.name")).toBe(true);
    expect(hasPath(source, "app.debug")).toBe(true);
    expect(hasPath(source, "http.port")).toBe(true);
    expect(hasPath(source, "http.host")).toBe(true);
    expect(hasPath(source, "http.cors.origins")).toBe(true);
    expect(hasPath(source, "servers.0.host")).toBe(true);
  });

  it("is true for keys explicitly set to null or undefined", () => {
    expect(hasPath(source, "nothing")).toBe(true);
    expect(hasPath(source, "undef")).toBe(true);
  });

  it("is false for missing keys", () => {
    expect(hasPath(source, "database")).toBe(false);
    expect(hasPath(source, "app.version")).toBe(false);
    expect(hasPath(source, "servers.9")).toBe(false);
  });

  it("is false past a primitive, null or undefined", () => {
    expect(hasPath(source, "app.name.length")).toBe(false);
    expect(hasPath(source, "nothing.anything")).toBe(false);
    expect(hasPath(source, "undef.anything")).toBe(false);
  });

  it("is false for inherited properties", () => {
    expect(hasPath(source, "app.toString")).toBe(false);
  });

  it("is false for an empty path", () => {
    expect(hasPath(source, "")).toBe(false);
  });
});

describe("resolvePath()", () => {
  it("separates existence from value", () => {
    expect(resolvePath(source, "undef")).toEqual({
      exists: true,
      value: undefined,
    });
    expect(resolvePath(source, "missing")).toEqual({
      exists: false,
      value: undefined,
    });
  });

  it("never mutates the source", () => {
    const original = structuredClone(source);

    resolvePath(source, "app.name");
    resolvePath(source, "missing.deep.path");

    expect(source).toEqual(original);
  });
});
