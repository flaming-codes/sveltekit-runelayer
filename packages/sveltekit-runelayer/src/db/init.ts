import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import type { CollectionConfig } from "../schema/collections.js";
import { generateTables, type GeneratedTables } from "./schema.js";

export interface DatabaseConnectionConfig {
  /** libsql database URL (e.g. `file:./data/sveltekit-runelayer.db`, `libsql://...`) */
  url: string;
  /** Turso/libsql auth token */
  authToken?: string;
}

export interface DatabaseConfig extends DatabaseConnectionConfig {
  collections: CollectionConfig[];
}

export interface RunekitDatabase {
  db: LibSQLDatabase;
  tables: GeneratedTables;
  client: Client;
}

export function createDatabase(config: DatabaseConfig): RunekitDatabase {
  const client = createClient({
    url: config.url,
    authToken: config.authToken,
  });
  const db = drizzle(client);
  const tables = generateTables(config.collections);
  return { db, tables, client };
}
