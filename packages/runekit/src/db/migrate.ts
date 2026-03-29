import { getTableConfig } from "drizzle-orm/sqlite-core";
import type { RunekitDatabase } from "./init.js";

/** Push-based migration: ensures all tables/columns exist. Creates missing ones, adds new columns. */
export function pushSchema({ sqlite, tables }: Pick<RunekitDatabase, "sqlite" | "tables">): void {
  for (const table of Object.values(tables)) {
    const { name, columns } = getTableConfig(table);

    // Check if table exists
    const exists = sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .get(name) as { name: string } | undefined;

    if (!exists) {
      const colDefs = columns
        .map((c) => {
          let def = `"${c.name}" ${c.getSQLType()}`;
          if (c.primary) def += " PRIMARY KEY";
          if (c.notNull) def += " NOT NULL";
          return def;
        })
        .join(", ");
      sqlite.exec(`CREATE TABLE "${name}" (${colDefs})`);
      continue;
    }

    // Add missing columns to existing table
    const existing = sqlite.prepare(`PRAGMA table_info("${name}")`).all() as { name: string }[];
    const existingNames = new Set(existing.map((r) => r.name));

    for (const col of columns) {
      if (!existingNames.has(col.name)) {
        const typeSql = col.getSQLType();
        sqlite.exec(`ALTER TABLE "${name}" ADD COLUMN "${col.name}" ${typeSql}`);
      }
    }
  }
}
