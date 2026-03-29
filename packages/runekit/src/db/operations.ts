import { eq, sql, type SQL } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';

type AnyTable = SQLiteTableWithColumns<any>;

export interface FindManyOpts {
	where?: SQL;
	limit?: number;
	offset?: number;
	sort?: { column: string; order?: 'asc' | 'desc' };
}

export function findMany(db: BetterSQLite3Database, table: AnyTable, opts: FindManyOpts = {}) {
	let q = db.select().from(table).$dynamic();
	if (opts.where) q = q.where(opts.where);
	if (opts.sort) {
		const col = (table as any)[opts.sort.column];
		q = q.orderBy(opts.sort.order === 'desc' ? sql`${col} desc` : col);
	}
	if (opts.limit) q = q.limit(opts.limit);
	if (opts.offset) q = q.offset(opts.offset);
	return q.all();
}

export function findById(db: BetterSQLite3Database, table: AnyTable, id: string) {
	return db.select().from(table).where(eq(table.id, id)).get();
}

export function insertOne(db: BetterSQLite3Database, table: AnyTable, data: Record<string, unknown>) {
	const now = new Date().toISOString();
	const row = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...data };
	return db.insert(table).values(row).returning().get();
}

export function updateOne(db: BetterSQLite3Database, table: AnyTable, id: string, data: Record<string, unknown>) {
	const now = new Date().toISOString();
	return db.update(table).set({ ...data, updatedAt: now }).where(eq(table.id, id)).returning().get();
}

export function deleteOne(db: BetterSQLite3Database, table: AnyTable, id: string) {
	return db.delete(table).where(eq(table.id, id)).returning().get();
}
