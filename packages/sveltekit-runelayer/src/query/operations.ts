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
import { and, eq, inArray, type SQL } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { runBeforeHooks, runAfterHooks } from "../hooks/runner.js";
import type { HookContext } from "../hooks/types.js";
import { checkAccess } from "./access.js";
import { allowedQueryColumns, enforceReadProjection, enforceWritePayload } from "./enforcement.js";
import { httpError } from "./errors.js";
import type { QueryContext, FindArgs, FindOneOpts } from "./types.js";
import { normalizeVersionConfig } from "../versions/config.js";
import type { BlockConfig, NamedField, RefSentinel } from "../schema/fields.js";
import type { GeneratedTables } from "../db/schema.js";
import type { CollectionConfig } from "../schema/collections.js";
import {
  inflateDocumentFields,
  translateDocumentPathToStorageKey,
} from "../schema/document-shape.js";

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

function versionConfig(ctx: QueryContext) {
  return normalizeVersionConfig(ctx.collection.versions);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function materializeStoredDocument(
  collection: CollectionConfig,
  doc: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!doc) return undefined;
  return inflateDocumentFields(collection.fields, doc);
}

function stripSystemFields(doc: Record<string, unknown>): Record<string, unknown> {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    _status,
    _version,
    ...fieldData
  } = doc;
  return fieldData;
}

/**
 * Executes a document write and version snapshot atomically in a single Drizzle transaction.
 * Pruning runs after the transaction as a best-effort operation (non-critical, no data loss if it fails).
 * For non-versioned collections, `writeOp` runs directly without a transaction.
 */
async function atomicWriteAndSnapshot(
  ctx: QueryContext,
  parentId: string,
  version: number,
  status: string,
  writeOp: (db: LibSQLDatabase) => Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  const vc = versionConfig(ctx);
  if (!vc) {
    return writeOp(ctx.db.db);
  }

  let finalDoc!: Record<string, unknown>;
  await ctx.db.db.transaction(async (tx) => {
    // tx implements the same interface as LibSQLDatabase at runtime
    const txDb = tx as unknown as LibSQLDatabase;
    finalDoc = await writeOp(txDb);
    const snapshotDoc = materializeStoredDocument(ctx.collection, finalDoc) ?? finalDoc;
    await createVersionSnapshot(
      txDb,
      versionsTable(ctx),
      parentId,
      version,
      status,
      snapshotDoc,
      getUserId(ctx.req),
    );
  });

  if (vc.maxPerDoc > 0) {
    await pruneVersions(ctx.db.db, versionsTable(ctx), parentId, vc.maxPerDoc);
  }

  return finalDoc;
}

// ---------------------------------------------------------------------------
// Ref population helpers (depth=1)
// ---------------------------------------------------------------------------

function parseRefSentinel(value: unknown): RefSentinel | null {
  if (value === null || value === undefined) return null;
  // JSON mode columns (hasMany: true) return objects; plain text columns return strings.
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as any)._ref === "string" &&
        typeof (parsed as any)._collection === "string"
      ) {
        return parsed as RefSentinel;
      }
    } catch {
      // not a JSON sentinel string
    }
    return null;
  }
  if (
    typeof value === "object" &&
    typeof (value as any)._ref === "string" &&
    typeof (value as any)._collection === "string"
  ) {
    return value as RefSentinel;
  }
  return null;
}

/**
 * Walk docs and collect all RefSentinel values, grouped by collection slug.
 * Uses the field config to know which fields are relationship/group/blocks.
 */
