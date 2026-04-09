import type { BlockConfig, Field, NamedField, RefSentinel, SlugField } from "./fields.js";
import {
  DocumentShapeError,
  flattenDocumentFields,
  getFieldLayout,
  getValueAtPath,
  inflateDocumentFields,
  mergeDocumentData,
  type BlocksFieldRule,
  type FieldRule,
} from "./document-shape.js";

export type WriteOperation = "create" | "update";

export interface ValidationIssue {
  path: string;
  message: string;
  code:
    | "invalid"
    | "invalid_type"
    | "required"
    | "reserved"
    | "min"
    | "max"
    | "min_length"
    | "max_length"
    | "custom";
}

export interface WriteValidationOptions {
  existingDoc?: Record<string, unknown>;
  relaxRequired?: boolean;
}

export interface WriteValidationResult {
  output: Record<string, unknown>;
  nextDocument: Record<string, unknown>;
  validationData: Record<string, unknown>;
  issues: ValidationIssue[];
  fieldErrors: Record<string, string[]>;
}

const INVALID_VALUE = Symbol("invalid-value");
const TRUE_STRINGS = new Set(["true", "1", "on", "yes"]);
const FALSE_STRINGS = new Set(["false", "0", "off", "no"]);
const COLLECTION_SLUG_RE = /^[a-z][a-z0-9-]*$/;
type NormalizedValue = null | boolean | number | string | Record<string, unknown> | unknown[];

export const AUTH_SENSITIVE_FIELDS = ["hash", "salt", "token", "tokenExpiry"] as const;
export const RESERVED_WRITE_FIELDS = new Set<string>([
  "id",
  "createdAt",
  "updatedAt",
  "_status",
  "_version",
  ...AUTH_SENSITIVE_FIELDS,
]);

export class WriteValidationError extends Error {
  readonly status = 400;
  readonly issues: ValidationIssue[];
  readonly fieldErrors: Record<string, string[]>;

  constructor(issues: ValidationIssue[]) {
    super(firstValidationIssueMessage(issues));
    this.name = "WriteValidationError";
    this.issues = issues;
    this.fieldErrors = validationIssuesToFieldErrors(issues);
  }
}

export function isWriteValidationError(error: unknown): error is WriteValidationError {
  if (error instanceof WriteValidationError) return true;
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "WriteValidationError" &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown[] }).issues)
  );
}

export function stripReservedWriteFields(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };
  for (const key of RESERVED_WRITE_FIELDS) {
    delete sanitized[key];
  }
  return sanitized;
}

export function validationIssuesToFieldErrors(issues: ValidationIssue[]): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of issues) {
    if (!issue.path) {
      continue;
    }
    const current = fieldErrors[issue.path] ?? [];
    if (!current.includes(issue.message)) {
      fieldErrors[issue.path] = [...current, issue.message];
    }
  }

  return fieldErrors;
}

export function firstValidationIssueMessage(
  issues: ValidationIssue[],
  fallback = "Validation failed.",
): string {
  return issues[0]?.message ?? fallback;
}

function issue(
  issues: ValidationIssue[],
  path: string,
  code: ValidationIssue["code"],
  message: string,
): void {
  issues.push({ path, code, message });
}

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function joinPath(prefix: string, path: string): string {
  if (!prefix) return path;
  if (!path) return prefix;
  return path.startsWith("[") ? `${prefix}${path}` : `${prefix}.${path}`;
}

function toRecord(value: unknown, issues: ValidationIssue[]): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issue(issues, "", "invalid_type", "Expected an object payload");
    return null;
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
    throw new Error(`Field "${fieldName}" must contain valid JSON`);
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
        throw new Error(`Field "${fieldName}" must be an array`);
      }
      return parsed;
    }
    return [value];
  }
  throw new Error(`Field "${fieldName}" must be an array`);
}

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
    throw new Error(
      `Field "${key}" contains an invalid relationship value: expected string ID or sentinel object`,
    );
  };

  if (hasMany) {
    const values = normalizeArray(rawValue, key);
    return values.map((item) => {
      if (Array.isArray(relationTo)) {
        if (!isRefSentinel(item)) {
          throw new Error(
            `Field "${key}" polymorphic relationship requires sentinel object { _ref, _collection }`,
          );
        }
        if (!relationTo.includes(item._collection)) {
          throw new Error(
            `"${key}": _collection "${item._collection}" is not allowed. Must be one of: ${relationTo.join(", ")}`,
          );
        }
        return item;
      }
      return normalize(item, relationTo as string);
    });
  }

  if (Array.isArray(relationTo)) {
    if (!isRefSentinel(rawValue)) {
      throw new Error(
        `Field "${key}" polymorphic relationship requires sentinel object { _ref, _collection }`,
      );
    }
    if (!relationTo.includes(rawValue._collection)) {
      throw new Error(
        `"${key}": _collection "${rawValue._collection}" is not allowed. Must be one of: ${relationTo.join(", ")}`,
      );
    }
    return rawValue;
  }

  return normalize(rawValue, relationTo as string);
}

