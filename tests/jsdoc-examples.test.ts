/**
 * @bunary/core - JSDoc @example guard for the public API
 *
 * Regression test for #50: every symbol exported from `src/index.ts` (the
 * `@bunary/core` barrel) must carry a JSDoc block with an `@example` tag on
 * its declaration, so editor tooling and package consumers always have a
 * runnable usage snippet for anything they can import.
 *
 * The check runs against a REAL `tsc -p tsconfig.build.json` declaration
 * build (same pattern as tests/dts-imports.test.ts), not the TS source, so
 * it verifies what actually ships in the published `.d.ts` files rather than
 * trusting that source comments survive emit.
 *
 * --- Parser limits (kept intentionally simple) ---
 * - Barrel exports are enumerated by regex over `index.d.ts`'s
 *   `export { ... } from "./file.js";` / `export type { ... } from "./file.js";`
 *   lines. This assumes tsc prints one export statement per line, which
 *   holds for the current barrel; the "finds every symbol" sanity check
 *   below exists so a future formatting change that breaks this parser fails
 *   loudly (an export count dropping to 0) instead of silently passing.
 * - For each symbol, it looks in `<file>.d.ts` for a top-of-line declaration
 *   (`function` / `class` / `interface` / `type` / `const`) or a bare
 *   `export type { Name };` re-export, and checks whether a `/** ... *\/`
 *   block containing the literal text `@example` sits directly above it.
 * - Overloaded functions (e.g. `env`) emit multiple `export declare function`
 *   lines but only the FIRST signature carries the doc comment — normal TS
 *   behaviour. The check passes if ANY declaration site for a name carries
 *   the doc, not every one.
 * - This only checks for the `@example` tag's presence near the declaration;
 *   it does not parse, extract or type-check the example's code.
 */

import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolated scratch dir for a real tsc declaration-emit build (issue #29:
// temp dirs created for tests must be cleaned up).
const tmpOutDir = mkdtempSync(join(tmpdir(), "bunary-core-jsdoc-"));

afterAll(() => {
  rmSync(tmpOutDir, { recursive: true, force: true });
});

/** name -> source file base (e.g. "Application" -> "application") */
function barrelExports(outDir: string): Map<string, string> {
  const indexDts = readFileSync(join(outDir, "index.d.ts"), "utf-8");
  const exportLine =
    /^export (?:type )?\{([^}]*)\} from "\.\/([\w-]+)\.js";$/gm;

  const exports = new Map<string, string>();

  for (const match of indexDts.matchAll(exportLine)) {
    const names = match[1] ?? "";
    const fileBase = match[2] ?? "";

    for (const rawName of names.split(",")) {
      const name = rawName.trim().replace(/^type\s+/, "");
      if (name.length > 0) {
        exports.set(name, fileBase);
      }
    }
  }

  return exports;
}

/**
 * Whether `name`'s declaration in `dtsContents` has a preceding `@example`
 * doc block.
 *
 * Finds each line declaring `name`, then looks backward from it for the
 * single comment block immediately above: the text right before the
 * declaration must end with a comment close, and the nearest comment open
 * before that close is where the search stops. This intentionally does not
 * scan forward with a greedy comment match, which can jump the gap between
 * unrelated declarations and swallow an earlier symbol's `@example` as if it
 * belonged to this one (caught the hard way while writing this test - it
 * silently passed `ValidationIssue` by matching `SchemaLike`'s doc above it).
 */
function hasExampleDoc(dtsContents: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // export declare function foo(...) / export interface Foo / export type Foo = ... /
  // export declare const Foo / export type { Foo };  (bare re-export, e.g. StandardSchemaV1)
  const declarationLine = new RegExp(
    `^export (?:declare )?(?:function|class|interface|type|const) ${escaped}\\b|^export type \\{ *${escaped} *\\};?$`,
    "gm",
  );

  for (const match of dtsContents.matchAll(declarationLine)) {
    const before = dtsContents.slice(0, match.index).replace(/\s+$/, "");
    if (!before.endsWith("*/")) {
      continue;
    }

    const commentStart = before.lastIndexOf("/**");
    if (commentStart === -1) {
      continue;
    }

    if (before.slice(commentStart).includes("@example")) {
      return true;
    }
  }

  return false;
}

describe("public API JSDoc @example coverage (#50)", () => {
  it("every barrel-exported symbol has a JSDoc @example on its declaration", () => {
    const result = Bun.spawnSync(
      ["bunx", "tsc", "-p", "tsconfig.build.json", "--outDir", tmpOutDir],
      { cwd: process.cwd() },
    );

    expect(result.exitCode).toBe(0);

    const exports = barrelExports(tmpOutDir);

    // Sanity check on the parser itself: if this drops, the regex above
    // broke on a barrel format change rather than the code under test.
    expect(exports.size).toBeGreaterThanOrEqual(30);

    const violations: string[] = [];
    for (const [name, fileBase] of exports) {
      const dts = readFileSync(join(tmpOutDir, `${fileBase}.d.ts`), "utf-8");
      if (!hasExampleDoc(dts, name)) {
        violations.push(`${name} (./${fileBase}.js)`);
      }
    }

    expect(violations).toEqual([]);
  });
});
