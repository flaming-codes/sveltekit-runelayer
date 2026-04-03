import { runAfterHooks, runBeforeHooks } from "../hooks/runner.js";
import type { HookContext } from "../hooks/types.js";
import type { RunelayerInstance } from "../plugin.js";
import { checkAccess } from "../query/access.js";
import { enforceWritePayload, enforceReadProjection } from "../query/enforcement.js";
import type { GlobalConfig } from "../schema/globals.js";
import { quoteIdent } from "../db/sql-utils.js";
import { normalizeVersionConfig } from "../versions/config.js";

/** Thin adapter so enforcement functions can treat a GlobalConfig like a CollectionConfig. */
function globalAsCollection(global: GlobalConfig) {
  return {
    slug: global.slug,
    fields: global.fields,
  } as import("../schema/collections.js").CollectionConfig;
}

const GLOBALS_TABLE = "__runelayer_globals";
const GLOBAL_VERSIONS_TABLE = "__runelayer_global_versions";
const globalTableReady = new WeakSet<RunelayerInstance>();
const globalVersionsTableReady = new WeakSet<RunelayerInstance>();

type StoredGlobalRow = {
  data?: unknown;
  updatedAt?: unknown;
  _status?: unknown;
  _version?: unknown;
};

function textValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return `${value}`;
  }
  return "";
}

function parseGlobalData(value: unknown): Record<string, unknown> {
  if (typeof value === "string" && value.length > 0) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "id") continue;
    sanitized[key] = value;
  }
  return sanitized;
}

function hookContext(
  global: GlobalConfig,
  req: Request,
  operation: HookContext["operation"],
  extra: Partial<HookContext> = {},
): HookContext {
  return {
    collection: global.slug,
    operation,
    req,
    ...extra,
  };
}

function getUserId(req: Request): string | undefined {
  return req.headers.get("x-user-id") ?? undefined;
}

async function ensureGlobalTable(runelayer: RunelayerInstance): Promise<void> {
  if (globalTableReady.has(runelayer)) return;
  await runelayer.database.client.execute(`
    CREATE TABLE IF NOT EXISTS ${quoteIdent(GLOBALS_TABLE)} (
      slug TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      _status TEXT DEFAULT 'draft',
      _version INTEGER DEFAULT 1
    )
  `);
  // Add columns if table already existed without them
  try {
    await runelayer.database.client.execute(
      `ALTER TABLE ${quoteIdent(GLOBALS_TABLE)} ADD COLUMN _status TEXT DEFAULT 'draft'`,
    );
  } catch {
    // Column already exists
  }
  try {
    await runelayer.database.client.execute(
      `ALTER TABLE ${quoteIdent(GLOBALS_TABLE)} ADD COLUMN _version INTEGER DEFAULT 1`,
    );
  } catch {
    // Column already exists
  }
  globalTableReady.add(runelayer);
}

async function ensureGlobalVersionsTable(runelayer: RunelayerInstance): Promise<void> {
  if (globalVersionsTableReady.has(runelayer)) return;
  await runelayer.database.client.execute(`
    CREATE TABLE IF NOT EXISTS ${quoteIdent(GLOBAL_VERSIONS_TABLE)} (
      id TEXT PRIMARY KEY NOT NULL,
      _globalSlug TEXT NOT NULL,
      _version INTEGER NOT NULL,
      _status TEXT NOT NULL,
      _snapshot TEXT NOT NULL,
      _createdBy TEXT,
      createdAt TEXT NOT NULL
    )
  `);
  globalVersionsTableReady.add(runelayer);
}

async function readStoredGlobal(
  runelayer: RunelayerInstance,
  slug: string,
): Promise<StoredGlobalRow | null> {
  await ensureGlobalTable(runelayer);
  const result = await runelayer.database.client.execute({
    sql: `SELECT data, updatedAt, _status, _version FROM ${quoteIdent(GLOBALS_TABLE)} WHERE slug = ? LIMIT 1`,
    args: [slug],
  });
  const row = result.rows[0] as StoredGlobalRow | undefined;
  return row ?? null;
}

function materializeGlobalDoc(
  global: GlobalConfig,
  row: StoredGlobalRow | null,
): Record<string, unknown> {
  const data = parseGlobalData(row?.data);
  const updatedAt = textValue(row?.updatedAt);
  const doc: Record<string, unknown> = {
    id: global.slug,
    ...data,
  };
  if (updatedAt) {
    doc.updatedAt = updatedAt;
  }
  if (normalizeVersionConfig(global.versions)) {
    doc._status = textValue(row?._status) || "draft";
    doc._version = row?._version ?? 1;
  }
  return doc;
}

