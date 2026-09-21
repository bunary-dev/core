/**
 * @bunary/core - Command Tests
 * TDD: Type-level tests for the `Command` contract and `BunaryConfig.commands`
 */

import { describe, expect, it } from "bun:test";
import type { Command, CommandArg, CommandFlag } from "../src/command.js";
import { defineConfig } from "../src/config.js";

describe("Command", () => {
  it("accepts a minimal valid command (no args/flags)", () => {
    const command: Command = {
      name: "db:seed",
      description: "Seed the database",
      usage: "bunary db:seed",
      category: "database",
      run: async () => {},
    };

    expect(command.name).toBe("db:seed");
    expect(command.args).toBeUndefined();
    expect(command.flags).toBeUndefined();
  });

  it("accepts a fully populated command with args and flags", () => {
    const arg: CommandArg = {
      name: "name",
      required: true,
      description: "The route name",
    };

    const flag: CommandFlag = {
      name: "dry-run",
      alias: "d",
      description: "Preview without writing files",
      values: ["true", "false"],
    };

    const command: Command = {
      name: "route:make",
      description: "Scaffold a new route",
      usage: "bunary route:make <name>",
      category: "generators",
      args: [arg],
      flags: [flag],
      run: async (args: string[], flags: Record<string, string | boolean>) => {
        expect(Array.isArray(args)).toBe(true);
        expect(typeof flags).toBe("object");
      },
    };

    expect(command.args).toHaveLength(1);
    expect(command.flags).toHaveLength(1);
  });

  it("run() receives positional args and parsed flags", async () => {
    const seen: { args: string[]; flags: Record<string, string | boolean> } = {
      args: [],
      flags: {},
    };

    const command: Command = {
      name: "test:run",
      description: "Run tests",
      usage: "bunary test:run",
      category: "testing",
      run: async (args: string[], flags: Record<string, string | boolean>) => {
        seen.args = args;
        seen.flags = flags;
      },
    };

    await command.run(["unit"], { watch: true, reporter: "json" });

    expect(seen.args).toEqual(["unit"]);
    expect(seen.flags).toEqual({ watch: true, reporter: "json" });
  });

  it("rejects a command missing required fields", () => {
    // @ts-expect-error - missing name, usage, category, run
    const invalid: Command = {
      description: "Missing everything else",
    };
    expect(invalid).toBeDefined();
  });

  it("rejects a command whose run has the wrong shape", () => {
    const invalid: Command = {
      name: "bad:run",
      description: "Bad run signature",
      usage: "bunary bad:run",
      category: "misc",
      // @ts-expect-error - run must be (args: string[], flags: Record<string, string | boolean>) => Promise<void>
      run: (n: number) => n,
    };
    expect(invalid).toBeDefined();
  });

  it("rejects a CommandArg missing required fields", () => {
    // @ts-expect-error - missing `required` and `description`
    const invalidArg: CommandArg = {
      name: "name",
    };
    expect(invalidArg).toBeDefined();
  });

  it("rejects a CommandFlag with a non-string values entry", () => {
    const invalidFlag: CommandFlag = {
      name: "level",
      description: "Log level",
      // @ts-expect-error - values must be string[]
      values: [1, 2, 3],
    };
    expect(invalidFlag).toBeDefined();
  });
});

describe("BunaryConfig.commands", () => {
  it("defineConfig passes commands through unchanged", () => {
    const seed: Command = {
      name: "db:seed",
      description: "Seed the database",
      usage: "bunary db:seed",
      category: "database",
      run: async () => {},
    };

    const config = defineConfig({
      app: { name: "TestApp" },
      commands: [seed],
    });

    expect(config.commands).toEqual([seed]);
    expect(config.commands?.[0]).toBe(seed);
  });

  it("defineConfig works without commands (optional field)", () => {
    const config = defineConfig({ app: { name: "TestApp" } });
    expect(config.commands).toBeUndefined();
  });

  it("defineConfig passes through multiple commands in order", () => {
    const a: Command = {
      name: "a:cmd",
      description: "A",
      usage: "bunary a:cmd",
      category: "misc",
      run: async () => {},
    };
    const b: Command = {
      name: "b:cmd",
      description: "B",
      usage: "bunary b:cmd",
      category: "misc",
      run: async () => {},
    };

    const config = defineConfig({
      app: { name: "TestApp" },
      commands: [a, b],
    });

    expect(config.commands).toEqual([a, b]);
  });
});
