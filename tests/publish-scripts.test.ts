import { describe, expect, test } from "bun:test";
import pkg from "../package.json";

const scripts: Record<string, string | undefined> = pkg.scripts;

describe("publish scripts", () => {
  test("clean empties dist", () => {
    expect(scripts.clean).toBe("rm -rf dist");
  });

  test("build starts from a clean dist", () => {
    expect(scripts.build?.startsWith("bun run clean && ")).toBe(true);
  });

  test("prepublishOnly runs clean, then build, then tests and typecheck", () => {
    const steps = (scripts.prepublishOnly ?? "")
      .split("&&")
      .map((s) => s.trim());
    expect(steps).toEqual([
      "bun run clean",
      "bun run build",
      "bun test",
      "bun run typecheck",
    ]);
  });
});