function collectSentinels(
  docs: Record<string, unknown>[],
  fields: NamedField[],
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();

  function addSentinel(sentinel: RefSentinel): void {
    if (!result.has(sentinel._collection)) {
      result.set(sentinel._collection, new Set());
    }
    result.get(sentinel._collection)!.add(sentinel._ref);
  }

  function walkFields(doc: Record<string, unknown>, namedFields: NamedField[]): void {
    for (const field of namedFields) {
      const value = doc[field.name];
      if (value === undefined || value === null) continue;

      if (field.type === "relationship") {
        if (field.hasMany) {
          // hasMany: stored as RefSentinel[] in JSON mode — value is already an array
          if (Array.isArray(value)) {
            for (const item of value) {
              const s = parseRefSentinel(item);
              if (s) addSentinel(s);
            }
          }
        } else {
          const s = parseRefSentinel(value);
          if (s) addSentinel(s);
        }
      } else if (field.type === "group") {
        if (isRecord(value)) {
          walkFields(value, field.fields);
        }
      } else if (field.type === "row" || field.type === "collapsible") {
        // Layout wrappers — children stored flat at the same level, no prefix
        walkFields(doc, field.fields);
      } else if (field.type === "blocks") {
        if (Array.isArray(value)) {
          for (const block of value) {
            if (!block || typeof block !== "object") continue;
            const blockRecord = block as Record<string, unknown>;
            const blockType = blockRecord.blockType;
            const blockConfig: BlockConfig | undefined = field.blocks.find(
              (b) => b.slug === blockType,
            );
            if (blockConfig) {
              walkFields(blockRecord, blockConfig.fields);
            }
          }
        }
      }
    }
  }

  for (const doc of docs) {
    walkFields(doc, fields);
  }

  return result;
}

/**
 * Walk docs again and replace each sentinel with the fetched document (or null).
 */
function hydrateDocs(
  docs: Record<string, unknown>[],
  fields: NamedField[],
  lookup: Map<string, Map<string, Record<string, unknown>>>,
): Record<string, unknown>[] {
  function resolveRef(value: unknown): unknown {
    const s = parseRefSentinel(value);
    if (!s) return value;
    const collectionMap = lookup.get(s._collection);
    if (!collectionMap) return null;
    return collectionMap.get(s._ref) ?? null;
  }

  function hydrateFields(
    doc: Record<string, unknown>,
    namedFields: NamedField[],
  ): Record<string, unknown> {
    const out = { ...doc };

    for (const field of namedFields) {
      const value = out[field.name];
      if (value === undefined || value === null) continue;

      if (field.type === "relationship") {
        if (field.hasMany) {
          if (Array.isArray(value)) {
            out[field.name] = value.map((item) => resolveRef(item));
          }
        } else {
          out[field.name] = resolveRef(value);
        }
      } else if (field.type === "group") {
        if (isRecord(value)) {
          out[field.name] = hydrateFields(value, field.fields);
        }
      } else if (field.type === "row" || field.type === "collapsible") {
        hydrateFields(out, field.fields);
      } else if (field.type === "blocks") {
        if (Array.isArray(value)) {
          out[field.name] = value.map((block) => {
            if (!block || typeof block !== "object") return block;
            const blockRecord = block as Record<string, unknown>;
            const blockType = blockRecord.blockType;
            const blockConfig: BlockConfig | undefined = field.blocks.find(
              (b) => b.slug === blockType,
            );
            if (!blockConfig) return blockRecord;
            return hydrateFields(blockRecord, blockConfig.fields);
          });
        }
      }
    }

    return out;
  }

  return docs.map((doc) => hydrateFields(doc, fields));
}

/**
 * Populate RefSentinel values in docs with full documents fetched from the DB.
 * Returns new doc objects (input docs are not mutated).
 */
async function populateRefs(
  docs: Record<string, unknown>[],
  fields: NamedField[],
  db: LibSQLDatabase,
  tables: GeneratedTables,
  collections: CollectionConfig[],
  req: Request | undefined,
): Promise<Record<string, unknown>[]> {
  if (docs.length === 0) return docs;

  // Step 1: collect sentinels grouped by collection
  const sentinelsByCollection = collectSentinels(docs, fields);
  if (sentinelsByCollection.size === 0) return docs;

  // Step 2: batch-fetch one query per distinct referenced collection
  const lookup = new Map<string, Map<string, Record<string, unknown>>>();

  for (const [collectionSlug, ids] of sentinelsByCollection.entries()) {
    const refTable = tables[collectionSlug];
    if (!refTable) continue; // unknown collection — refs will resolve to null

    const refCollectionConfig = collections.find((c) => c.slug === collectionSlug);

    const idList = Array.from(ids);
    const rows = await db.select().from(refTable).where(inArray(refTable.id, idList)).all();

    const idMap = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const rowRecord = row as Record<string, unknown>;
      if (typeof rowRecord.id === "string") {
        if (refCollectionConfig) {
          const materialized =
            materializeStoredDocument(refCollectionConfig, rowRecord) ?? rowRecord;
          const projected = await enforceReadProjection(refCollectionConfig, req, materialized);
          if (projected) {
            idMap.set(rowRecord.id, projected);
          }
        } else {
          // No config available — return raw row without field-level projection
          idMap.set(rowRecord.id, rowRecord);
        }
      }
    }
    lookup.set(collectionSlug, idMap);
  }

  // Step 3: hydrate — replace sentinels with fetched docs (or null)
  return hydrateDocs(docs, fields, lookup);
}

