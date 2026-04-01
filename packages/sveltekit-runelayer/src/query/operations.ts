import { findMany, findById, insertOne, updateOne, deleteOne } from "../db/operations.js";
import { and, eq, type SQL } from "drizzle-orm";
import { runBeforeHooks, runAfterHooks } from "../hooks/runner.js";
import type { HookContext } from "../hooks/types.js";
import { checkAccess } from "./access.js";
import { allowedQueryColumns, enforceReadProjection, enforceWritePayload } from "./enforcement.js";
import type { QueryContext, FindArgs } from "./types.js";

function table(ctx: QueryContext) {
  return ctx.db.tables[ctx.collection.slug];
}

function hookCtx(
  ctx: QueryContext,
  operation: HookContext["operation"],
  extra?: Partial<HookContext>,
): HookContext {
  return { collection: ctx.collection.slug, operation, req: ctx.req, ...extra };
}

export async function find(ctx: QueryContext, args: FindArgs = {}) {
  await checkAccess(ctx.collection.access?.read, ctx.req);
  let hc = await runBeforeHooks(ctx.collection.hooks?.beforeRead as any, hookCtx(ctx, "read"));
  const allowedColumns = allowedQueryColumns(ctx.collection);
  if (args.sort && !allowedColumns.has(args.sort)) {
    throw Object.assign(new Error(`Invalid sort column "${args.sort}"`), { status: 400 });
  }

  let whereClause: SQL | undefined;
  if (args.where) {
    const conditions: SQL[] = [];
    for (const [column, value] of Object.entries(args.where)) {
      if (!allowedColumns.has(column)) {
        throw Object.assign(new Error(`Invalid where field "${column}"`), { status: 400 });
      }
      const tableColumn = (table(ctx) as Record<string, unknown>)[column];
      if (!tableColumn) {
        throw Object.assign(new Error(`Invalid where field "${column}"`), { status: 400 });
      }
      conditions.push(eq(tableColumn as never, value as never));
    }
    whereClause = conditions.length <= 1 ? conditions[0] : and(...conditions);
  }

  const docs = await findMany(ctx.db.db, table(ctx), {
    where: whereClause,
    limit: args.limit,
    offset: args.offset,
    sort: args.sort ? { column: args.sort, order: args.sortOrder } : undefined,
  });
  await runAfterHooks(ctx.collection.hooks?.afterRead as any, { ...hc, docs });
  return await Promise.all(
    docs.map((doc) =>
      enforceReadProjection(ctx.collection, ctx.req, doc as Record<string, unknown>),
    ),
  );
}

export async function findOne(ctx: QueryContext, id: string) {
  await checkAccess(ctx.collection.access?.read, ctx.req, undefined, id);
  let hc = await runBeforeHooks(
    ctx.collection.hooks?.beforeRead as any,
    hookCtx(ctx, "read", { id }),
  );
  const doc = await findById(ctx.db.db, table(ctx), id);
  await runAfterHooks(ctx.collection.hooks?.afterRead as any, { ...hc, doc });
  return await enforceReadProjection(ctx.collection, ctx.req, doc as Record<string, unknown>);
}

export async function create(ctx: QueryContext, data: Record<string, unknown>) {
  const enforced = await enforceWritePayload(ctx.collection, "create", data, ctx.req);
  await checkAccess(ctx.collection.access?.create, ctx.req, enforced);
  let hc = await runBeforeHooks(
    ctx.collection.hooks?.beforeChange as any,
    hookCtx(ctx, "create", { data: enforced }),
  );
  const hookData = await enforceWritePayload(
    ctx.collection,
    "create",
    hc.data ?? enforced,
    ctx.req,
  );
  await checkAccess(ctx.collection.access?.create, ctx.req, hookData);
  const doc = await insertOne(ctx.db.db, table(ctx), hookData);
  await runAfterHooks(ctx.collection.hooks?.afterChange as any, { ...hc, doc });
  return (await enforceReadProjection(
    ctx.collection,
    ctx.req,
    doc as Record<string, unknown>,
  )) as Record<string, unknown>;
}

export async function update(ctx: QueryContext, id: string, data: Record<string, unknown>) {
  const existingDoc = await findById(ctx.db.db, table(ctx), id);
  const enforced = await enforceWritePayload(
    ctx.collection,
    "update",
    data,
    ctx.req,
    existingDoc as Record<string, unknown> | undefined,
    id,
  );
  await checkAccess(ctx.collection.access?.update, ctx.req, enforced, id);
  let hc = await runBeforeHooks(
    ctx.collection.hooks?.beforeChange as any,
    hookCtx(ctx, "update", { data: enforced, id, existingDoc: existingDoc as any }),
  );
  const hookData = await enforceWritePayload(
    ctx.collection,
    "update",
    hc.data ?? enforced,
    ctx.req,
    existingDoc as Record<string, unknown> | undefined,
    id,
  );
  await checkAccess(ctx.collection.access?.update, ctx.req, hookData, id);
  const doc = await updateOne(ctx.db.db, table(ctx), id, hookData);
  await runAfterHooks(ctx.collection.hooks?.afterChange as any, { ...hc, doc });
  return (await enforceReadProjection(
    ctx.collection,
    ctx.req,
    doc as Record<string, unknown>,
  )) as Record<string, unknown>;
}

export async function remove(ctx: QueryContext, id: string) {
  await checkAccess(ctx.collection.access?.delete, ctx.req, undefined, id);
  let hc = await runBeforeHooks(
    ctx.collection.hooks?.beforeDelete as any,
    hookCtx(ctx, "delete", { id }),
  );
  const doc = await deleteOne(ctx.db.db, table(ctx), id);
  await runAfterHooks(ctx.collection.hooks?.afterDelete as any, { ...hc, doc });
  return await enforceReadProjection(ctx.collection, ctx.req, doc as Record<string, unknown>);
}
