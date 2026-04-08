import type { CollectionConfig } from "../schema/collections.js";
import type { BlockConfig, Field, NamedField, RefSentinel, SlugField } from "../schema/fields.js";
import {
  deleteValueAtPath,
  DocumentShapeError,
  flattenDocumentFields,
  getFieldLayout,
  getValueAtPath,
  inflateDocumentFields,
  mergeDocumentData,
  type BlocksFieldRule,
  type FieldRule,
} from "../schema/document-shape.js";
import type { AccessFn, FieldAccess } from "../schema/types.js";
import { checkAccess } from "./access.js";
import { httpError } from "./errors.js";

type WriteOperation = "create" | "update";
type AccessMode = "create" | "read" | "update";

const TRUE_STRINGS = new Set(["true", "1", "on", "yes"]);
const FALSE_STRINGS = new Set(["false", "0", "off", "no"]);

export const AUTH_SENSITIVE_FIELDS = ["hash", "salt", "token", "tokenExpiry"] as const;
export const RESERVED_WRITE_FIELDS = new Set<string>([
  "id",
  "createdAt",
  "updatedAt",
  "_status",
  "_version",
  ...AUTH_SENSITIVE_FIELDS,
]);

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw httpError(400, "Expected an object payload");
  }
  return value as Record<string, unknown>;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveDefault(field: Field): unknown {
  if (!("defaultValue" in field)) return undefined;
  return field.defaultValue;
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function parseJsonString(value: string, fieldName: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw httpError(400, `Field "${fieldName}" must contain valid JSON`);
  }
}

function normalizeArray(value: unknown, fieldName: string): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) return [];
    if (trimmed.startsWith("[")) {
      const parsed = parseJsonString(trimmed, fieldName);
      if (!Array.isArray(parsed)) {
        throw httpError(400, `Field "${fieldName}" must be an array`);
      }
      return parsed;
    }
    return [value];
  }
  throw httpError(400, `Field "${fieldName}" must be an array`);
}

const COLLECTION_SLUG_RE = /^[a-z][a-z0-9-]*$/;

function isRefSentinel(val: unknown): val is RefSentinel {
  return (
    typeof val === "object" &&
    val !== null &&
    "_ref" in val &&
    "_collection" in val &&
    typeof (val as RefSentinel)._ref === "string" &&
    (val as RefSentinel)._ref.length > 0 &&
    typeof (val as RefSentinel)._collection === "string" &&
    COLLECTION_SLUG_RE.test((val as RefSentinel)._collection)
  );
}

function normalizeRelationshipValue(
  rawValue: unknown,
  key: string,
  relationTo: string | string[],
  hasMany: boolean | undefined,
): unknown {
  const normalize = (val: unknown, collection: string): RefSentinel => {
    if (typeof val === "string") {
      return { _ref: val, _collection: collection };
    }
    if (isRefSentinel(val)) {
      return val;
    }
    throw httpError(
      400,
      `Field "${key}" contains an invalid relationship value: expected string ID or sentinel object`,
    );
  };

  if (hasMany) {
    const values = normalizeArray(rawValue, key);
    return values.map((item) => {
      if (Array.isArray(relationTo)) {
        if (!isRefSentinel(item)) {
          throw httpError(
            400,
            `Field "${key}" polymorphic relationship requires sentinel object { _ref, _collection }`,
          );
        }
        if (!relationTo.includes(item._collection)) {
          throw httpError(
            400,
            `"${key}": _collection "${item._collection}" is not allowed. Must be one of: ${relationTo.join(", ")}`,
          );
        }
        return item;
      }
      return normalize(item, relationTo as string);
    });
  } else {
    if (Array.isArray(relationTo)) {
      if (!isRefSentinel(rawValue)) {
        throw httpError(
          400,
          `Field "${key}" polymorphic relationship requires sentinel object { _ref, _collection }`,
        );
      }
      if (!relationTo.includes(rawValue._collection)) {
        throw httpError(
          400,
          `"${key}": _collection "${rawValue._collection}" is not allowed. Must be one of: ${relationTo.join(", ")}`,
        );
      }
      return rawValue;
    }
    return normalize(rawValue, relationTo as string);
  }
}