export async function find(ctx: QueryContext, args: FindArgs = {}) {
  await checkAccess(ctx.collection.access?.read, ctx.req);
  const hc = await runBeforeHooks(ctx.collection.hooks?.beforeRead, hookCtx(ctx, "read"));
  const allowedColumns = allowedQueryColumns(ctx.collection);
  if (args.sort && !allowedColumns.has(args.sort)) {
    throw httpError(400, `Invalid sort column "${args.sort}"`);
  }

  const sortColumn = args.sort
    ? (translateDocumentPathToStorageKey(ctx.collection.fields, args.sort) ?? args.sort)
    : undefined;

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
        throw httpError(400, `Invalid where field "${column}"`);
      }
      const storageKey = translateDocumentPathToStorageKey(ctx.collection.fields, column) ?? column;
      const tableColumn = (table(ctx) as Record<string, unknown>)[storageKey];
      if (!tableColumn) {
        throw httpError(400, `Invalid where field "${column}"`);
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
    sort: sortColumn ? { column: sortColumn, order: args.sortOrder } : undefined,
  });

  const materializedDocs = docs
    .map((doc) => materializeStoredDocument(ctx.collection, doc as Record<string, unknown>))
    .filter((doc): doc is Record<string, unknown> => doc !== undefined);

  const projected = (
    await Promise.all(
      materializedDocs.map((doc) => enforceReadProjection(ctx.collection, ctx.req, doc)),
    )
  ).filter((doc): doc is Record<string, unknown> => doc !== undefined);

  for (const doc of projected) {
    await runAfterHooks(ctx.collection.hooks?.afterRead, { ...hc, doc });
  }

  if (args.depth === 1) {
    return populateRefs(
      projected,
      ctx.collection.fields,
      ctx.db.db,
      ctx.db.tables,
      ctx.collections ?? [ctx.collection],
      ctx.req,
    );
  }
  return projected;
}

export async function findOne(ctx: QueryContext, id: string, opts: FindOneOpts = {}) {
  await checkAccess(ctx.collection.access?.read, ctx.req, undefined, id);
  const hc = await runBeforeHooks(ctx.collection.hooks?.beforeRead, hookCtx(ctx, "read", { id }));
  const rawDoc = await findById(ctx.db.db, table(ctx), id);
  const doc = materializeStoredDocument(
    ctx.collection,
    rawDoc as Record<string, unknown> | undefined,
  );
  const projected = await enforceReadProjection(ctx.collection, ctx.req, doc);
  if (!projected) return projected;
  await runAfterHooks(ctx.collection.hooks?.afterRead, { ...hc, doc: projected });

  if (opts.depth === 1) {
    const [populated] = await populateRefs(
      [projected],
      ctx.collection.fields,
      ctx.db.db,
      ctx.db.tables,
      ctx.collections ?? [ctx.collection],
      ctx.req,
    );
    return populated;
  }
  return projected;
}

