import { getTableConfig } from "drizzle-orm/sqlite-core";
import type { CollectionConfig } from "../schema/collections.js";
import type { GlobalConfig } from "../schema/globals.js";
import { createDatabase, type RunelayerDatabase } from "../db/init.js";

function quoteIdent(name: string): string {
  return `"${name.replaceAll(`"`, `""`)}"`;
}

/**
 * Test helper that applies generated schema to the target database URL.
 * Mirrors a host-managed pre-start migration step used by drizzle-kit workflows.
 */
export async function applySchemaForTests({
  client,
  tables,
}: Pick<RunelayerDatabase, "client" | "tables">): Promise<void> {
  for (const table of Object.values(tables)) {
    const { name, columns } = getTableConfig(table);

    const existsResult = await client.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
      args: [name],
    });

    const tableExists = existsResult.rows.length > 0;
    if (!tableExists) {
      const colDefs = columns
        .map((col) => {
          let def = `${quoteIdent(col.name)} ${col.getSQLType()}`;
          if (col.primary) def += " PRIMARY KEY";
          if (col.notNull) def += " NOT NULL";
          return def;
        })
        .join(", ");
      await client.execute(`CREATE TABLE ${quoteIdent(name)} (${colDefs})`);
      continue;
    }

    const existingColumnsResult = await client.execute(`PRAGMA table_info(${quoteIdent(name)})`);
    const existingNames = new Set(
      existingColumnsResult.rows.map((row) => String((row as Record<string, unknown>).name)),
    );

    for (const col of columns) {
      if (!existingNames.has(col.name)) {
        await client.execute(
          `ALTER TABLE ${quoteIdent(name)} ADD COLUMN ${quoteIdent(col.name)} ${col.getSQLType()}`,
        );
      }
    }
  }
}

export async function migrateDatabaseForTests(
  url: string,
  collections: CollectionConfig[],
  globals: GlobalConfig[] = [],
): Promise<void> {
  const database = createDatabase({ url, collections, globals });
  try {
    await applySchemaForTests(database);
  } finally {
    database.client.close();
  }
}