function normalizeValue(field: Field, key: string, rawValue: unknown): unknown {
  if (rawValue === undefined) return undefined;
  if (rawValue === null) return null;

  switch (field.type) {
    case "text":
    case "textarea":
    case "email":
    case "slug":
    case "date":
    case "select":
    case "upload":
      if (typeof rawValue !== "string") {
        throw httpError(400, `Field "${key}" must be a string`);
      }
      return rawValue;

    case "number":
      if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        return rawValue;
      }
      if (typeof rawValue === "string" && rawValue.trim().length > 0) {
        const parsed = Number(rawValue);
        if (Number.isFinite(parsed)) return parsed;
      }
      throw httpError(400, `Field "${key}" must be a number`);

    case "checkbox":
      if (typeof rawValue === "boolean") return rawValue;
      if (typeof rawValue === "number") {
        if (rawValue === 1) return true;
        if (rawValue === 0) return false;
      }
      if (typeof rawValue === "string") {
        // HTML form checkboxes submit "" or "on" when checked; presence alone means true
        if (rawValue === "") return true;
        const normalized = rawValue.trim().toLowerCase();
        if (TRUE_STRINGS.has(normalized)) return true;
        if (FALSE_STRINGS.has(normalized)) return false;
      }
      throw httpError(400, `Field "${key}" must be a boolean`);

    case "richText":
    case "json":
      if (typeof rawValue === "string") {
        return parseJsonString(rawValue, key);
      }
      if (typeof rawValue === "object") return rawValue;
      throw httpError(400, `Field "${key}" must be JSON`);

    case "multiSelect":
      return normalizeArray(rawValue, key);

    case "relationship":
      return normalizeRelationshipValue(rawValue, key, field.relationTo, field.hasMany);

    default:
      return rawValue;
  }
}

function validateBuiltIn(field: Field, key: string, value: unknown): void {
  if (value === undefined || value === null) return;

  switch (field.type) {
    case "text":
    case "textarea": {
      if (typeof value !== "string") break;
      if (field.minLength !== undefined && value.length < field.minLength) {
        throw httpError(400, `Field "${key}" must be at least ${field.minLength} characters`);
      }
      if (field.maxLength !== undefined && value.length > field.maxLength) {
        throw httpError(400, `Field "${key}" must be at most ${field.maxLength} characters`);
      }
      break;
    }

    case "email": {
      if (typeof value === "string" && value.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw httpError(400, `Invalid email format for field "${key}"`);
        }
      }
      break;
    }

    case "number":
      if (typeof value !== "number") break;
      if (field.min !== undefined && value < field.min) {
        throw httpError(400, `Field "${key}" must be at least ${field.min}`);
      }
      if (field.max !== undefined && value > field.max) {
        throw httpError(400, `Field "${key}" must be at most ${field.max}`);
      }
      break;

    case "select":
      if (typeof value !== "string") break;
      if (!field.options.some((option) => option.value === value)) {
        throw httpError(400, `Field "${key}" contains an invalid option`);
      }
      break;

    case "multiSelect":
      if (!Array.isArray(value)) break;
      for (const entry of value) {
        if (typeof entry !== "string") {
          throw httpError(400, `Field "${key}" must be an array of strings`);
        }
        if (!field.options.some((option) => option.value === entry)) {
          throw httpError(400, `Field "${key}" contains an invalid option`);
        }
      }
      break;

    default:
      break;
  }
}

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

function runCustomValidator(rule: FieldRule, value: unknown, data: Record<string, unknown>): void {
  if (!("validate" in rule.field) || typeof rule.field.validate !== "function") {
    return;
  }
  const result = rule.field.validate(value as never, { data });
  if (result !== true) {
    throw httpError(400, result);
  }
}

async function enforceFieldSet(
  fields: NamedField[],
  data: Record<string, unknown>,
  operation: WriteOperation,
  req: Request | undefined,
  existingDoc: Record<string, unknown> | undefined,
  id?: string,
  options?: { relaxRequired?: boolean },
): Promise<Record<string, unknown>> {
  const layout = getFieldLayout(fields);

  let flattenedInput: Record<string, unknown>;
  try {
    flattenedInput = flattenDocumentFields(fields, data);
  } catch (error) {
    if (error instanceof DocumentShapeError) {
      throw httpError(400, error.message);
    }
    throw error;
  }

  const output: Record<string, unknown> = {};

  for (const [storageKey, rawValue] of Object.entries(flattenedInput)) {
    const blocksRule = layout.blocksByStorageKey.get(storageKey);
    if (blocksRule) {
      output[storageKey] = await enforceBlocksField(
        blocksRule,
        rawValue,
        operation,
        req,
        existingDoc,
      );
      continue;
    }

    const rule = layout.byStorageKey.get(storageKey);
    if (!rule) {
      throw httpError(400, `Unknown field "${storageKey}"`);
    }

    const normalized = normalizeValue(rule.field, rule.documentPath, rawValue);
    if (normalized !== undefined) {
      output[storageKey] = normalized;
    }
  }

  // Apply defaultValue and slug derivation on create.
  if (operation === "create") {
    for (const [storageKey, rule] of layout.byStorageKey.entries()) {
      if (output[storageKey] === undefined || output[storageKey] === null) {
        const defaultVal = resolveDefault(rule.field);
        if (defaultVal !== undefined) {
          output[storageKey] = defaultVal;
        }
      }
      if (
        rule.field.type === "slug" &&
        !hasValue(output[storageKey]) &&
        (rule.field as SlugField).from
      ) {
        const sourceField = (rule.field as SlugField).from;
        // Look up the source field's storage key
        for (const [srcKey, srcRule] of layout.byStorageKey.entries()) {
          if (srcRule.documentPath === sourceField || srcKey === sourceField) {
            const sourceValue = output[srcKey];
            if (typeof sourceValue === "string" && sourceValue.trim().length > 0) {
              output[storageKey] = slugify(sourceValue);
            }
            break;
          }
        }
      }
    }
  }

  const nextDocument = inflateDocumentFields(fields, output);
  const validationData = mergeDocumentData(existingDoc, nextDocument);
  const keysToValidate =
    operation === "create" ? new Set(layout.byStorageKey.keys()) : new Set(Object.keys(output));

  for (const storageKey of keysToValidate) {
    const rule = layout.byStorageKey.get(storageKey);
    if (!rule) continue;

    const value = getValueAtPath(validationData, rule.pathSegments);
    if (
      "required" in rule.field &&
      rule.field.required &&
      !hasValue(value) &&
      !options?.relaxRequired
    ) {
      throw httpError(400, `Field "${rule.documentPath}" is required`);
    }

    if (value === undefined || value === null) continue;

    validateBuiltIn(rule.field, rule.documentPath, value);
    runCustomValidator(rule, value, validationData);
  }

  if (operation === "create" && !options?.relaxRequired) {
    for (const rule of layout.blocksRules) {
      if (rule.field.required && !hasValue(getValueAtPath(validationData, rule.pathSegments))) {
        throw httpError(400, `Field "${rule.documentPath}" is required`);
      }
    }
  }

  for (const [storageKey, value] of Object.entries(output)) {
    const blocksRule = layout.blocksByStorageKey.get(storageKey);
    if (blocksRule) {
      if (blocksRule.field.validate) {
        const result = blocksRule.field.validate(value as unknown[], {
          data: validationData,
        });
        if (result !== true) {
          throw httpError(
            400,
            typeof result === "string"
              ? result
              : `Validation failed for "${blocksRule.documentPath}"`,
          );
        }
      }

      await assertWritableFieldAccess(blocksRule, operation, req, validationData, id);
      continue;
    }

    const rule = layout.byStorageKey.get(storageKey);
    if (!rule) continue;
    await assertWritableFieldAccess(rule, operation, req, validationData, id);
  }

  return output;
}