export async function create(ctx: QueryContext, data: Record<string, unknown>) {
  const vc = versionConfig(ctx);
  const enforced = await enforceWritePayload(ctx.collection, "create", data, ctx.req);
  const enforcedDoc = materializeStoredDocument(ctx.collection, enforced) ?? enforced;
  await checkAccess(ctx.collection.access?.create, ctx.req, enforcedDoc);
  const hc = await runBeforeHooks(
    ctx.collection.hooks?.beforeChange,
    hookCtx(ctx, "create", { data: enforcedDoc }),
  );
  const hookData = await enforceWritePayload(
    ctx.collection,
    "create",
    hc.data ?? enforcedDoc,
    ctx.req,
  );
  const hookDoc = materializeStoredDocument(ctx.collection, hookData) ?? hookData;
  await checkAccess(ctx.collection.access?.create, ctx.req, hookDoc);

  // Inject version fields for versioned collections
  const insertData = vc ? { ...hookData, _status: "draft", _version: 1 } : hookData;

  // Pre-generate the ID so it can be used as the snapshot parentId before insert returns
  const newId = vc ? crypto.randomUUID() : undefined;
  const doc = await atomicWriteAndSnapshot(
    ctx,
    newId ?? "",
    1,
    "draft",
    (db) => insertOne(db, table(ctx), insertData, newId) as Promise<Record<string, unknown>>,
  );

  const finalDoc = materializeStoredDocument(ctx.collection, doc) ?? doc;

  await runAfterHooks(ctx.collection.hooks?.afterChange, {
    ...hc,
    data: hookDoc,
    doc: finalDoc,
  });

  return (await enforceReadProjection(ctx.collection, ctx.req, finalDoc)) as Record<
    string,
    unknown
  >;
}

export async function update(ctx: QueryContext, id: string, data: Record<string, unknown>) {
  const vc = versionConfig(ctx);
  const existingDocRow = await findById(ctx.db.db, table(ctx), id);
  if (!existingDocRow) {
    throw httpError(404, "Document not found");
  }
  const existingDoc = materializeStoredDocument(
    ctx.collection,
    existingDocRow as Record<string, unknown> | undefined,
  );
  const enforced = await enforceWritePayload(
    ctx.collection,
    "update",
    data,
    ctx.req,
    existingDoc,
    id,
  );
  const enforcedDoc = materializeStoredDocument(ctx.collection, enforced) ?? enforced;
  await checkAccess(ctx.collection.access?.update, ctx.req, enforcedDoc, id);
  const hc = await runBeforeHooks(
    ctx.collection.hooks?.beforeChange,
    hookCtx(ctx, "update", {
      data: enforcedDoc,
      id,
      existingDoc,
    }),
  );
  const hookData = await enforceWritePayload(
    ctx.collection,
    "update",
    hc.data ?? enforcedDoc,
    ctx.req,
    existingDoc,
    id,
  );
  const hookDoc = materializeStoredDocument(ctx.collection, hookData) ?? hookData;
  await checkAccess(ctx.collection.access?.update, ctx.req, hookDoc, id);

  // Increment version for versioned collections
  const currentVersion = (existingDocRow as any)?._version ?? 0;
  const newVersion = vc ? currentVersion + 1 : currentVersion;
  const currentStatus = (existingDocRow as any)?._status ?? "draft";
  const updateData = vc ? { ...hookData, _version: newVersion } : hookData;

  const doc = await atomicWriteAndSnapshot(
    ctx,
    id,
    newVersion,
    currentStatus,
    (db) => updateOne(db, table(ctx), id, updateData) as Promise<Record<string, unknown>>,
  );

  const finalDoc = materializeStoredDocument(ctx.collection, doc) ?? doc;

  await runAfterHooks(ctx.collection.hooks?.afterChange, {
    ...hc,
    data: hookDoc,
    doc: finalDoc,
  });

  return (await enforceReadProjection(ctx.collection, ctx.req, finalDoc)) as Record<
    string,
    unknown
  >;
}

