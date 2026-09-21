/**
 * `Command` contract shared by `@bunary/cli` (built-in commands) and
 * user-defined project commands. Lives in `@bunary/core` so project code can
 * define custom commands (e.g. `src/commands/seed.ts`) without depending on
 * `@bunary/cli`.
 */

/**
 * A positional argument accepted by a {@link Command}.
 *
 * @example
 * ```ts
 * import type { CommandArg } from "@bunary/core";
 *
 * const nameArg: CommandArg = {
 *   name: "name",
 *   required: true,
 *   description: "The route name",
 * };
 * ```
 */
export interface CommandArg {
  /** Argument name */
  name: string;
  /** Whether the argument is required */
  required: boolean;
  /** Short description for help output */
  description: string;
}

/**
 * A flag accepted by a {@link Command}, e.g. `--dry-run` / `-d`.
 *
 * @example
 * ```ts
 * import type { CommandFlag } from "@bunary/core";
 *
 * const dryRunFlag: CommandFlag = {
 *   name: "dry-run",
 *   alias: "d",
 *   description: "Preview without writing files",
 * };
 * ```
 */
export interface CommandFlag {
  /** Flag name (e.g., "dry-run") */
  name: string;
  /** Single-char alias (e.g., "d" for --dry-run / -d) */
  alias?: string;
  /** Short description for help output */
  description: string;
  /** If provided, flag is an enum — only these values are accepted */
  values?: string[];
}

/**
 * The shape of a CLI command. Implemented by both built-in `@bunary/cli`
 * commands and user-defined project commands registered via
 * `BunaryConfig.commands`.
 *
 * @example
 * ```ts
 * import type { Command } from "@bunary/core";
 *
 * const seedCommand: Command = {
 *   name: "db:seed",
 *   description: "Seed the database",
 *   usage: "bunary db:seed",
 *   category: "database",
 *   run: async (args, flags) => {
 *     console.log("Seeding...", args, flags);
 *   },
 * };
 * ```
 */
export interface Command {
  /** Command name (e.g., "route:make", "db:seed") */
  name: string;
  /** Short description for help output */
  description: string;
  /** Full usage string (e.g., "bunary route:make <name>") */
  usage: string;
  /** Category for grouped help output */
  category: string;
  /** Positional arguments */
  args?: CommandArg[];
  /** Supported flags */
  flags?: CommandFlag[];
  /** The handler function */
  run: (
    args: string[],
    flags: Record<string, string | boolean>,
  ) => Promise<void>;
}
