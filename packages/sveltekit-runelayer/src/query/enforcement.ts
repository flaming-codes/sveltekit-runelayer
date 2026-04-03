import type { CollectionConfig } from "../schema/collections.js";
import type { BlockConfig, BlocksField, Field, NamedField, RefSentinel } from "../schema/fields.js";
import type { AccessFn, FieldAccess } from "../schema/types.js";
import { checkAccess } from "./access.js";

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

interface RuntimeFieldRule {
  key: string;
  field: NamedField;
  accessChain: FieldAccess[];
}

function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw httpError(400, "Expected an object payload");
  }
  return value as Record<string, unknown>;
}

function withAccessChain(accessChain: FieldAccess[], field: Field): FieldAccess[] {
  if ("access" in field && field.access) {
    return [...accessChain, field.access];
  }
  return accessChain;
}

function collectRuntimeFieldRules(
  fields: NamedField[],
  prefix = "",
  accessChain: FieldAccess[] = [],
): RuntimeFieldRule[] {
  const rules: RuntimeFieldRule[] = [];

  for (const field of fields) {
    const nextAccessChain = withAccessChain(accessChain, field);
    const key = `${prefix}${field.name}`;

    switch (field.type) {
      case "group":
        rules.push(...collectRuntimeFieldRules(field.fields, `${key}_`, nextAccessChain));
        break;
      case "row":
      case "collapsible":
        rules.push(...collectRuntimeFieldRules(field.fields, prefix, nextAccessChain));
        break;
      case "blocks":
        break;
      case "relationship":
        rules.push({ key, field, accessChain: nextAccessChain });
        break;
      default:
        rules.push({ key, field, accessChain: nextAccessChain });
        break;
    }
  }

  return rules;
}

function runtimeFieldMap(collection: CollectionConfig): Map<string, RuntimeFieldRule> {
  const rules = collectRuntimeFieldRules(collection.fields);
  return new Map(rules.map((rule) => [rule.key, rule]));
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
  rule: RuntimeFieldRule,
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
        throw httpError(403, `Forbidden field "${rule.key}"`);
      }
      throw error;
    }
  }
}

