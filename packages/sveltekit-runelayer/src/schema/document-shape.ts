import type { BlocksField, Field, NamedField } from "./fields.js";
import type { FieldAccess } from "./types.js";

export class DocumentShapeError extends Error {}

export class FieldStorageCollisionError extends Error {}

export interface FieldRule {
  documentPath: string;
  pathSegments: string[];
  storageKey: string;
  field: NamedField;
  accessChain: FieldAccess[];
}

export interface BlocksFieldRule {
  documentPath: string;
  pathSegments: string[];
  storageKey: string;
  field: NamedField & BlocksField;
  accessChain: FieldAccess[];
}

export interface FieldLayout {
  leafRules: FieldRule[];
  blocksRules: BlocksFieldRule[];
  byDocumentPath: Map<string, FieldRule>;
  byStorageKey: Map<string, FieldRule>;
  blocksByDocumentPath: Map<string, BlocksFieldRule>;
  blocksByStorageKey: Map<string, BlocksFieldRule>;
}

const layoutCache = new WeakMap<NamedField[], FieldLayout>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function joinPath(prefix: string, name: string): string {
  return prefix ? `${prefix}.${name}` : name;
}

function withAccessChain(accessChain: FieldAccess[], field: Field): FieldAccess[] {
  if ("access" in field && field.access) {
    return [...accessChain, field.access];
  }
  return accessChain;
}

function assertUniquePath(
  documentPath: string,
  storageKey: string,
  existingDocumentPath: string | undefined,
  existingStoragePath: string | undefined,
): void {
  if (existingDocumentPath) {
    throw new FieldStorageCollisionError(
      `Document path collision: "${documentPath}" conflicts with "${existingDocumentPath}"`,
    );
  }

  if (existingStoragePath) {
    throw new FieldStorageCollisionError(
      `Storage key collision: "${storageKey}" is produced by both "${existingStoragePath}" and "${documentPath}"`,
    );
  }
}

function buildFieldLayout(
  fields: NamedField[],
  layout: FieldLayout,
  documentPrefix = "",
  storagePrefix = "",
  accessChain: FieldAccess[] = [],
): void {
  for (const field of fields) {
    const nextAccessChain = withAccessChain(accessChain, field);
    const documentPath = joinPath(documentPrefix, field.name);
    const storageKey = `${storagePrefix}${field.name}`;

    switch (field.type) {
      case "group":
        buildFieldLayout(field.fields, layout, documentPath, `${storageKey}_`, nextAccessChain);
        break;

      case "row":
      case "collapsible":
        buildFieldLayout(field.fields, layout, documentPrefix, storagePrefix, nextAccessChain);
        break;

      case "blocks": {
        assertUniquePath(
          documentPath,
          storageKey,
          layout.blocksByDocumentPath.get(documentPath)?.documentPath ??
            layout.byDocumentPath.get(documentPath)?.documentPath,
          layout.blocksByStorageKey.get(storageKey)?.documentPath ??
            layout.byStorageKey.get(storageKey)?.documentPath,
        );

        const rule: BlocksFieldRule = {
          documentPath,
          pathSegments: documentPath.split("."),
          storageKey,
          field: field as NamedField & BlocksField,
          accessChain: nextAccessChain,
        };

        layout.blocksRules.push(rule);
        layout.blocksByDocumentPath.set(documentPath, rule);
        layout.blocksByStorageKey.set(storageKey, rule);
        break;
      }

      default: {
        assertUniquePath(
          documentPath,
          storageKey,
          layout.byDocumentPath.get(documentPath)?.documentPath ??
            layout.blocksByDocumentPath.get(documentPath)?.documentPath,
          layout.byStorageKey.get(storageKey)?.documentPath ??
            layout.blocksByStorageKey.get(storageKey)?.documentPath,
        );

        const rule: FieldRule = {
          documentPath,
          pathSegments: documentPath.split("."),
          storageKey,
          field,
          accessChain: nextAccessChain,
        };

        layout.leafRules.push(rule);
        layout.byDocumentPath.set(documentPath, rule);
        layout.byStorageKey.set(storageKey, rule);
        break;
      }
    }
  }
}

export function getFieldLayout(fields: NamedField[]): FieldLayout {
  const cached = layoutCache.get(fields);
  if (cached) {
    return cached;
  }

  const layout: FieldLayout = {
    leafRules: [],
    blocksRules: [],
    byDocumentPath: new Map<string, FieldRule>(),
    byStorageKey: new Map<string, FieldRule>(),
    blocksByDocumentPath: new Map<string, BlocksFieldRule>(),
    blocksByStorageKey: new Map<string, BlocksFieldRule>(),
  };

  buildFieldLayout(fields, layout);
  layoutCache.set(fields, layout);
  return layout;
}

