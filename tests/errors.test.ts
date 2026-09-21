/**
 * @bunary/core - Error Tests
 * TDD: Testing BunaryError and MissingBindingError
 */

import { describe, expect, it } from "bun:test";
import { BunaryError, MissingBindingError } from "../src/errors.js";
import { createToken } from "../src/token.js";

describe("BunaryError", () => {
  it("is an Error with its own name", () => {
    const error = new BunaryError("boom");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("BunaryError");
    expect(error.message).toBe("boom");
  });

  it("supports a cause", () => {
    const cause = new Error("root");
    const error = new BunaryError("boom", { cause });

    expect(error.cause).toBe(cause);
  });

  it("has no cause when none is given", () => {
    const error = new BunaryError("boom");

    expect(error.cause).toBeUndefined();
  });
});

describe("MissingBindingError", () => {
  it("extends BunaryError", () => {
    const token = createToken<string>("db");
    const error = new MissingBindingError(token);

    expect(error).toBeInstanceOf(BunaryError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("MissingBindingError");
  });

  it("names the token in its message", () => {
    const token = createToken<string>("db");
    const error = new MissingBindingError(token);

    expect(error.message).toBe('No binding registered for token "db"');
  });

  it("keeps a reference to the token", () => {
    const token = createToken<string>("db");
    const error = new MissingBindingError(token);

    expect(error.token).toBe(token);
  });

  it("supports a cause", () => {
    const token = createToken<string>("db");
    const cause = new Error("root");
    const error = new MissingBindingError(token, { cause });

    expect(error.cause).toBe(cause);
  });
});
