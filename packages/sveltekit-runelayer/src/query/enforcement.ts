import type { CollectionConfig } from "../schema/collections.js";
import type { Field, NamedField } from "../schema/fields.js";
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
      case "array":
        break;
      case "relationship":
        if (!field.hasMany) {
          rules.push({ key, field, accessChain: nextAccessChain });
        }
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
      if (field.hasMany) {
        const values = normalizeArray(rawValue, key);
        if (!values.every((entry) => typeof entry === "string")) {
          throw httpError(400, `Field "${key}" must be an array of IDs`);
        }
        return values;
      }
      if (typeof rawValue !== "string") {
        throw httpError(400, `Field "${key}" must be a relationship ID`);
      }
      return rawValue;

    case "array":
      return normalizeArray(rawValue, key);

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

    case "array":
      if (!Array.isArray(value)) break;
      if (field.minRows !== undefined && value.length < field.minRows) {
        throw httpError(400, `Field "${key}" must include at least ${field.minRows} rows`);
      }
      if (field.maxRows !== undefined && value.length > field.maxRows) {
        throw httpError(400, `Field "${key}" must include at most ${field.maxRows} rows`);
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

  for (const [key, rawValue] of Object.entries(payload)) {
    if (RESERVED_WRITE_FIELDS.has(key)) {
      throw httpError(400, `Field "${key}" is reserved and cannot be written`);
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
