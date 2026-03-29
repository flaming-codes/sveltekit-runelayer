import { runAfterHooks, runBeforeHooks } from "../hooks/runner.js";
import type { HookContext } from "../hooks/types.js";
import type { RunelayerInstance } from "../plugin.js";
import { checkAccess } from "../query/access.js";
import type { GlobalConfig } from "../schema/globals.js";

const GLOBALS_TABLE = "__runelayer_globals";
const globalTableReady = new WeakSet<RunelayerInstance>();

type StoredGlobalRow = {
  data?: unknown;
  updatedAt?: unknown;
};

function quoteIdent(name: string): string {
  return `"${name.replaceAll(`"`, `""`)}"`;
}

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

async function ensureGlobalTable(runelayer: RunelayerInstance): Promise<void> {
  if (globalTableReady.has(runelayer)) return;
  await runelayer.database.client.execute(`
    CREATE TABLE IF NOT EXISTS ${quoteIdent(GLOBALS_TABLE)} (
      slug TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  globalTableReady.add(runelayer);
}

async function readStoredGlobal(
  runelayer: RunelayerInstance,
  slug: string,
): Promise<StoredGlobalRow | null> {
  await ensureGlobalTable(runelayer);
  const result = await runelayer.database.client.execute({
    sql: `SELECT data, updatedAt FROM ${quoteIdent(GLOBALS_TABLE)} WHERE slug = ? LIMIT 1`,
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
  return doc;
}

export async function updateGlobalDocument(
  runelayer: RunelayerInstance,
  global: GlobalConfig,
  req: Request,
  data: Record<string, unknown>,
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
  const nextData = sanitizeData((hc.data as Record<string, unknown> | undefined) ?? incoming);
  const updatedAt = new Date().toISOString();

  await ensureGlobalTable(runelayer);
  await runelayer.database.client.execute({
    sql: `
      INSERT INTO ${quoteIdent(GLOBALS_TABLE)} (slug, data, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(slug)
      DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt
    `,
    args: [global.slug, JSON.stringify(nextData), updatedAt],
  });

  const doc = {
    id: global.slug,
    ...nextData,
    updatedAt,
  };
  await runAfterHooks(global.hooks?.afterChange as Array<(ctx: unknown) => void> | undefined, {
    ...hc,
    doc,
  });
  return doc;
}
