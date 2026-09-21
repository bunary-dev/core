/**
 * @bunary/core - Emitted .d.ts import extension guard
 * Regression test for #55: emitted declaration files must use explicit
 * `.js` extensions on relative specifiers. tsc emits relative import/export
 * specifiers verbatim, and a bare `./config` specifier fails with
 * TS2834 ("Relative import paths need explicit file extensions in
 * ECMAScript imports") for consumers on `moduleResolution: node16` with
 * `skipLibCheck: false`.
 */

import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolated scratch dir for a real tsc declaration-emit build (issue #29:
// temp dirs created for tests must be cleaned up).
const tmpOutDir = mkdtempSync(join(tmpdir(), "bunary-core-dts-"));

afterAll(() => {
  rmSync(tmpOutDir, { recursive: true, force: true });
});

describe("emitted .d.ts relative imports", () => {
  it("all carry an explicit file extension", () => {
    const result = Bun.spawnSync(
      ["bunx", "tsc", "-p", "tsconfig.build.json", "--outDir", tmpOutDir],
      { cwd: process.cwd() },
    );

    expect(result.exitCode).toBe(0);

    const dtsFiles = readdirSync(tmpOutDir).filter((f) => f.endsWith(".d.ts"));
    expect(dtsFiles.length).toBeGreaterThan(0);

    // Matches `from "./foo"` and `import("./foo")` relative specifiers.
    const relativeSpecifier = /(?:from\s+|import\()["'](\.\.?\/[^"']+)["']\)?/g;

    const violations: string[] = [];
    for (const file of dtsFiles) {
      const contents = readFileSync(join(tmpOutDir, file), "utf-8");
      for (const match of contents.matchAll(relativeSpecifier)) {
        const specifier = match[1];
        if (specifier && !specifier.endsWith(".js")) {
          violations.push(`${file}: ${match[0]}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
