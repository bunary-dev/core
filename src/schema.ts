/**
 * Validation contract.
 *
 * Core consumes validation, it never chooses a validator: anything that
 * implements [Standard Schema](https://standardschema.dev) works, and so does
 * a plain function. `@standard-schema/spec` is a types-only package, so core
 * still ships with no runtime validator.
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import { BunaryError } from "./errors.js";

export type { StandardSchemaV1 };

/**
 * Anything core accepts as a validator.
 *
 * Either a Standard Schema object (zod, valibot, arktype, ...) or a plain
 * function that returns the parsed value and throws on bad input.
 *
 * @example
 * ```ts
 * import { z } from "zod";
 * import type { SchemaLike } from "@bunary/core";
 *
 * const zodSchema: SchemaLike<unknown, { PORT: number }> = z.object({
 *   PORT: z.coerce.number(),
 * });
 *
 * const fnSchema: SchemaLike<Record<string, string | undefined>, { port: number }> =
 *   (source) => ({ port: Number(source.PORT ?? 3000) });
 * ```
 */
export type SchemaLike<Input = unknown, Output = Input> =
  | StandardSchemaV1<Input, Output>
  | ((input: Input) => Output);

/** A single validation failure, with a dot-joined path. */
export interface ValidationIssue {
  /** Dot-joined path to the offending value, or `"(root)"`. */
  readonly path: string;
  /** The validator's message for this issue. */
  readonly message: string;
}

/**
 * Thrown when a schema rejects its input.
 *
 * Every issue is kept on the error so callers can report them without parsing
 * the message, and the message itself lists `path: message` pairs so an
 * uncaught throw at boot is already readable.
 *
 * @example
 * ```ts
 * import { ValidationError, validateWith } from "@bunary/core";
 * import { z } from "zod";
 *
 * try {
 *   validateWith(z.object({ PORT: z.number() }), {}, "Environment");
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     error.message; // 'Environment validation failed: PORT: Invalid input'
 *     error.issues[0]?.path; // "PORT"
 *   }
 * }
 * ```
 */
export class ValidationError extends BunaryError {
  /** Every issue reported by the schema, in the order it reported them. */
  readonly issues: ReadonlyArray<ValidationIssue>;

  constructor(
    issues: ReadonlyArray<ValidationIssue>,
    context?: string,
    options?: ErrorOptions,
  ) {
    const prefix = context
      ? `${context} validation failed`
      : "Validation failed";
    const detail = issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ");

    super(`${prefix}: ${detail}`, options);
    this.name = "ValidationError";
    this.issues = Object.freeze([...issues]);
  }
}

/** Join a Standard Schema issue path into a readable dot path. */
function formatPath(path: StandardSchemaV1.Issue["path"] | undefined): string {
  if (!path || path.length === 0) {
    return "(root)";
  }

  return path
    .map((segment) =>
      typeof segment === "object" && segment !== null && "key" in segment
        ? String(segment.key)
        : String(segment),
    )
    .join(".");
}

/** Narrow a {@link SchemaLike} to a Standard Schema object. */
function isStandardSchema<Input, Output>(
  schema: SchemaLike<Input, Output>,
): schema is StandardSchemaV1<Input, Output> {
  return typeof schema === "object" && schema !== null && "~standard" in schema;
}

/**
 * Validate a value against a {@link SchemaLike}, synchronously.
 *
 * Standard Schema objects are run through `~standard.validate`; plain
 * functions are called directly and their throw is wrapped. Either way the
 * failure surfaces as a {@link ValidationError} carrying structured issues.
 *
 * Async schemas are rejected: core validates at boot, where there is nothing
 * to await into.
 *
 * @param schema - The Standard Schema object or plain function to validate with
 * @param input - The value to validate
 * @param context - Label used to prefix the error message, e.g. `"Environment"`
 * @returns The schema's output value
 * @throws {ValidationError} If the schema reports issues or the function throws
 * @throws {BunaryError} If the schema's `validate` returns a promise
 *
 * @example
 * ```ts
 * import { validateWith } from "@bunary/core";
 * import { z } from "zod";
 *
 * const schema = z.object({ PORT: z.coerce.number() });
 *
 * validateWith(schema, { PORT: "3000" }, "Environment"); // { PORT: 3000 }
 * ```
 */
export function validateWith<Input, Output>(
  schema: SchemaLike<Input, Output>,
  input: Input,
  context?: string,
): Output {
  if (!isStandardSchema(schema)) {
    try {
      return schema(input);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);

      throw new ValidationError([{ path: "(root)", message }], context, {
        cause: error,
      });
    }
  }

  const result = schema["~standard"].validate(input);

  if (result instanceof Promise) {
    throw new BunaryError(
      `Async schemas are not supported${
        context ? ` for ${context.toLowerCase()} validation` : ""
      }: validation must complete synchronously at boot.`,
    );
  }

  if (result.issues) {
    throw new ValidationError(
      result.issues.map((issue) => ({
        path: formatPath(issue.path),
        message: issue.message,
      })),
      context,
    );
  }

  return result.value;
}