function normalizeValue(
  field: Field,
  key: string,
  rawValue: unknown,
  issues: ValidationIssue[],
): NormalizedValue | typeof INVALID_VALUE | undefined {
  if (rawValue === undefined) return undefined;
  if (rawValue === null) return null;

  try {
    switch (field.type) {
      case "text":
      case "textarea":
      case "email":
      case "slug":
      case "date":
      case "select":
      case "upload":
        if (typeof rawValue !== "string") {
          throw new Error(`Field "${key}" must be a string`);
        }
        return rawValue;

      case "number":
        if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
          return rawValue;
        }
        if (typeof rawValue === "string" && rawValue.trim().length > 0) {
          const parsed = Number(rawValue);
          if (Number.isFinite(parsed)) {
            return parsed;
          }
        }
        throw new Error(`Field "${key}" must be a number`);

      case "checkbox":
        if (typeof rawValue === "boolean") return rawValue;
        if (typeof rawValue === "number") {
          if (rawValue === 1) return true;
          if (rawValue === 0) return false;
        }
        if (typeof rawValue === "string") {
          if (rawValue === "") return true;
          const normalized = rawValue.trim().toLowerCase();
          if (TRUE_STRINGS.has(normalized)) return true;
          if (FALSE_STRINGS.has(normalized)) return false;
        }
        throw new Error(`Field "${key}" must be a boolean`);

      case "richText":
      case "json":
        if (typeof rawValue === "string") {
          return parseJsonString(rawValue, key) as NormalizedValue;
        }
        if (typeof rawValue === "object") return rawValue as NormalizedValue;
        throw new Error(`Field "${key}" must be JSON`);

      case "multiSelect":
        return normalizeArray(rawValue, key);

      case "relationship":
        return normalizeRelationshipValue(
          rawValue,
          key,
          field.relationTo,
          field.hasMany,
        ) as NormalizedValue;

      default:
        return rawValue as NormalizedValue;
    }
  } catch (error) {
    issue(issues, key, "invalid_type", errorMessage(error, `Validation failed for "${key}"`));
    return INVALID_VALUE;
  }
}

function validateBuiltIn(
  field: Field,
  key: string,
  value: unknown,
  issues: ValidationIssue[],
): void {
  if (value === undefined || value === null) return;

  switch (field.type) {
    case "text":
    case "textarea": {
      if (typeof value !== "string") break;
      if (field.minLength !== undefined && value.length < field.minLength) {
        issue(
          issues,
          key,
          "min_length",
          `Field "${key}" must be at least ${field.minLength} characters`,
        );
      }
      if (field.maxLength !== undefined && value.length > field.maxLength) {
        issue(
          issues,
          key,
          "max_length",
          `Field "${key}" must be at most ${field.maxLength} characters`,
        );
      }
      break;
    }

    case "email": {
      if (typeof value === "string" && value.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          issue(issues, key, "invalid", `Invalid email format for field "${key}"`);
        }
      }
      break;
    }

    case "number":
      if (typeof value !== "number") break;
      if (field.min !== undefined && value < field.min) {
        issue(issues, key, "min", `Field "${key}" must be at least ${field.min}`);
      }
      if (field.max !== undefined && value > field.max) {
        issue(issues, key, "max", `Field "${key}" must be at most ${field.max}`);
      }
      break;

    case "select":
      if (typeof value !== "string") break;
      if (!field.options.some((option) => option.value === value)) {
        issue(issues, key, "invalid", `Field "${key}" contains an invalid option`);
      }
      break;

    case "multiSelect":
      if (!Array.isArray(value)) break;
      for (const entry of value) {
        if (typeof entry !== "string") {
          issue(issues, key, "invalid_type", `Field "${key}" must be an array of strings`);
          continue;
        }
        if (!field.options.some((option) => option.value === entry)) {
          issue(issues, key, "invalid", `Field "${key}" contains an invalid option`);
        }
      }
      break;

    default:
      break;
  }
}