function clearFieldScope(
  fields: NamedField[],
  output: Record<string, unknown>,
  storagePrefix = "",
): void {
  for (const field of fields) {
    const storageKey = `${storagePrefix}${field.name}`;

    switch (field.type) {
      case "group":
        clearFieldScope(field.fields, output, `${storageKey}_`);
        break;
      case "row":
      case "collapsible":
        clearFieldScope(field.fields, output, storagePrefix);
        break;
      default:
        output[storageKey] = null;
        break;
    }
  }
}

function flattenFields(
  fields: NamedField[],
  source: Record<string, unknown>,
  output: Record<string, unknown>,
  documentPrefix = "",
  storagePrefix = "",
): Set<string> {
  const consumed = new Set<string>();

  for (const field of fields) {
    const documentPath = joinPath(documentPrefix, field.name);
    const storageKey = `${storagePrefix}${field.name}`;

    switch (field.type) {
      case "group": {
        if (!(field.name in source)) {
          break;
        }

        consumed.add(field.name);
        const value = source[field.name];

        if (value === null) {
          clearFieldScope(field.fields, output, `${storageKey}_`);
          break;
        }

        if (!isRecord(value)) {
          throw new DocumentShapeError(`Field "${documentPath}" must be an object`);
        }

        flattenFields(field.fields, value, output, documentPath, `${storageKey}_`);
        break;
      }

      case "row":
      case "collapsible": {
        const inlineConsumed = flattenFields(
          field.fields,
          source,
          output,
          documentPrefix,
          storagePrefix,
        );
        for (const key of inlineConsumed) {
          consumed.add(key);
        }
        break;
      }

      case "blocks": {
        if (!(field.name in source)) {
          break;
        }

        consumed.add(field.name);
        output[storageKey] = flattenBlocksValue(field, source[field.name], documentPath);
        break;
      }

      default:
        if (field.name in source) {
          consumed.add(field.name);
          output[storageKey] = source[field.name];
        }
        break;
    }
  }

  for (const key of Object.keys(source)) {
    if (!consumed.has(key)) {
      const documentPath = joinPath(documentPrefix, key);
      throw new DocumentShapeError(`Unknown field "${documentPath}"`);
    }
  }

  return consumed;
}

function flattenBlocksValue(
  field: NamedField & BlocksField,
  value: unknown,
  documentPath: string,
): unknown {
  if (value === null || !Array.isArray(value)) {
    return value;
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      return entry;
    }

    const blockType = typeof entry.blockType === "string" ? entry.blockType : undefined;
    const block = field.blocks.find((candidate) => candidate.slug === blockType);
    if (!block) {
      return { ...entry };
    }

    const blockEntry = { ...entry };
    delete blockEntry.blockType;
    delete blockEntry._key;

    const output: Record<string, unknown> = {
      blockType,
    };
    if (entry._key !== undefined) {
      output._key = entry._key;
    }

    flattenFields(block.fields, blockEntry, output, `${documentPath}[${index}]`);
    return output;
  });
}

export function flattenDocumentFields(
  fields: NamedField[],
  source: Record<string, unknown>,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  flattenFields(fields, source, output);
  return output;
}

function deepMerge(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): Record<string, unknown> {
  const output: Record<string, unknown> = { ...left };

  for (const [key, value] of Object.entries(right)) {
    if (isRecord(output[key]) && isRecord(value)) {
      output[key] = deepMerge(output[key] as Record<string, unknown>, value);
      continue;
    }

    output[key] = value;
  }

  return output;
}

function inflateBlocksValue(field: NamedField & BlocksField, value: unknown): unknown {
  if (value === null || !Array.isArray(value)) {
    return value;
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      return entry;
    }

    const blockType = typeof entry.blockType === "string" ? entry.blockType : undefined;
    const block = field.blocks.find((candidate) => candidate.slug === blockType);
    if (!block) {
      return { ...entry };
    }

    return inflateDocumentFields(block.fields, entry);
  });
}

