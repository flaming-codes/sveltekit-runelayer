import { eq, sql, type SQL } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";

type AnyTable = SQLiteTableWithColumns<any>;

export interface FindManyOpts {
  where?: SQL;
  limit?: number;
  offset?: number;
  sort?: { column: string; order?: "asc" | "desc" };
}

export async function findMany(db: LibSQLDatabase, table: AnyTable, opts: FindManyOpts = {}) {
  let q = db.select().from(table).$dynamic();
  if (opts.where) q = q.where(opts.where);
  if (opts.sort) {
    const col = (table as any)[opts.sort.column];
    q = q.orderBy(opts.sort.order === "desc" ? sql`${col} desc` : col);
  }
  if (opts.limit) q = q.limit(opts.limit);
  if (opts.offset) q = q.offset(opts.offset);
  return await q.all();
}

export async function findById(db: LibSQLDatabase, table: AnyTable, id: string) {
  return await db.select().from(table).where(eq(table.id, id)).get();
}

export async function insertOne(
  db: LibSQLDatabase,
  table: AnyTable,
  data: Record<string, unknown>,
) {
  const now = new Date().toISOString();
  const row = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...data };
  return await db.insert(table).values(row).returning().get();
}

export async function updateOne(
  db: LibSQLDatabase,
  table: AnyTable,
  id: string,
  data: Record<string, unknown>,
) {
  const now = new Date().toISOString();
  return await db
    .update(table)
    .set({ ...data, updatedAt: now })
    .where(eq(table.id, id))
    .returning()
    .get();
}

export async function deleteOne(db: LibSQLDatabase, table: AnyTable, id: string) {
  return await db.delete(table).where(eq(table.id, id)).returning().get();
}
