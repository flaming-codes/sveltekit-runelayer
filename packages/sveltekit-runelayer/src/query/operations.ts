import {
  findMany,
  findById,
  insertOne,
  updateOne,
  deleteOne,
  createVersionSnapshot,
  findVersions as dbFindVersions,
  findVersionById,
  deleteVersionsByParent,
  pruneVersions,
} from "../db/operations.js";
import { and, eq, type SQL } from "drizzle-orm";
import { runBeforeHooks, runAfterHooks } from "../hooks/runner.js";
import type { HookContext } from "../hooks/types.js";
import { checkAccess } from "./access.js";
import { allowedQueryColumns, enforceReadProjection, enforceWritePayload } from "./enforcement.js";
import type { QueryContext, FindArgs } from "./types.js";
import { normalizeVersionConfig } from "../versions/config.js";

function table(ctx: QueryContext) {
  return ctx.db.tables[ctx.collection.slug];
}

function versionsTable(ctx: QueryContext) {
  return ctx.db.tables[`${ctx.collection.slug}_versions`];
}

function hookCtx(
  ctx: QueryContext,
  operation: HookContext["operation"],
  extra?: Partial<HookContext>,
): HookContext {
  return { collection: ctx.collection.slug, operation, req: ctx.req, ...extra };
}

function getUserId(req?: Request): string | undefined {
  return req?.headers.get("x-user-id") ?? undefined;
}

function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

function versionConfig(ctx: QueryContext) {
  return normalizeVersionConfig(ctx.collection.versions);
}

async function snapshotAndPrune(
  ctx: QueryContext,
  parentId: string,
  version: number,
  status: string,
  snapshot: Record<string, unknown>,
) {
  const vc = versionConfig(ctx);
  if (!vc) return;
  await createVersionSnapshot(
    ctx.db.db,
    versionsTable(ctx),
    parentId,
    version,
    status,
    snapshot,
    getUserId(ctx.req),
  );
  if (vc.maxPerDoc > 0) {
    await pruneVersions(ctx.db.db, versionsTable(ctx), parentId, vc.maxPerDoc);
  }
}

export async function find(ctx: QueryContext, args: FindArgs = {}) {
  await checkAccess(ctx.collection.access?.read, ctx.req);
  let hc = await runBeforeHooks(ctx.collection.hooks?.beforeRead as any, hookCtx(ctx, "read"));
  const allowedColumns = allowedQueryColumns(ctx.collection);
  if (args.sort && !allowedColumns.has(args.sort)) {
    throw Object.assign(new Error(`Invalid sort column "${args.sort}"`), { status: 400 });
  }

  const conditions: SQL[] = [];

  // Auto-filter to published for versioned collections unless draft=true
  const vc = versionConfig(ctx);
  if (vc && !args.draft) {
    const tableColumn = (table(ctx) as Record<string, unknown>)._status;
    if (tableColumn) {
      conditions.push(eq(tableColumn as never, "published" as never));
    }
  }

  if (args.where) {
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
  }

  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

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
  const vc = versionConfig(ctx);
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

  // Inject version fields for versioned collections
  const insertData = vc ? { ...hookData, _status: "draft", _version: 1 } : hookData;

  const doc = await insertOne(ctx.db.db, table(ctx), insertData);
  await runAfterHooks(ctx.collection.hooks?.afterChange as any, { ...hc, doc });

  // Create initial version snapshot
  if (vc) {
    const docRecord = doc as Record<string, unknown>;
    await snapshotAndPrune(ctx, docRecord.id as string, 1, "draft", docRecord);
  }

  return (await enforceReadProjection(
    ctx.collection,
    ctx.req,
    doc as Record<string, unknown>,
  )) as Record<string, unknown>;
}