export async function remove(ctx: QueryContext, id: string) {
  await checkAccess(ctx.collection.access?.delete, ctx.req, undefined, id);
  const existing = await findById(ctx.db.db, table(ctx), id);
  if (!existing) {
    throw httpError(404, "Document not found");
  }
  const hc = await runBeforeHooks(
    ctx.collection.hooks?.beforeDelete,
    hookCtx(ctx, "delete", { id }),
  );
  const doc = await deleteOne(ctx.db.db, table(ctx), id);
  const finalDoc =
    materializeStoredDocument(ctx.collection, doc as Record<string, unknown>) ??
    (doc as Record<string, unknown>);

  // Cascade-delete all versions
  const vc = versionConfig(ctx);
  if (vc) {
    await deleteVersionsByParent(ctx.db.db, versionsTable(ctx), id);
  }

  await runAfterHooks(ctx.collection.hooks?.afterDelete, {
    ...hc,
    doc: finalDoc,
  });
  return await enforceReadProjection(ctx.collection, ctx.req, finalDoc);
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

  const existingDocRow = await findById(ctx.db.db, table(ctx), id);
  if (!existingDocRow) throw httpError(404, "Document not found");

  const docRecord = existingDocRow as Record<string, unknown>;
  const existingDoc = materializeStoredDocument(ctx.collection, docRecord) ?? docRecord;
  const previousStatus = (docRecord._status as string) ?? "draft";

  // Check publish access (fallback to update)
  await checkAccess(
    ctx.collection.access?.publish ?? ctx.collection.access?.update,
    ctx.req,
    existingDoc,
    id,
  );

  // Run beforePublish hooks
  const hc = await runBeforeHooks(
    ctx.collection.hooks?.beforePublish,
    hookCtx(ctx, "publish", {
      id,
      data: existingDoc,
      existingDoc,
      previousStatus,
    }),
  );

  // Full validation — required fields must be present
  const fieldData = stripSystemFields(
    (hc.data as Record<string, unknown> | undefined) ?? existingDoc,
  );
  const enforced = await enforceWritePayload(
    ctx.collection,
    "update",
    fieldData,
    ctx.req,
    existingDoc,
    id,
  );

  const newVersion = ((docRecord._version as number) ?? 0) + 1;
  const finalDoc = await atomicWriteAndSnapshot(
    ctx,
    id,
    newVersion,
    "published",
    (db) =>
      updateOne(db, table(ctx), id, {
        ...enforced,
        _status: "published",
        _version: newVersion,
      }) as Promise<Record<string, unknown>>,
  );

  const materialized = materializeStoredDocument(ctx.collection, finalDoc) ?? finalDoc;

  await runAfterHooks(ctx.collection.hooks?.afterPublish, {
    ...hc,
    data: inflateDocumentFields(ctx.collection.fields, enforced),
    doc: materialized,
    previousStatus,
  });

  return (await enforceReadProjection(ctx.collection, ctx.req, materialized)) as Record<
    string,
    unknown
  >;
}

export async function unpublish(ctx: QueryContext, id: string) {
  assertVersioned(ctx);

  const existingDocRow = await findById(ctx.db.db, table(ctx), id);
  if (!existingDocRow) throw httpError(404, "Document not found");

  const docRecord = existingDocRow as Record<string, unknown>;
  const existingDoc = materializeStoredDocument(ctx.collection, docRecord) ?? docRecord;

  await checkAccess(
    ctx.collection.access?.publish ?? ctx.collection.access?.update,
    ctx.req,
    existingDoc,
    id,
  );

  const newVersion = ((docRecord._version as number) ?? 0) + 1;
  const finalDoc = await atomicWriteAndSnapshot(
    ctx,
    id,
    newVersion,
    "draft",
    (db) =>
      updateOne(db, table(ctx), id, {
        _status: "draft",
        _version: newVersion,
      }) as Promise<Record<string, unknown>>,
  );

  const materialized = materializeStoredDocument(ctx.collection, finalDoc) ?? finalDoc;

  return (await enforceReadProjection(ctx.collection, ctx.req, materialized)) as Record<
    string,
    unknown
  >;
}

