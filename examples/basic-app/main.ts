/**
 * The app's entry point.
 *
 * `runExample()` returns a summary instead of logging, so the test can assert
 * on it; a real `main.ts` would print it or start serving. Nothing here runs
 * at import time. A real project writes `from "@bunary/core"`.
 */

import {
  type Application,
  type Command,
  createApp,
  type EnvironmentType,
  environment,
  isDev,
} from "../../src/index.js";
import config from "./bunary.config.js";
import { DATABASE, databaseProvider } from "./providers/database.js";
import { HTTP_SERVER, httpProvider } from "./providers/http.js";

export { greetings } from "./bunary.config.js";

export interface ExampleReport {
  appName: string;
  environment: EnvironmentType;
  dev: boolean;
  debug: boolean;
  booted: boolean;
  httpUrl: string;
  port: number;
  databaseOpen: boolean;
  databaseRows: number;
  bootOrder: readonly string[];
  commands: readonly string[];
  hasDatabaseNamespace: boolean;
  commandsFilled: boolean;
}

export async function runExample(): Promise<{
  app: Application;
  report: ExampleReport;
}> {
  const app = createApp({
    config,
    providers: [databaseProvider, httpProvider],
  });

  await app.boot();

  const database = app.get(DATABASE);
  const server = app.get(HTTP_SERVER);

  const report: ExampleReport = {
    appName: app.config.get<string>("app.name", "unknown"),
    environment: environment(),
    dev: isDev(),
    debug: app.config.get<boolean>("app.debug", false),
    booted: app.booted,
    httpUrl: server.url,
    port: app.config.get<number>("http.port", 0),
    databaseOpen: database.open,
    databaseRows: server.readyRows,
    bootOrder: [...database.events],
    commands: (app.config.get<Command[]>("commands") ?? []).map(
      (command) => command.name,
    ),
    hasDatabaseNamespace: app.config.has("database"),
    commandsFilled: app.config.filled("commands"),
  };

  return { app, report };
}