export async function update(ctx: QueryContext, id: string, data: Record<string, unknown>) {
  const vc = versionConfig(ctx);
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

  // Increment version for versioned collections
  let updateData = hookData;
  if (vc) {
    const currentVersion = (existingDoc as any)?._version ?? 0;
    updateData = { ...hookData, _version: currentVersion + 1 };
  }

  const doc = await updateOne(ctx.db.db, table(ctx), id, updateData);
  await runAfterHooks(ctx.collection.hooks?.afterChange as any, { ...hc, doc });

  // Create version snapshot
  if (vc) {
    const docRecord = doc as Record<string, unknown>;
    await snapshotAndPrune(
      ctx,
      id,
      docRecord._version as number,
      (docRecord._status as string) ?? "draft",
      docRecord,
    );
  }

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

  // Cascade-delete all versions
  const vc = versionConfig(ctx);
  if (vc) {
    await deleteVersionsByParent(ctx.db.db, versionsTable(ctx), id);
  }

  await runAfterHooks(ctx.collection.hooks?.afterDelete as any, { ...hc, doc });
  return await enforceReadProjection(ctx.collection, ctx.req, doc as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Version-specific operations
// ---------------------------------------------------------------------------

function assertVersioned(ctx: QueryContext) {
  if (!versionConfig(ctx)) {
    throw httpError(400, `Versioning is not enabled for collection "${ctx.collection.slug}"`);
  }
}

export async function publish(ctx: QueryContext, id: string) {
  assertVersioned(ctx);

  const existingDoc = await findById(ctx.db.db, table(ctx), id);
  if (!existingDoc) throw httpError(404, "Document not found");

  const docRecord = existingDoc as Record<string, unknown>;
  const previousStatus = (docRecord._status as string) ?? "draft";

  // Check publish access (fallback to update)
  await checkAccess(
    ctx.collection.access?.publish ?? ctx.collection.access?.update,
    ctx.req,
    docRecord,
    id,
  );

  // Run beforePublish hooks
  let hc = await runBeforeHooks(
    ctx.collection.hooks?.beforePublish as any,
    hookCtx(ctx, "publish", { id, data: docRecord, existingDoc: docRecord, previousStatus }),
  );

  // Full validation — required fields must be present
  const { _status, _version, id: _id, createdAt, updatedAt, ...fieldData } = hc.data ?? docRecord;
  await enforceWritePayload(ctx.collection, "update", fieldData, ctx.req, docRecord, id);

  const newVersion = ((docRecord._version as number) ?? 0) + 1;
  const doc = await updateOne(ctx.db.db, table(ctx), id, {
    ...fieldData,
    _status: "published",
    _version: newVersion,
  });

  const finalDoc = doc as Record<string, unknown>;
  await snapshotAndPrune(ctx, id, newVersion, "published", finalDoc);

  await runAfterHooks(ctx.collection.hooks?.afterPublish as any, {
    ...hc,
    doc: finalDoc,
    previousStatus,
  });

  return (await enforceReadProjection(ctx.collection, ctx.req, finalDoc)) as Record<
    string,
    unknown
  >;
}

export async function unpublish(ctx: QueryContext, id: string) {
  assertVersioned(ctx);

  const existingDoc = await findById(ctx.db.db, table(ctx), id);
  if (!existingDoc) throw httpError(404, "Document not found");

  const docRecord = existingDoc as Record<string, unknown>;

  await checkAccess(
    ctx.collection.access?.publish ?? ctx.collection.access?.update,
    ctx.req,
    docRecord,
    id,
  );

  const newVersion = ((docRecord._version as number) ?? 0) + 1;
  const doc = await updateOne(ctx.db.db, table(ctx), id, {
    _status: "draft",
    _version: newVersion,
  });

  const finalDoc = doc as Record<string, unknown>;
  await snapshotAndPrune(ctx, id, newVersion, "draft", finalDoc);

  return (await enforceReadProjection(ctx.collection, ctx.req, finalDoc)) as Record<
    string,
    unknown
  >;
}

export async function saveDraft(ctx: QueryContext, id: string, data: Record<string, unknown>) {
  assertVersioned(ctx);

  const existingDoc = await findById(ctx.db.db, table(ctx), id);
  if (!existingDoc) throw httpError(404, "Document not found");

  const docRecord = existingDoc as Record<string, unknown>;

  // Relaxed validation — required fields not enforced
  const enforced = await enforceWritePayload(
    ctx.collection,
    "update",
    data,
    ctx.req,
    docRecord,
    id,
    { relaxRequired: true },
  );
  await checkAccess(ctx.collection.access?.update, ctx.req, enforced, id);

  let hc = await runBeforeHooks(
    ctx.collection.hooks?.beforeChange as any,
    hookCtx(ctx, "update", { data: enforced, id, existingDoc: docRecord }),
  );
  const hookData = await enforceWritePayload(
    ctx.collection,
    "update",
    hc.data ?? enforced,
    ctx.req,
    docRecord,
    id,
    { relaxRequired: true },
  );

  const newVersion = ((docRecord._version as number) ?? 0) + 1;
  const doc = await updateOne(ctx.db.db, table(ctx), id, {
    ...hookData,
    _status: "draft",
    _version: newVersion,
  });

  const finalDoc = doc as Record<string, unknown>;
  await snapshotAndPrune(ctx, id, newVersion, "draft", finalDoc);

  await runAfterHooks(ctx.collection.hooks?.afterChange as any, { ...hc, doc: finalDoc });

  return (await enforceReadProjection(ctx.collection, ctx.req, finalDoc)) as Record<
    string,
    unknown
  >;
}

export async function findVersionHistory(
  ctx: QueryContext,
  id: string,
  opts?: { limit?: number; offset?: number },
) {
  assertVersioned(ctx);
  await checkAccess(ctx.collection.access?.read, ctx.req, undefined, id);

  const versions = await dbFindVersions(ctx.db.db, versionsTable(ctx), id, opts);
  return versions.map((v: any) => ({
    id: v.id,
    _version: v._version,
    _status: v._status,
    createdAt: v.createdAt,
    _createdBy: v._createdBy,
  }));
}

export async function restoreVersion(ctx: QueryContext, id: string, versionId: string) {
  assertVersioned(ctx);

  const existingDoc = await findById(ctx.db.db, table(ctx), id);
  if (!existingDoc) throw httpError(404, "Document not found");

  await checkAccess(ctx.collection.access?.update, ctx.req, undefined, id);

  const versionRecord = await findVersionById(ctx.db.db, versionsTable(ctx), versionId);
  if (!versionRecord) throw httpError(404, "Version not found");

  const vRecord = versionRecord as Record<string, unknown>;
  if ((vRecord._parentId as string) !== id) {
    throw httpError(400, "Version does not belong to this document");
  }

  const snapshot = vRecord._snapshot as Record<string, unknown>;
  // Strip system fields from snapshot — only restore user field data
  const { id: _id, createdAt, updatedAt, _status, _version, ...fieldData } = snapshot;

  let hc = await runBeforeHooks(
    ctx.collection.hooks?.beforeChange as any,
    hookCtx(ctx, "update", { data: fieldData, id, existingDoc: existingDoc as any }),
  );

  const currentVersion = ((existingDoc as any)?._version ?? 0) + 1;
  const doc = await updateOne(ctx.db.db, table(ctx), id, {
    ...(hc.data ?? fieldData),
    _status: "draft",
    _version: currentVersion,
  });

  const finalDoc = doc as Record<string, unknown>;
  await snapshotAndPrune(ctx, id, currentVersion, "draft", finalDoc);

  await runAfterHooks(ctx.collection.hooks?.afterChange as any, { ...hc, doc: finalDoc });

  return (await enforceReadProjection(ctx.collection, ctx.req, finalDoc)) as Record<
    string,
    unknown
  >;
}
