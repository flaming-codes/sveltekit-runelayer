import { findMany, findById, insertOne, updateOne, deleteOne } from '../db/operations.js';
import { runBeforeHooks, runAfterHooks } from '../hooks/runner.js';
import type { HookContext } from '../hooks/types.js';
import { checkAccess } from './access.js';
import type { QueryContext, FindArgs } from './types.js';

function table(ctx: QueryContext) {
	return ctx.db.tables[ctx.collection.slug];
}

function hookCtx(ctx: QueryContext, operation: HookContext['operation'], extra?: Partial<HookContext>): HookContext {
	return { collection: ctx.collection.slug, operation, req: ctx.req, ...extra };
}

export async function find(ctx: QueryContext, args: FindArgs = {}) {
	await checkAccess(ctx.collection.access?.read, ctx.req);
	let hc = await runBeforeHooks(ctx.collection.hooks?.beforeRead as any, hookCtx(ctx, 'read'));
	const docs = findMany(ctx.db.db, table(ctx), {
		limit: args.limit,
		offset: args.offset,
		sort: args.sort ? { column: args.sort, order: args.sortOrder } : undefined,
	});
	await runAfterHooks(ctx.collection.hooks?.afterRead as any, { ...hc, docs });
	return docs;
}

export async function findOne(ctx: QueryContext, id: string) {
	await checkAccess(ctx.collection.access?.read, ctx.req, undefined, id);
	let hc = await runBeforeHooks(ctx.collection.hooks?.beforeRead as any, hookCtx(ctx, 'read', { id }));
	const doc = findById(ctx.db.db, table(ctx), id);
	await runAfterHooks(ctx.collection.hooks?.afterRead as any, { ...hc, doc });
	return doc;
}

export async function create(ctx: QueryContext, data: Record<string, unknown>) {
	await checkAccess(ctx.collection.access?.create, ctx.req, data);
	let hc = await runBeforeHooks(ctx.collection.hooks?.beforeChange as any, hookCtx(ctx, 'create', { data }));
	const doc = insertOne(ctx.db.db, table(ctx), hc.data ?? data);
	await runAfterHooks(ctx.collection.hooks?.afterChange as any, { ...hc, doc });
	return doc;
}

export async function update(ctx: QueryContext, id: string, data: Record<string, unknown>) {
	await checkAccess(ctx.collection.access?.update, ctx.req, data, id);
	const existingDoc = findById(ctx.db.db, table(ctx), id);
	let hc = await runBeforeHooks(ctx.collection.hooks?.beforeChange as any, hookCtx(ctx, 'update', { data, id, existingDoc: existingDoc as any }));
	const doc = updateOne(ctx.db.db, table(ctx), id, hc.data ?? data);
	await runAfterHooks(ctx.collection.hooks?.afterChange as any, { ...hc, doc });
	return doc;
}

export async function remove(ctx: QueryContext, id: string) {
	await checkAccess(ctx.collection.access?.delete, ctx.req, undefined, id);
	let hc = await runBeforeHooks(ctx.collection.hooks?.beforeDelete as any, hookCtx(ctx, 'delete', { id }));
	const doc = deleteOne(ctx.db.db, table(ctx), id);
	await runAfterHooks(ctx.collection.hooks?.afterDelete as any, { ...hc, doc });
	return doc;
}
