import { describe, expect, test } from "bun:test";
import pkg from "../package.json";

const root = `${import.meta.dir}/..`;
const docs = ["README.md", "docs/index.md"];
const [major, minor] = pkg.version.split(".");
const installLine = `bun add @bunary/core@^${major}.${minor}.0`;

describe("release baseline", () => {
  test("package version is a plain release, not a prerelease", () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  for (const file of docs) {
    test(`${file} installs the current version line`, async () => {
      const text = await Bun.file(`${root}/${file}`).text();
      expect(text).toContain(installLine);
      expect(text).not.toMatch(/bun add @bunary\/core(?!@)/);
    });

    test(`${file} does not mention a 1.0 release candidate`, async () => {
      const text = await Bun.file(`${root}/${file}`).text();
      expect(text).not.toContain("1.0.0-rc");
    });
  }

  test("CHANGELOG has a dated entry for the current version", async () => {
    const text = await Bun.file(`${root}/CHANGELOG.md`).text();
    expect(text).toMatch(
      new RegExp(
        `^## \\[${pkg.version.replaceAll(".", "\\.")}\\] - \\d{4}-\\d{2}-\\d{2}$`,
        "m",
      ),
    );
  });
});
