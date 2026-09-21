/**
 * @bunary/core - Schema Tests
 * TDD: Testing validateWith() and ValidationError.
 */

import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { BunaryError } from "../src/errors";
import {
  type SchemaLike,
  type StandardSchemaV1,
  ValidationError,
  validateWith,
} from "../src/schema";

describe("validateWith() with a Standard Schema", () => {
  const schema = z.object({
    PORT: z.coerce.number(),
    NAME: z.string(),
  });

  it("returns the parsed output on success", () => {
    const result = validateWith(schema, { PORT: "3000", NAME: "MyApp" });

    expect(result.PORT).toBe(3000);
    expect(result.NAME).toBe("MyApp");
  });

  it("throws a ValidationError on failure", () => {
    expect(() => validateWith(schema, { PORT: "nope", NAME: 1 })).toThrow(
      ValidationError,
    );
  });

  it("ValidationError extends BunaryError", () => {
    try {
      validateWith(schema, {});
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BunaryError);
      expect((error as ValidationError).name).toBe("ValidationError");
    }
  });

  it("exposes dot-joined issue paths", () => {
    const nested = z.object({ db: z.object({ url: z.string() }) });

    try {
      validateWith(nested, { db: {} });
      expect.unreachable();
    } catch (error) {
      const issues = (error as ValidationError).issues;
      expect(issues[0]?.path).toBe("db.url");
      expect(typeof issues[0]?.message).toBe("string");
    }
  });

  it("defaults the message prefix to 'Validation failed'", () => {
    try {
      validateWith(z.object({ PORT: z.number() }), {});
      expect.unreachable();
    } catch (error) {
      expect((error as ValidationError).message).toStartWith(
        "Validation failed: PORT:",
      );
    }
  });

  it("uses the context label as the message prefix", () => {
    try {
      validateWith(z.object({ PORT: z.number() }), {}, "Environment");
      expect.unreachable();
    } catch (error) {
      expect((error as ValidationError).message).toStartWith(
        "Environment validation failed: PORT:",
      );
    }
  });

  it("lists every issue separated by '; '", () => {
    try {
      validateWith(z.object({ A: z.string(), B: z.string() }), {}, "Config");
      expect.unreachable();
    } catch (error) {
      const message = (error as ValidationError).message;
      expect(message).toContain("A: ");
      expect(message).toContain("; B: ");
    }
  });

  it("uses '(root)' for issues with no path", () => {
    const rootSchema: StandardSchemaV1<unknown, string> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({ issues: [{ message: "Nope" }] }),
      },
    };

    try {
      validateWith(rootSchema, "x");
      expect.unreachable();
    } catch (error) {
      expect((error as ValidationError).issues[0]?.path).toBe("(root)");
      expect((error as ValidationError).message).toBe(
        "Validation failed: (root): Nope",
      );
    }
  });

  it("accepts raw PropertyKey path segments", () => {
    const keySchema: StandardSchemaV1<unknown, string> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({ issues: [{ message: "Nope", path: ["a", 0] }] }),
      },
    };

    try {
      validateWith(keySchema, "x");
      expect.unreachable();
    } catch (error) {
      expect((error as ValidationError).issues[0]?.path).toBe("a.0");
    }
  });

  it("rejects a schema whose validate returns a Promise", () => {
    const asyncSchema: StandardSchemaV1<unknown, string> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async () => ({ value: "ok" }),
      },
    };

    expect(() => validateWith(asyncSchema, "x")).toThrow(
      "Async schemas are not supported",
    );
    expect(() => validateWith(asyncSchema, "x")).toThrow(BunaryError);
  });

  it("freezes the issues array", () => {
    try {
      validateWith(z.object({ PORT: z.number() }), {});
      expect.unreachable();
    } catch (error) {
      expect(Object.isFrozen((error as ValidationError).issues)).toBe(true);
    }
  });
});

describe("validateWith() with a plain function", () => {
  it("returns the function's output", () => {
    const parse: SchemaLike<{ port: string }, { port: number }> = (input) => ({
      port: Number(input.port),
    });

    expect(validateWith(parse, { port: "8080" })).toEqual({ port: 8080 });
  });

  it("wraps a thrown Error in a ValidationError", () => {
    const parse = (): never => {
      throw new Error("PORT must be numeric");
    };

    try {
      validateWith(parse, {}, "Environment");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toBe(
        "Environment validation failed: (root): PORT must be numeric",
      );
      expect((error as ValidationError).cause).toBeInstanceOf(Error);
    }
  });

  it("wraps a thrown non-Error value", () => {
    const parse = (): never => {
      // biome-ignore lint/complexity/noUselessUndefined: testing non-Error throws
      throw "boom";
    };

    try {
      validateWith(parse, {});
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toBe(
        "Validation failed: (root): boom",
      );
    }
  });

  it("re-throws a ValidationError from the function untouched", () => {
    const inner = new ValidationError([{ path: "A", message: "bad" }]);
    const parse = (): never => {
      throw inner;
    };

    expect(() => validateWith(parse, {})).toThrow(inner);
  });
});