export function getGlobalBySlug(globals: GlobalConfig[], slug: string): GlobalConfig | null {
  return globals.find((entry) => entry.slug === slug) ?? null;
}

export async function readGlobalDocument(
  runelayer: RunelayerInstance,
  global: GlobalConfig,
  req: Request,
): Promise<Record<string, unknown>> {
  await checkAccess(global.access?.read, req, undefined, global.slug);
  const beforeRead = (
    global.hooks as { beforeRead?: Array<(ctx: HookContext) => HookContext> } | undefined
  )?.beforeRead;
  const afterRead = (global.hooks as { afterRead?: Array<(ctx: unknown) => void> } | undefined)
    ?.afterRead;

  const hc = await runBeforeHooks(
    beforeRead,
    hookContext(global, req, "read", { id: global.slug }),
  );
  const row = await readStoredGlobal(runelayer, global.slug);
  const doc = materializeGlobalDoc(global, row);
  await runAfterHooks(afterRead, { ...hc, doc });
  const projected = await enforceReadProjection(globalAsCollection(global), req, doc);
  return projected ?? doc;
}

export async function updateGlobalDocument(
  runelayer: RunelayerInstance,
  global: GlobalConfig,
  req: Request,
  data: Record<string, unknown>,
  opts?: { forceDraft?: boolean },
): Promise<Record<string, unknown>> {
  const incoming = sanitizeData(data);
  await checkAccess(global.access?.update, req, incoming, global.slug);

  const previousRow = await readStoredGlobal(runelayer, global.slug);
  const previousDoc = materializeGlobalDoc(global, previousRow);
  const hc = await runBeforeHooks(
    global.hooks?.beforeChange as Array<(ctx: HookContext) => HookContext> | undefined,
    hookContext(global, req, "update", {
      id: global.slug,
      data: incoming,
      existingDoc: previousDoc,
    }),
  );
  const rawNextData = sanitizeData((hc.data as Record<string, unknown> | undefined) ?? incoming);
  const nextData = await enforceWritePayload(
    globalAsCollection(global),
    "update",
    rawNextData,
    req,
    previousDoc,
    global.slug,
    { relaxRequired: true },
  );
  const updatedAt = new Date().toISOString();

  const vc = normalizeVersionConfig(global.versions);
  const currentVersion = (previousRow?._version as number) ?? 0;
  const newVersion = vc ? currentVersion + 1 : currentVersion;
  const currentStatus = opts?.forceDraft
    ? "draft"
    : vc
      ? textValue(previousRow?._status) || "draft"
      : "draft";

  const doc: Record<string, unknown> = {
    id: global.slug,
    ...nextData,
    updatedAt,
  };
  if (vc) {
    doc._status = currentStatus;
    doc._version = newVersion;
  }

  await ensureGlobalTable(runelayer);
  if (vc) {
    // Atomically write the global doc and version snapshot in a single batch transaction
    await ensureGlobalVersionsTable(runelayer);
    await runelayer.database.client.batch(
      [
        {
          sql: `
            INSERT INTO ${quoteIdent(GLOBALS_TABLE)} (slug, data, updatedAt, _status, _version)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(slug)
            DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt, _version = excluded._version, _status = excluded._status
          `,
          args: [global.slug, JSON.stringify(nextData), updatedAt, currentStatus, newVersion],
        },
        buildSnapshotStatement(global.slug, newVersion, currentStatus, doc, getUserId(req)),
      ],
      "write",
    );
    if (vc.maxPerDoc > 0) {
      await pruneGlobalVersions(runelayer, global.slug, vc.maxPerDoc);
    }
  } else {
    await runelayer.database.client.execute({
      sql: `
        INSERT INTO ${quoteIdent(GLOBALS_TABLE)} (slug, data, updatedAt, _status, _version)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(slug)
        DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt, _version = excluded._version, _status = excluded._status
      `,
      args: [global.slug, JSON.stringify(nextData), updatedAt, currentStatus, newVersion],
    });
  }

  await runAfterHooks(global.hooks?.afterChange as Array<(ctx: unknown) => void> | undefined, {
    ...hc,
    doc,
  });
  return doc;
}

// ---------------------------------------------------------------------------
// Global version helpers
// ---------------------------------------------------------------------------

