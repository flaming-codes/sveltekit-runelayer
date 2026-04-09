import type { CollectionConfig } from "../schema/collections.js";
import {
  deleteValueAtPath,
  getFieldLayout,
  getValueAtPath,
  type BlocksFieldRule,
  type FieldRule,
} from "../schema/document-shape.js";
import {
  AUTH_SENSITIVE_FIELDS,
  assertValidWritePayload,
  type WriteOperation,
  validateWritePayload as validateSchemaWritePayload,
} from "../schema/validation.js";
import type { AccessFn, FieldAccess } from "../schema/types.js";
import { checkAccess } from "./access.js";
import { httpError } from "./errors.js";

type AccessMode = "create" | "read" | "update";

function getAccessFns(chain: FieldAccess[], mode: AccessMode): AccessFn[] {
  const fns: AccessFn[] = [];
  for (const access of chain) {
    const fn = access[mode];
    if (fn) fns.push(fn);
  }
  return fns;
}

async function assertWritableFieldAccess(
  rule: Pick<FieldRule | BlocksFieldRule, "documentPath" | "accessChain">,
  operation: WriteOperation,
  req: Request | undefined,
  data: Record<string, unknown>,
  id?: string,
): Promise<void> {
  const mode: AccessMode = operation;
  const accessFns = getAccessFns(rule.accessChain, mode);
  for (const fn of accessFns) {
    try {
      await checkAccess(fn, req, data, id);
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && error.status === 403) {
        throw httpError(403, `Forbidden field "${rule.documentPath}"`);
      }
      throw error;
    }
  }
}

async function canReadField(
  rule: Pick<FieldRule | BlocksFieldRule, "accessChain">,
  req: Request | undefined,
  doc: Record<string, unknown>,
): Promise<boolean> {
  const accessFns = getAccessFns(rule.accessChain, "read");
  const id = typeof doc.id === "string" ? doc.id : undefined;
  for (const fn of accessFns) {
    try {
      await checkAccess(fn, req, doc, id);
    } catch (error) {
      if (error && typeof error === "object" && "status" in error && error.status === 403) {
        return false;
      }
      throw error;
    }
  }
  return true;
}

export async function enforceWritePayload(
  collection: CollectionConfig,
  operation: WriteOperation,
  input: unknown,
  req: Request | undefined,
  existingDoc?: Record<string, unknown>,
  id?: string,
  options?: { relaxRequired?: boolean },
): Promise<Record<string, unknown>> {
  const validation = validateSchemaWritePayload(collection.fields, operation, input, {
    existingDoc,
    relaxRequired: options?.relaxRequired,
  });
  const output = assertValidWritePayload(validation);

  const layout = getFieldLayout(collection.fields);

  for (const [storageKey] of Object.entries(output)) {
    const blocksRule = layout.blocksByStorageKey.get(storageKey);
    if (blocksRule) {
      await assertWritableFieldAccess(blocksRule, operation, req, validation.validationData, id);

      // Recurse into each block entry to enforce sub-field access guards.
      const blocksArray = output[storageKey];
      if (Array.isArray(blocksArray)) {
        for (const entry of blocksArray) {
          if (typeof entry !== "object" || entry === null || typeof entry.blockType !== "string") {
            continue;
          }
          const blockConfig = blocksRule.field.blocks.find((b) => b.slug === entry.blockType);
          if (!blockConfig) continue;

          const blockLayout = getFieldLayout(blockConfig.fields);
          for (const subRule of blockLayout.leafRules) {
            await assertWritableFieldAccess(subRule, operation, req, validation.validationData, id);
          }
        }
      }

      continue;
    }

    const rule = layout.byStorageKey.get(storageKey);
    if (!rule) continue;
    await assertWritableFieldAccess(rule, operation, req, validation.validationData, id);
  }

  return output;
}

export async function enforceReadProjection(
  collection: CollectionConfig,
  req: Request | undefined,
  doc: Record<string, unknown> | undefined,
): Promise<Record<string, unknown> | undefined> {
  if (!doc) return undefined;

  const projected = structuredClone(doc) as Record<string, unknown>;

  if (collection.auth) {
    for (const key of AUTH_SENSITIVE_FIELDS) {
      delete projected[key];
    }
  }

  const layout = getFieldLayout(collection.fields);
  for (const rule of layout.leafRules) {
    if (getValueAtPath(doc, rule.pathSegments) === undefined) continue;
    const allowed = await canReadField(rule, req, doc);
    if (!allowed) {
      deleteValueAtPath(projected, rule.pathSegments);
    }
  }

  for (const rule of layout.blocksRules) {
    if (getValueAtPath(doc, rule.pathSegments) === undefined) continue;
    const allowed = await canReadField(rule, req, doc);
    if (!allowed) {
      deleteValueAtPath(projected, rule.pathSegments);
    }
  }

  return projected;
}

export function allowedQueryColumns(collection: CollectionConfig): Set<string> {
  const layout = getFieldLayout(collection.fields);
  const allowed = new Set<string>([
    "id",
    "createdAt",
    "updatedAt",
    ...layout.leafRules.map((rule) => rule.documentPath),
  ]);
  if (collection.versions) {
    allowed.add("_status");
    allowed.add("_version");
  }
  return allowed;
}