async function canReadField(
  rule: RuntimeFieldRule,
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

function runCustomValidator(
  rule: RuntimeFieldRule,
  value: unknown,
  data: Record<string, unknown>,
): void {
  if (!("validate" in rule.field) || typeof rule.field.validate !== "function") {
    return;
  }
  const result = rule.field.validate(value as never, { data });
  if (result !== true) {
    throw httpError(400, result);
  }
}

/**
 * Enforce per-field normalization and built-in validation for a list of named fields.
 * Used for both top-level collection fields (via enforceWritePayload) and block sub-fields.
 * Does NOT apply required-field checks, access control, or reserved-field guards —
 * those are handled at the top-level enforceWritePayload layer only.
 */
async function enforceSubFields(
  fields: NamedField[],
  data: Record<string, unknown>,
  operation: WriteOperation,
  req: Request | undefined,
  existingDoc: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>> {
  const allowedKeys = new Set<string>();
  // Collect top-level keys from the block's field config (no prefix for sub-fields)
  for (const field of fields) {
    if (field.type !== "group" && field.type !== "row" && field.type !== "collapsible") {
      allowedKeys.add(field.name);
    } else if (field.type === "group") {
      // group fields are prefixed — for sub-field enforcement flatten them
      for (const subField of field.fields) {
        allowedKeys.add(`${field.name}_${subField.name}`);
      }
    } else {
      // row/collapsible: inline fields
      for (const subField of field.fields) {
        allowedKeys.add(subField.name);
      }
    }
  }

  const output: Record<string, unknown> = {};

  // Build a flat map of field name → NamedField for lookup
  const fieldMap = new Map<string, NamedField>();
  function populateFieldMap(namedFields: NamedField[], prefix = ""): void {
    for (const f of namedFields) {
      if (f.type === "group") {
        populateFieldMap(f.fields, `${prefix}${f.name}_`);
      } else if (f.type === "row" || f.type === "collapsible") {
        populateFieldMap(f.fields, prefix);
      } else {
        fieldMap.set(`${prefix}${f.name}`, f);
      }
    }
  }
  populateFieldMap(fields);

  for (const [key, rawValue] of Object.entries(data)) {
    if (!fieldMap.has(key)) {
      // Skip unknown sub-field keys silently (or throw — match top-level behavior)
      throw httpError(400, `Unknown field "${key}" in block`);
    }
    const field = fieldMap.get(key)!;

    if (field.type === "blocks") {
      // Nested blocks are not supported; this guard is belt-and-suspenders
      throw httpError(400, `Nested blocks fields are not supported`);
    }

    const normalized = normalizeValue(field, key, rawValue);
    if (normalized !== undefined) {
      output[key] = normalized;
    }
  }

  // Validate values that are present
  const validationData = existingDoc ? { ...existingDoc, ...output } : { ...output };

  for (const [key, value] of Object.entries(output)) {
    const field = fieldMap.get(key);
    if (!field) continue;
    if (value === undefined || value === null) continue;

    validateBuiltIn(field, key, value);

    // Run custom validator if present
    if ("validate" in field && typeof field.validate === "function") {
      const result = (
        field.validate as (v: unknown, ctx: { data: Record<string, unknown> }) => true | string
      )(value as never, { data: validationData });
      if (result !== true) {
        throw httpError(400, result);
      }
    }
  }

  // Required field checks for block sub-fields on create
  if (operation === "create") {
    for (const [key, field] of fieldMap.entries()) {
      if ("required" in field && field.required && !hasValue(output[key])) {
        throw httpError(400, `Field "${key}" is required`);
      }
    }
  }

  return output;
}

async function enforceBlocksField(
  field: BlocksField,
  fieldKey: string,
  value: unknown,
  operation: WriteOperation,
  req: Request | undefined,
  existingDoc: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>[]> {
  // 1. Must be an array
  if (!Array.isArray(value)) {
    throw httpError(400, `${fieldKey}: must be an array`);
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
      if (operation === "update" && existingDoc) {
        const existingBlocks = existingDoc[fieldKey];
        if (Array.isArray(existingBlocks)) {
          const existingBlock = (existingBlocks as Record<string, unknown>[]).find(
            (b) => b._key === key,
          );
          if (existingBlock && existingBlock.blockType !== blockType) {
            throw httpError(
              400,
              `Block with _key "${key}": blockType cannot be changed from "${String(existingBlock.blockType)}" to "${blockType}". Delete the block and add a new one.`,
            );
          }
        }
      }

      // 3d. Enforce block's sub-fields
      const enforced = await enforceSubFields(
        blockConfig.fields,
        blockData,
        operation,
        req,
        existingDoc,
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
  const fields = runtimeFieldMap(collection);
  const output: Record<string, unknown> = {};

  // Build a map of blocks fields for direct lookup
  const blocksFieldMap = new Map<string, BlocksField>();
  function collectBlocksFields(namedFields: NamedField[], prefix = ""): void {
    for (const f of namedFields) {
      if (f.type === "blocks") {
        blocksFieldMap.set(`${prefix}${f.name}`, f as BlocksField);
      } else if (f.type === "group") {
        collectBlocksFields(f.fields, `${prefix}${f.name}_`);
      } else if (f.type === "row" || f.type === "collapsible") {
        collectBlocksFields(f.fields, prefix);
      }
    }
  }
  collectBlocksFields(collection.fields);

  for (const [key, rawValue] of Object.entries(payload)) {
    if (RESERVED_WRITE_FIELDS.has(key)) {
      throw httpError(400, `Field "${key}" is reserved and cannot be written`);
    }

    // Handle blocks fields separately
    const blocksField = blocksFieldMap.get(key);
    if (blocksField) {
      const enforced = await enforceBlocksField(
        blocksField,
        key,
        rawValue,
        operation,
        req,
        existingDoc,
      );
      output[key] = enforced;

      // Run field-level custom validate if present
      if (blocksField.validate) {
        const result = blocksField.validate(enforced as unknown as unknown[], { data: output });
        if (result !== true) {
          throw httpError(
            400,
            typeof result === "string" ? result : `Validation failed for "${key}"`,
          );
        }
      }
      continue;
    }

    const rule = fields.get(key);
    if (!rule) {
      throw httpError(400, `Unknown field "${key}"`);
    }

    const normalized = normalizeValue(rule.field, key, rawValue);
    if (normalized !== undefined) {
      output[key] = normalized;
    }
  }

  const validationData = existingDoc ? { ...existingDoc, ...output } : { ...output };
  const keysToValidate =
    operation === "create" ? new Set(fields.keys()) : new Set(Object.keys(output));

  for (const key of keysToValidate) {
    const rule = fields.get(key);
    if (!rule) continue;
    const value = validationData[key];

    if (
      "required" in rule.field &&
      rule.field.required &&
      !hasValue(value) &&
      !options?.relaxRequired
    ) {
      throw httpError(400, `Field "${key}" is required`);
    }
    if (value === undefined || value === null) continue;

    validateBuiltIn(rule.field, key, value);
    runCustomValidator(rule, value, validationData);
  }

  // Also check required blocks fields
  if (operation === "create" && !options?.relaxRequired) {
    for (const [key, blocksField] of blocksFieldMap.entries()) {
      if (blocksField.required && !hasValue(output[key])) {
        throw httpError(400, `Field "${key}" is required`);
      }
    }
  }

  for (const [key] of Object.entries(output)) {
    const rule = fields.get(key);
    if (!rule) continue;
    await assertWritableFieldAccess(rule, operation, req, validationData, id);
  }

  return output;
}

export async function enforceReadProjection(
  collection: CollectionConfig,
  req: Request | undefined,
  doc: Record<string, unknown> | undefined,
): Promise<Record<string, unknown> | undefined> {
  if (!doc) return undefined;

  const projected: Record<string, unknown> = { ...doc };

  if (collection.auth) {
    for (const key of AUTH_SENSITIVE_FIELDS) {
      delete projected[key];
    }
  }

  const fields = runtimeFieldMap(collection);
  for (const [key, rule] of fields.entries()) {
    if (!(key in projected)) continue;
    const allowed = await canReadField(rule, req, doc);
    if (!allowed) {
      delete projected[key];
    }
  }

  return projected;
}

export function allowedQueryColumns(collection: CollectionConfig): Set<string> {
  const fields = runtimeFieldMap(collection);
  const allowed = new Set<string>(["id", "createdAt", "updatedAt", ...fields.keys()]);
  if (collection.versions) {
    allowed.add("_status");
    allowed.add("_version");
  }
  return allowed;
}
