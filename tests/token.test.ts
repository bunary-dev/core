/**
 * @bunary/core - Token Tests
 * TDD: Testing createToken()
 */

import { describe, expect, it } from "bun:test";
import { createToken } from "../src/token.js";

describe("createToken()", () => {
  it("exposes the name it was created with", () => {
    const token = createToken<string>("db");

    expect(token.name).toBe("db");
  });

  it("creates distinct tokens for the same name", () => {
    const first = createToken<string>("db");
    const second = createToken<string>("db");

    expect(first).not.toBe(second);
    expect(first.name).toBe(second.name);
  });

  it("is equal only to itself", () => {
    const token = createToken<number>("port");

    expect(token).toBe(token);
  });

  it("renders as Token(name) via toString()", () => {
    const token = createToken<string>("db");

    expect(token.toString()).toBe("Token(db)");
    expect(`${token}`).toBe("Token(db)");
  });

  it("renders as Token(name) via Symbol.toStringTag", () => {
    const token = createToken<string>("cache");

    expect(Object.prototype.toString.call(token)).toBe("[object Token(cache)]");
  });

  it("keeps the name read-only at runtime", () => {
    const token = createToken<string>("db");

    expect(Object.isFrozen(token)).toBe(true);
  });

  it("carries its value type through the phantom parameter", () => {
    interface Db {
      query: (sql: string) => string;
    }
    const token = createToken<Db>("db");

    // Compile-time check: the phantom type is preserved on the token.
    type Value = typeof token extends { readonly name: string } ? Db : never;
    const value: Value = { query: (sql: string) => sql };

    expect(value.query("select 1")).toBe("select 1");
    expect(token.name).toBe("db");
  });
});
