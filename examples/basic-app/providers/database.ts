/**
 * Database provider.
 *
 * `register` is synchronous and only binds the connection object; the socket
 * is opened in the async `boot`, which is the split the provider lifecycle
 * asks for. A real project writes `from "@bunary/core"`.
 */

import {
  createToken,
  defineProvider,
  type Provider,
  type Token,
} from "../../../src/index.js";

export interface DatabaseRow {
  readonly one: number;
}

/** A stand-in for a real driver's connection. */
export interface DatabaseConnection {
  readonly url: string;
  readonly poolSize: number;
  /** True once `connect()` has run. */
  open: boolean;
  /**
   * Lifecycle breadcrumbs, in the order they happened. The http provider
   * appends to the same log, so the app can show the real boot order.
   */
  readonly events: string[];
  connect: () => Promise<void>;
  query: (sql: string) => Promise<DatabaseRow[]>;
}

export const DATABASE: Token<DatabaseConnection> =
  createToken<DatabaseConnection>("database");

export function createConnection(
  url: string,
  poolSize: number,
): DatabaseConnection {
  const connection: DatabaseConnection = {
    url,
    poolSize,
    open: false,
    events: [],
    connect: async () => {
      await Promise.resolve();
      connection.open = true;
      connection.events.push("database:open");
    },
    query: async (sql: string) => {
      if (!connection.open) {
        throw new Error(`Connection is not open, cannot run: ${sql}`);
      }
      await Promise.resolve();
      return [{ one: 1 }];
    },
  };

  return connection;
}

export const databaseProvider: Provider = defineProvider({
  name: "database",

  register(app) {
    const connection = createConnection(
      app.config.get<string>("database.url", ""),
      app.config.get<number>("database.poolSize", 1),
    );
    connection.events.push("database:register");
    app.set(DATABASE, connection);
  },

  async boot(app) {
    await app.get(DATABASE).connect();
  },
});