export async function saveDraft(ctx: QueryContext, id: string, data: Record<string, unknown>) {
  assertVersioned(ctx);

  const existingDocRow = await findById(ctx.db.db, table(ctx), id);
  if (!existingDocRow) throw httpError(404, "Document not found");

  const docRecord = existingDocRow as Record<string, unknown>;
  const existingDoc = materializeStoredDocument(ctx.collection, docRecord) ?? docRecord;

  // Relaxed validation — required fields not enforced
  const enforced = await enforceWritePayload(
    ctx.collection,
    "update",
    data,
    ctx.req,
    existingDoc,
    id,
    { relaxRequired: true },
  );
  const enforcedDoc = materializeStoredDocument(ctx.collection, enforced) ?? enforced;
  await checkAccess(ctx.collection.access?.update, ctx.req, enforcedDoc, id);

  const hc = await runBeforeHooks(
    ctx.collection.hooks?.beforeChange,
    hookCtx(ctx, "update", { data: enforcedDoc, id, existingDoc }),
  );
  const hookData = await enforceWritePayload(
    ctx.collection,
    "update",
    hc.data ?? enforcedDoc,
    ctx.req,
    existingDoc,
    id,
    { relaxRequired: true },
  );
  const hookDoc = materializeStoredDocument(ctx.collection, hookData) ?? hookData;
  await checkAccess(ctx.collection.access?.update, ctx.req, hookDoc, id);

  const newVersion = ((docRecord._version as number) ?? 0) + 1;
  const finalDoc = await atomicWriteAndSnapshot(
    ctx,
    id,
    newVersion,
    "draft",
    (db) =>
      updateOne(db, table(ctx), id, {
        ...hookData,
        _status: "draft",
        _version: newVersion,
      }) as Promise<Record<string, unknown>>,
  );

  const materialized = materializeStoredDocument(ctx.collection, finalDoc) ?? finalDoc;

  await runAfterHooks(ctx.collection.hooks?.afterChange, {
    ...hc,
    data: hookDoc,
    doc: materialized,
  });

  return (await enforceReadProjection(ctx.collection, ctx.req, materialized)) as Record<
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

  const existingDocRow = await findById(ctx.db.db, table(ctx), id);
  if (!existingDocRow) throw httpError(404, "Document not found");

  const existingDoc = materializeStoredDocument(
    ctx.collection,
    existingDocRow as Record<string, unknown>,
  ) as Record<string, unknown>;

  await checkAccess(ctx.collection.access?.update, ctx.req, undefined, id);

  const versionRecord = await findVersionById(ctx.db.db, versionsTable(ctx), versionId);
  if (!versionRecord) throw httpError(404, "Version not found");

  const vRecord = versionRecord as Record<string, unknown>;
  if ((vRecord._parentId as string) !== id) {
    throw httpError(400, "Version does not belong to this document");
  }

  const snapshot = inflateDocumentFields(
    ctx.collection.fields,
    (vRecord._snapshot as Record<string, unknown>) ?? {},
  );
  const fieldData = stripSystemFields(snapshot);

  const hc = await runBeforeHooks(
    ctx.collection.hooks?.beforeChange,
    hookCtx(ctx, "update", { data: fieldData, id, existingDoc }),
  );

  const restoreData = await enforceWritePayload(
    ctx.collection,
    "update",
    (hc.data as Record<string, unknown> | undefined) ?? fieldData,
    ctx.req,
    existingDoc,
    id,
    { relaxRequired: true },
  );
  const restoreDoc = materializeStoredDocument(ctx.collection, restoreData) ?? restoreData;
  await checkAccess(ctx.collection.access?.update, ctx.req, restoreDoc, id);

  const newVersion = ((existingDocRow as any)?._version ?? 0) + 1;
  const finalDoc = await atomicWriteAndSnapshot(
    ctx,
    id,
    newVersion,
    "draft",
    (db) =>
      updateOne(db, table(ctx), id, {
        ...restoreData,
        _status: "draft",
        _version: newVersion,
      }) as Promise<Record<string, unknown>>,
  );

  const materialized = materializeStoredDocument(ctx.collection, finalDoc) ?? finalDoc;

  await runAfterHooks(ctx.collection.hooks?.afterChange, {
    ...hc,
    data: restoreDoc,
    doc: materialized,
  });

  return (await enforceReadProjection(ctx.collection, ctx.req, materialized)) as Record<
    string,
    unknown
  >;
}