function runCustomValidator(
  rule: FieldRule,
  path: string,
  value: unknown,
  data: Record<string, unknown>,
  issues: ValidationIssue[],
): void {
  if (!("validate" in rule.field) || typeof rule.field.validate !== "function") {
    return;
  }

  try {
    const result = rule.field.validate(value as never, { data });
    if (result !== true) {
      issue(
        issues,
        path,
        "custom",
        typeof result === "string" ? result : `Validation failed for "${path}"`,
      );
    }
  } catch (error) {
    issue(issues, path, "custom", errorMessage(error, `Validation failed for "${path}"`));
  }
}

function runBlocksValidator(
  rule: BlocksFieldRule,
  path: string,
  value: unknown,
  data: Record<string, unknown>,
  issues: ValidationIssue[],
): void {
  if (typeof rule.field.validate !== "function") {
    return;
  }

  try {
    const result = rule.field.validate(value as unknown[], { data });
    if (result !== true) {
      issue(
        issues,
        path,
        "custom",
        typeof result === "string" ? result : `Validation failed for "${path}"`,
      );
    }
  } catch (error) {
    issue(issues, path, "custom", errorMessage(error, `Validation failed for "${path}"`));
  }
}

function validateBlocksField(
  rule: BlocksFieldRule,
  value: unknown,
  operation: WriteOperation,
  existingDoc: Record<string, unknown> | undefined,
  issues: ValidationIssue[],
  options: WriteValidationOptions,
  pathPrefix = "",
): Record<string, unknown>[] | null | typeof INVALID_VALUE {
  const path = joinPath(pathPrefix, rule.documentPath);
  const field = rule.field;

  if (value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    issue(issues, path, "invalid_type", `${path}: must be an array`);
    return INVALID_VALUE;
  }

  if (field.minBlocks !== undefined && value.length < field.minBlocks) {
    issue(issues, path, "min", `Minimum ${field.minBlocks} block(s) required`);
  }
  if (field.maxBlocks !== undefined && value.length > field.maxBlocks) {
    issue(issues, path, "max", `Maximum ${field.maxBlocks} block(s) allowed`);
  }

  return value.map((item, idx) => {
    const blockPath = `${path}[${idx}]`;

    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      issue(issues, blockPath, "invalid_type", `Block at index ${idx}: must be an object`);
      return {};
    }

    const { blockType, _key, ...blockData } = item as Record<string, unknown>;
    if (typeof blockType !== "string") {
      issue(
        issues,
        `${blockPath}.blockType`,
        "required",
        `Block at index ${idx}: missing blockType`,
      );
      return {};
    }

    const blockConfig: BlockConfig | undefined = field.blocks.find(
      (block) => block.slug === blockType,
    );
    if (!blockConfig) {
      issue(
        issues,
        `${blockPath}.blockType`,
        "invalid",
        `Block at index ${idx}: unknown blockType "${blockType}". Allowed: ${field.blocks.map((block) => block.slug).join(", ")}`,
      );
      return { blockType };
    }

    const key = typeof _key === "string" && _key.length > 0 ? _key : crypto.randomUUID();

    let existingBlock: Record<string, unknown> | undefined;
    if (operation === "update" && existingDoc) {
      const existingBlocks = getValueAtPath(existingDoc, rule.pathSegments);
      if (Array.isArray(existingBlocks)) {
        existingBlock = (existingBlocks as Record<string, unknown>[]).find(
          (block) => block._key === key,
        );
        if (existingBlock && existingBlock.blockType !== blockType) {
          issue(
            issues,
            blockPath,
            "invalid",
            `Block with _key "${key}": blockType cannot be changed from "${String(existingBlock.blockType)}" to "${blockType}". Delete the block and add a new one.`,
          );
        }
      }
    }

    const nestedBlockData = inflateDocumentFields(
      blockConfig.fields,
      blockData as Record<string, unknown>,
    );
    const nested = validateFieldSet(
      blockConfig.fields,
      nestedBlockData,
      operation,
      issues,
      {
        ...options,
        existingDoc: existingBlock,
      },
      blockPath,
    );

    return { blockType, _key: key, ...nested.output };
  });
}

