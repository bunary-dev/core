/**
 * HTTP provider.
 *
 * Depends on the database provider: it reads the `DATABASE` token in `boot`,
 * which only works because every `register` runs before any `boot`. Its
 * settings come from the augmented `http` namespace by dot path.
 * A real project writes `from "@bunary/core"`.
 */

import {
  createToken,
  defineProvider,
  type Provider,
  type Token,
} from "../../../src/index.js";
import { DATABASE } from "./database.js";

export interface HttpServer {
  readonly host: string;
  readonly port: number;
  readonly url: string;
  /** True once the server has started listening, during `boot`. */
  listening: boolean;
  /** True when the database was already open by the time http booted. */
  databaseReady: boolean;
  /** Rows returned by the readiness query, proving the dependency works. */
  readyRows: number;
}

export const HTTP_SERVER: Token<HttpServer> = createToken<HttpServer>("http");

export const httpProvider: Provider = defineProvider({
  name: "http",

  register(app) {
    const host = app.config.get<string>("http.host", "0.0.0.0");
    const port = app.config.get<number>("http.port", 3000);

    app.set(HTTP_SERVER, {
      host,
      port,
      url: `http://${host}:${port}`,
      listening: false,
      databaseReady: false,
      readyRows: 0,
    });

    app.get(DATABASE).events.push("http:register");
  },

  async boot(app) {
    const server = app.get(HTTP_SERVER);
    const database = app.get(DATABASE);

    server.databaseReady = database.open;
    server.readyRows = (await database.query("select 1 as one")).length;
    server.listening = true;

    database.events.push("http:listen");
  },
});
