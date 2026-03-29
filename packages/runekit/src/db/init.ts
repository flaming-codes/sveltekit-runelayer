import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { CollectionConfig } from "../schema/collections.js";
import { generateTables, type GeneratedTables } from "./schema.js";

export interface DatabaseConfig {
  /** Path to SQLite file, or `:memory:` */
  filename: string;
  collections: CollectionConfig[];
}

export interface RunekitDatabase {
  db: BetterSQLite3Database;
  tables: GeneratedTables;
  sqlite: any;
}

export function createDatabase(config: DatabaseConfig): RunekitDatabase {
  const sqlite = new Database(config.filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);
  const tables = generateTables(config.collections);
  return { db, tables, sqlite };
}