async function enforceBlocksField(
  rule: BlocksFieldRule,
  value: unknown,
  operation: WriteOperation,
  req: Request | undefined,
  existingDoc: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>[] | null> {
  const field = rule.field;

  if (value === null) {
    return null;
  }

  // 1. Must be an array
  if (!Array.isArray(value)) {
    throw httpError(400, `${rule.documentPath}: must be an array`);
  }

  // 2. minBlocks / maxBlocks
  if (field.minBlocks !== undefined && value.length < field.minBlocks) {
    throw httpError(400, `Minimum ${field.minBlocks} block(s) required`);
  }
  if (field.maxBlocks !== undefined && value.length > field.maxBlocks) {
    throw httpError(400, `Maximum ${field.maxBlocks} block(s) allowed`);
  }

  // 3. For each block instance
  return Promise.all(
    value.map(async (item, idx) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        throw httpError(400, `Block at index ${idx}: must be an object`);
      }

      // 3a. blockType must be a string matching one of field.blocks[].slug
      const { blockType, _key, ...blockData } = item as Record<string, unknown>;
      if (typeof blockType !== "string") {
        throw httpError(400, `Block at index ${idx}: missing blockType`);
      }
      const blockConfig: BlockConfig | undefined = field.blocks.find((b) => b.slug === blockType);
      if (!blockConfig) {
        throw httpError(
          400,
          `Block at index ${idx}: unknown blockType "${blockType}". Allowed: ${field.blocks.map((b) => b.slug).join(", ")}`,
        );
      }

      // 3b. _key: preserve existing, generate if absent
      const key = typeof _key === "string" && _key.length > 0 ? _key : crypto.randomUUID();

      // 3c. blockType immutability: on update, reject if blockType changed for an existing block
      let existingBlock: Record<string, unknown> | undefined;
      if (operation === "update" && existingDoc) {
        const existingBlocks = getValueAtPath(existingDoc, rule.pathSegments);
        if (Array.isArray(existingBlocks)) {
          existingBlock = (existingBlocks as Record<string, unknown>[]).find((b) => b._key === key);
          if (existingBlock && existingBlock.blockType !== blockType) {
            throw httpError(
              400,
              `Block with _key "${key}": blockType cannot be changed from "${String(existingBlock.blockType)}" to "${blockType}". Delete the block and add a new one.`,
            );
          }
        }
      }

      // 3d. Enforce block's sub-fields
      const nestedBlockData = inflateDocumentFields(
        blockConfig.fields,
        blockData as Record<string, unknown>,
      );
      const enforced = await enforceFieldSet(
        blockConfig.fields,
        nestedBlockData,
        operation,
        req,
        existingBlock,
      );

      return { blockType, _key: key, ...enforced };
    }),
  );
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
  const payload = toRecord(input);
  for (const key of Object.keys(payload)) {
    if (RESERVED_WRITE_FIELDS.has(key)) {
      throw httpError(400, `Field "${key}" is reserved and cannot be written`);
    }
  }

  return enforceFieldSet(collection.fields, payload, operation, req, existingDoc, id, options);
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