function inflateFromStorage(
  fields: NamedField[],
  source: Record<string, unknown>,
  output: Record<string, unknown>,
  storagePrefix = "",
): Set<string> {
  const consumed = new Set<string>();

  for (const field of fields) {
    const storageKey = `${storagePrefix}${field.name}`;

    switch (field.type) {
      case "group": {
        const nested: Record<string, unknown> = {};
        const nestedConsumed = inflateFromStorage(field.fields, source, nested, `${storageKey}_`);
        for (const key of nestedConsumed) {
          consumed.add(key);
        }
        if (Object.keys(nested).length > 0) {
          output[field.name] = nested;
        }
        break;
      }

      case "row":
      case "collapsible": {
        const inlineConsumed = inflateFromStorage(field.fields, source, output, storagePrefix);
        for (const key of inlineConsumed) {
          consumed.add(key);
        }
        break;
      }

      case "blocks":
        if (storageKey in source) {
          consumed.add(storageKey);
          output[field.name] = inflateBlocksValue(
            field as NamedField & BlocksField,
            source[storageKey],
          );
        }
        break;

      default:
        if (storageKey in source) {
          consumed.add(storageKey);
          output[field.name] = source[storageKey];
        }
        break;
    }
  }

  return consumed;
}

function mergeExplicitNested(
  fields: NamedField[],
  source: Record<string, unknown>,
  output: Record<string, unknown>,
): Set<string> {
  const consumed = new Set<string>();

  for (const field of fields) {
    switch (field.type) {
      case "group": {
        if (!isRecord(source[field.name])) {
          if (field.name in source) {
            consumed.add(field.name);
          }
          break;
        }

        consumed.add(field.name);
        const nested = inflateDocumentFields(
          field.fields,
          source[field.name] as Record<string, unknown>,
        );
        if (!Object.keys(nested).length) {
          break;
        }

        output[field.name] = isRecord(output[field.name])
          ? deepMerge(output[field.name] as Record<string, unknown>, nested)
          : nested;
        break;
      }

      case "row":
      case "collapsible": {
        const inlineConsumed = mergeExplicitNested(field.fields, source, output);
        for (const key of inlineConsumed) {
          consumed.add(key);
        }
        break;
      }

      default:
        if (field.name in source) {
          consumed.add(field.name);
        }
        break;
    }
  }

  return consumed;
}

export function inflateDocumentFields(
  fields: NamedField[],
  source: Record<string, unknown>,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  const consumed = new Set<string>();

  for (const key of inflateFromStorage(fields, source, output)) {
    consumed.add(key);
  }

  for (const key of mergeExplicitNested(fields, source, output)) {
    consumed.add(key);
  }

  for (const [key, value] of Object.entries(source)) {
    if (!(key in output) && !consumed.has(key)) {
      output[key] = value;
    }
  }

  return output;
}

export function getValueAtPath(
  source: Record<string, unknown> | undefined,
  pathSegments: string[],
): unknown {
  let current: unknown = source;

  for (const segment of pathSegments) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

export function setValueAtPath(
  target: Record<string, unknown>,
  pathSegments: string[],
  value: unknown,
): void {
  let current: Record<string, unknown> = target;

  for (let index = 0; index < pathSegments.length - 1; index += 1) {
    const segment = pathSegments[index];
    if (!isRecord(current[segment])) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[pathSegments[pathSegments.length - 1]] = value;
}

export function deleteValueAtPath(target: Record<string, unknown>, pathSegments: string[]): void {
  const parents: Array<Record<string, unknown>> = [];
  const keys: string[] = [];

  let current: Record<string, unknown> | undefined = target;
  for (const segment of pathSegments.slice(0, -1)) {
    if (!current || !isRecord(current[segment])) {
      return;
    }
    parents.push(current);
    keys.push(segment);
    current = current[segment] as Record<string, unknown>;
  }

  if (!current) {
    return;
  }

  delete current[pathSegments[pathSegments.length - 1]];

  for (let index = parents.length - 1; index >= 0; index -= 1) {
    const parent = parents[index];
    const key = keys[index];
    const value = parent[key];
    if (!isRecord(value) || Object.keys(value).length > 0) {
      break;
    }
    delete parent[key];
  }
}

export function translateDocumentPathToStorageKey(
  fields: NamedField[],
  documentPath: string,
): string | undefined {
  const layout = getFieldLayout(fields);
  return (
    layout.byDocumentPath.get(documentPath)?.storageKey ??
    layout.blocksByDocumentPath.get(documentPath)?.storageKey
  );
}

export function mergeDocumentData(
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown>,
): Record<string, unknown> {
  if (!left) {
    return structuredClone(right);
  }
  return deepMerge(left, right);
}