function validateFieldSet(
  fields: NamedField[],
  data: Record<string, unknown>,
  operation: WriteOperation,
  issues: ValidationIssue[],
  options: WriteValidationOptions,
  pathPrefix = "",
): Pick<WriteValidationResult, "output" | "nextDocument" | "validationData"> {
  const layout = getFieldLayout(fields);
  const invalidStorageKeys = new Set<string>();

  let flattenedInput: Record<string, unknown>;
  try {
    flattenedInput = flattenDocumentFields(fields, data);
  } catch (error) {
    if (error instanceof DocumentShapeError) {
      issue(issues, error.path ?? "", "invalid", error.message);
      return {
        output: {},
        nextDocument: {},
        validationData: mergeDocumentData(options.existingDoc, {}),
      };
    }
    throw error;
  }

  const output: Record<string, unknown> = {};

  for (const [storageKey, rawValue] of Object.entries(flattenedInput)) {
    const blocksRule = layout.blocksByStorageKey.get(storageKey);
    if (blocksRule) {
      const normalized = validateBlocksField(
        blocksRule,
        rawValue,
        operation,
        options.existingDoc,
        issues,
        options,
        pathPrefix,
      );

      if (normalized === INVALID_VALUE) {
        invalidStorageKeys.add(storageKey);
        continue;
      }

      output[storageKey] = normalized;
      continue;
    }

    const rule = layout.byStorageKey.get(storageKey);
    if (!rule) {
      issue(issues, storageKey, "invalid", `Unknown field "${storageKey}"`);
      invalidStorageKeys.add(storageKey);
      continue;
    }

    const normalized = normalizeValue(
      rule.field,
      joinPath(pathPrefix, rule.documentPath),
      rawValue,
      issues,
    );
    if (normalized === INVALID_VALUE) {
      invalidStorageKeys.add(storageKey);
      continue;
    }

    if (normalized !== undefined) {
      output[storageKey] = normalized;
    }
  }

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
  const validationData = mergeDocumentData(options.existingDoc, nextDocument);
  const keysToValidate =
    operation === "create" ? new Set(layout.byStorageKey.keys()) : new Set(Object.keys(output));

  for (const storageKey of keysToValidate) {
    if (invalidStorageKeys.has(storageKey)) {
      continue;
    }

    const rule = layout.byStorageKey.get(storageKey);
    if (!rule) continue;

    const path = joinPath(pathPrefix, rule.documentPath);
    const value = getValueAtPath(validationData, rule.pathSegments);

    if (
      "required" in rule.field &&
      rule.field.required &&
      !hasValue(value) &&
      !options.relaxRequired
    ) {
      issue(issues, path, "required", `Field "${path}" is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    validateBuiltIn(rule.field, path, value, issues);
    runCustomValidator(rule, path, value, validationData, issues);
  }

  if (operation === "create" && !options.relaxRequired) {
    for (const blocksRule of layout.blocksRules) {
      if (invalidStorageKeys.has(blocksRule.storageKey)) {
        continue;
      }

      const path = joinPath(pathPrefix, blocksRule.documentPath);
      if (
        blocksRule.field.required &&
        !hasValue(getValueAtPath(validationData, blocksRule.pathSegments))
      ) {
        issue(issues, path, "required", `Field "${path}" is required`);
      }
    }
  }

  for (const [storageKey, value] of Object.entries(output)) {
    const blocksRule = layout.blocksByStorageKey.get(storageKey);
    if (!blocksRule) {
      continue;
    }
    runBlocksValidator(
      blocksRule,
      joinPath(pathPrefix, blocksRule.documentPath),
      value,
      validationData,
      issues,
    );
  }

  return { output, nextDocument, validationData };
}

export function validateWritePayload(
  fields: NamedField[],
  operation: WriteOperation,
  input: unknown,
  options: WriteValidationOptions = {},
): WriteValidationResult {
  const issues: ValidationIssue[] = [];
  const payload = toRecord(input, issues);

  if (!payload) {
    return {
      output: {},
      nextDocument: {},
      validationData: mergeDocumentData(options.existingDoc, {}),
      issues,
      fieldErrors: validationIssuesToFieldErrors(issues),
    };
  }

  for (const key of Object.keys(payload)) {
    if (RESERVED_WRITE_FIELDS.has(key)) {
      issue(issues, key, "reserved", `Field "${key}" is reserved and cannot be written`);
    }
  }

  const sanitized = stripReservedWriteFields(payload);
  const result = validateFieldSet(fields, sanitized, operation, issues, options);

  return {
    ...result,
    issues,
    fieldErrors: validationIssuesToFieldErrors(issues),
  };
}

export function assertValidWritePayload(result: WriteValidationResult): Record<string, unknown> {
  if (result.issues.length > 0) {
    throw new WriteValidationError(result.issues);
  }
  return result.output;
}