/** Builds the INSERT statement for a version snapshot without executing it — for use in batch calls. */
function buildSnapshotStatement(
  globalSlug: string,
  version: number,
  status: string,
  snapshot: Record<string, unknown>,
  createdBy: string | undefined,
): { sql: string; args: (string | number | null)[] } {
  return {
    sql: `INSERT INTO ${quoteIdent(GLOBAL_VERSIONS_TABLE)} (id, _globalSlug, _version, _status, _snapshot, _createdBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      globalSlug,
      version,
      status,
      JSON.stringify(snapshot),
      createdBy ?? null,
      new Date().toISOString(),
    ],
  };
}

async function pruneGlobalVersions(
  runelayer: RunelayerInstance,
  globalSlug: string,
  maxPerDoc: number,
): Promise<void> {
  if (maxPerDoc <= 0) return;
  await ensureGlobalVersionsTable(runelayer);
  const result = await runelayer.database.client.execute({
    sql: `SELECT id, _status FROM ${quoteIdent(GLOBAL_VERSIONS_TABLE)} WHERE _globalSlug = ? ORDER BY createdAt DESC`,
    args: [globalSlug],
  });
  const all = result.rows as Array<Record<string, string>>;
  if (all.length <= maxPerDoc) return;

  const protectedIds = new Set<string>();
  protectedIds.add(all[0].id ?? "");
  const latestPublished = all.find((v) => v._status === "published");
  if (latestPublished) protectedIds.add(latestPublished.id ?? "");

  let keptNonProtected = 0;
  const toDelete: string[] = [];
  for (const v of all) {
    const vid = v.id ?? "";
    if (protectedIds.has(vid)) {
      continue; // always keep, don't count against budget
    }
    if (keptNonProtected < maxPerDoc) {
      keptNonProtected++;
      continue;
    }
    toDelete.push(vid);
  }

  if (toDelete.length === 0) return;
  const placeholders = toDelete.map(() => "?").join(", ");
  await runelayer.database.client.execute({
    sql: `DELETE FROM ${quoteIdent(GLOBAL_VERSIONS_TABLE)} WHERE id IN (${placeholders})`,
    args: toDelete,
  });
}

// ---------------------------------------------------------------------------
// Global versioning operations
// ---------------------------------------------------------------------------

export async function publishGlobal(
  runelayer: RunelayerInstance,
  global: GlobalConfig,
  req: Request,
): Promise<Record<string, unknown>> {
  const vc = normalizeVersionConfig(global.versions);
  if (!vc) throw Object.assign(new Error("Versioning is not enabled"), { status: 400 });

  await checkAccess(global.access?.publish ?? global.access?.update, req, undefined, global.slug);

  const row = await readStoredGlobal(runelayer, global.slug);
  const doc = materializeGlobalDoc(global, row);
  const currentVersion = (doc._version as number) ?? 0;
  const newVersion = currentVersion + 1;

  const { id: _id, updatedAt: _ua, _status: _st, _version: _v, ...docFieldData } = doc;
  const updatedAt = new Date().toISOString();

  doc._status = "published";
  doc._version = newVersion;
  doc.updatedAt = updatedAt;

  await ensureGlobalTable(runelayer);
  await ensureGlobalVersionsTable(runelayer);
  await runelayer.database.client.batch(
    [
      {
        sql: `
          INSERT INTO ${quoteIdent(GLOBALS_TABLE)} (slug, data, updatedAt, _status, _version)
          VALUES (?, ?, ?, 'published', ?)
          ON CONFLICT(slug) DO UPDATE SET _status = 'published', _version = excluded._version, updatedAt = excluded.updatedAt
        `,
        args: [global.slug, JSON.stringify(docFieldData), updatedAt, newVersion],
      },
      buildSnapshotStatement(global.slug, newVersion, "published", doc, getUserId(req)),
    ],
    "write",
  );
  if (vc.maxPerDoc > 0) {
    await pruneGlobalVersions(runelayer, global.slug, vc.maxPerDoc);
  }

  return doc;
}

export async function unpublishGlobal(
  runelayer: RunelayerInstance,
  global: GlobalConfig,
  req: Request,
): Promise<Record<string, unknown>> {
  const vc = normalizeVersionConfig(global.versions);
  if (!vc) throw Object.assign(new Error("Versioning is not enabled"), { status: 400 });

  await checkAccess(global.access?.publish ?? global.access?.update, req, undefined, global.slug);

  const row = await readStoredGlobal(runelayer, global.slug);
  const doc = materializeGlobalDoc(global, row);
  const newVersion = ((doc._version as number) ?? 0) + 1;

  const { id: _id, updatedAt: _ua, _status: _st, _version: _v, ...docFieldData } = doc;
  const updatedAt = new Date().toISOString();

  doc._status = "draft";
  doc._version = newVersion;
  doc.updatedAt = updatedAt;

  await ensureGlobalTable(runelayer);
  await ensureGlobalVersionsTable(runelayer);
  await runelayer.database.client.batch(
    [
      {
        sql: `
          INSERT INTO ${quoteIdent(GLOBALS_TABLE)} (slug, data, updatedAt, _status, _version)
          VALUES (?, ?, ?, 'draft', ?)
          ON CONFLICT(slug) DO UPDATE SET _status = 'draft', _version = excluded._version, updatedAt = excluded.updatedAt
        `,
        args: [global.slug, JSON.stringify(docFieldData), updatedAt, newVersion],
      },
      buildSnapshotStatement(global.slug, newVersion, "draft", doc, getUserId(req)),
    ],
    "write",
  );
  if (vc.maxPerDoc > 0) {
    await pruneGlobalVersions(runelayer, global.slug, vc.maxPerDoc);
  }

  return doc;
}

export async function findGlobalVersions(
  runelayer: RunelayerInstance,
  global: GlobalConfig,
  req: Request,
  opts?: { limit?: number; offset?: number },
): Promise<
  Array<{
    id: string;
    _version: number;
    _status: "draft" | "published";
    createdAt: string;
    _createdBy?: string;
  }>
> {
  const vc = normalizeVersionConfig(global.versions);
  if (!vc) throw Object.assign(new Error("Versioning is not enabled"), { status: 400 });

  await checkAccess(global.access?.read, req, undefined, global.slug);
  await ensureGlobalVersionsTable(runelayer);

  let query = `SELECT id, _version, _status, createdAt, _createdBy FROM ${quoteIdent(GLOBAL_VERSIONS_TABLE)} WHERE _globalSlug = ? ORDER BY createdAt DESC`;
  const queryArgs: Array<string | number> = [global.slug];
  if (opts?.limit) {
    query += ` LIMIT ?`;
    queryArgs.push(opts.limit);
  }
  if (opts?.offset) {
    query += ` OFFSET ?`;
    queryArgs.push(opts.offset);
  }

  const result = await runelayer.database.client.execute({ sql: query, args: queryArgs });
  return result.rows.map((row) => {
    const r = row as Record<string, string | number | null | undefined>;
    return {
      id: String(r.id ?? ""),
      _version: Number(r._version),
      _status: (r._status === "published" ? "published" : "draft") as "draft" | "published",
      createdAt: String(r.createdAt ?? ""),
      _createdBy: r._createdBy != null ? String(r._createdBy) : undefined,
    };
  });
}

export async function restoreGlobalVersion(
  runelayer: RunelayerInstance,
  global: GlobalConfig,
  req: Request,
  versionId: string,
): Promise<Record<string, unknown>> {
  const vc = normalizeVersionConfig(global.versions);
  if (!vc) throw Object.assign(new Error("Versioning is not enabled"), { status: 400 });

  await checkAccess(global.access?.update, req, undefined, global.slug);
  await ensureGlobalVersionsTable(runelayer);

  const result = await runelayer.database.client.execute({
    sql: `SELECT _snapshot, _globalSlug FROM ${quoteIdent(GLOBAL_VERSIONS_TABLE)} WHERE id = ? LIMIT 1`,
    args: [versionId],
  });
  const versionRow = result.rows[0] as Record<string, unknown> | undefined;
  if (!versionRow) throw Object.assign(new Error("Version not found"), { status: 404 });
  if (textValue(versionRow._globalSlug) !== global.slug) {
    throw Object.assign(new Error("Version does not belong to this global"), { status: 400 });
  }

  const snapshot = parseGlobalData(versionRow._snapshot);
  // Strip system fields — only restore user data
  const { id: _id, updatedAt: _ua, _status, _version, ...fieldData } = snapshot;

  const row = await readStoredGlobal(runelayer, global.slug);
  const currentVersion = (row?._version as number) ?? 0;
  const newVersion = currentVersion + 1;
  const updatedAt = new Date().toISOString();

  const doc: Record<string, unknown> = {
    id: global.slug,
    ...fieldData,
    updatedAt,
    _status: "draft",
    _version: newVersion,
  };

  await ensureGlobalTable(runelayer);
  await ensureGlobalVersionsTable(runelayer);
  await runelayer.database.client.batch(
    [
      {
        sql: `
          INSERT INTO ${quoteIdent(GLOBALS_TABLE)} (slug, data, updatedAt, _status, _version)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(slug) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt, _status = excluded._status, _version = excluded._version
        `,
        args: [global.slug, JSON.stringify(fieldData), updatedAt, "draft", newVersion],
      },
      buildSnapshotStatement(global.slug, newVersion, "draft", doc, getUserId(req)),
    ],
    "write",
  );
  if (vc.maxPerDoc > 0) {
    await pruneGlobalVersions(runelayer, global.slug, vc.maxPerDoc);
  }

  return doc;
}
