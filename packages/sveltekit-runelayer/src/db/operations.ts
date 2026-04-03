import { eq, inArray, sql, type SQL } from "drizzle-orm";
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
  id?: string,
) {
  const now = new Date().toISOString();
  const row = { id: id ?? crypto.randomUUID(), createdAt: now, updatedAt: now, ...data };
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

// ---------------------------------------------------------------------------
// Version snapshot operations
// ---------------------------------------------------------------------------

export async function createVersionSnapshot(
  db: LibSQLDatabase,
  versionsTable: AnyTable,
  parentId: string,
  version: number,
  status: string,
  snapshot: Record<string, unknown>,
  createdBy?: string,
) {
  const now = new Date().toISOString();
  return await db
    .insert(versionsTable)
    .values({
      id: crypto.randomUUID(),
      _parentId: parentId,
      _version: version,
      _status: status,
      _snapshot: snapshot,
      _createdBy: createdBy ?? null,
      createdAt: now,
    })
    .returning()
    .get();
}

export async function findVersions(
  db: LibSQLDatabase,
  versionsTable: AnyTable,
  parentId: string,
  opts?: { limit?: number; offset?: number },
) {
  let q = db
    .select()
    .from(versionsTable)
    .where(eq((versionsTable as any)._parentId, parentId))
    .orderBy(sql`${(versionsTable as any).createdAt} desc`)
    .$dynamic();
  if (opts?.limit) q = q.limit(opts.limit);
  if (opts?.offset) q = q.offset(opts.offset);
  return await q.all();
}

export async function findVersionById(
  db: LibSQLDatabase,
  versionsTable: AnyTable,
  versionId: string,
) {
  return await db.select().from(versionsTable).where(eq(versionsTable.id, versionId)).get();
}

export async function getLatestVersionNumber(
  db: LibSQLDatabase,
  versionsTable: AnyTable,
  parentId: string,
): Promise<number> {
  const row = await db
    .select({ maxVersion: sql<number>`MAX(${(versionsTable as any)._version})` })
    .from(versionsTable)
    .where(eq((versionsTable as any)._parentId, parentId))
    .get();
  return (row as any)?.maxVersion ?? 0;
}

export async function deleteVersionsByParent(
  db: LibSQLDatabase,
  versionsTable: AnyTable,
  parentId: string,
) {
  await db.delete(versionsTable).where(eq((versionsTable as any)._parentId, parentId));
}

export async function pruneVersions(
  db: LibSQLDatabase,
  versionsTable: AnyTable,
  parentId: string,
  maxPerDoc: number,
) {
  if (maxPerDoc <= 0) return;

  const all = await db
    .select({ id: versionsTable.id, _status: (versionsTable as any)._status })
    .from(versionsTable)
    .where(eq((versionsTable as any)._parentId, parentId))
    .orderBy(sql`${(versionsTable as any).createdAt} desc`)
    .all();

  if (all.length <= maxPerDoc) return;

  // Always protect the most recent version (index 0) and the latest published
  const protectedIds = new Set<string>();
  protectedIds.add(String((all[0] as any).id));
  const latestPublished = all.find((v: any) => v._status === "published");
  if (latestPublished) protectedIds.add(String((latestPublished as any).id));

  // Collect IDs to delete: everything beyond maxPerDoc that isn't protected
  const toDelete: string[] = [];
  let keptNonProtected = 0;
  for (const v of all) {
    const vid = (v as any).id as string;
    if (protectedIds.has(vid)) {
      continue; // always keep protected, don't count against budget
    }
    if (keptNonProtected < maxPerDoc) {
      keptNonProtected++;
      continue;
    }
    toDelete.push(vid);
  }

  if (toDelete.length > 0) {
    await db.delete(versionsTable).where(inArray(versionsTable.id, toDelete));
  }
}
