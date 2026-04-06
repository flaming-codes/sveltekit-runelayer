import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import type { SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import type { SQLiteColumnBuilderBase } from "drizzle-orm/sqlite-core/columns/common";
import type { CollectionConfig } from "../schema/collections.js";
import type { GlobalConfig } from "../schema/globals.js";
import type { NamedField } from "../schema/fields.js";
import { getFieldLayout } from "../schema/document-shape.js";
import { normalizeVersionConfig } from "../versions/config.js";

type AnyTable = SQLiteTableWithColumns<any>;
type ColumnDef = SQLiteColumnBuilderBase;

/** Map a single field to Drizzle column definitions, with optional prefix for groups. */
function mapField(field: NamedField, prefix = ""): Record<string, ColumnDef> {
  const col = prefix + field.name;

  switch (field.type) {
    case "text":
    case "textarea":
    case "email":
    case "slug":
    case "select":
    case "date":
    case "upload":
      return { [col]: text(col) };

    case "number":
      return { [col]: real(col) };

    case "checkbox":
      return { [col]: integer(col, { mode: "boolean" }) };

    case "richText":
    case "json":
    case "multiSelect":
      return { [col]: text(col, { mode: "json" }) };

    case "relationship":
      // Both single and hasMany stored as RefSentinel / RefSentinel[] JSON
      return { [col]: text(col, { mode: "json" }) };

    case "group":
      return fieldsToColumns(field.fields, prefix + field.name + "_");

    case "blocks":
      return { [col]: text(col, { mode: "json" }) };

    case "row":
    case "collapsible":
      return fieldsToColumns(field.fields, prefix);

    default:
      return {};
  }
}

function fieldsToColumns(fields: NamedField[], prefix = ""): Record<string, ColumnDef> {
  let cols: Record<string, ColumnDef> = {};
  for (const f of fields) Object.assign(cols, mapField(f, prefix));
  return cols;
}

function baseColumns() {
  return {
    id: text("id").primaryKey(),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  };
}

export type GeneratedTables = Record<string, AnyTable>;
export const GLOBALS_TABLE_NAME = "__runelayer_globals";
export const GLOBAL_VERSIONS_TABLE_NAME = "__runelayer_global_versions";

/** Generate all Drizzle tables from an array of CollectionConfigs. */
export function generateTables(collections: CollectionConfig[]): GeneratedTables {
  const tables: GeneratedTables = {};

  for (const collection of collections) {
    const { slug, fields, versions, auth } = collection;
    getFieldLayout(fields);
    const fieldCols = fieldsToColumns(fields);

    const extras: Record<string, ColumnDef> = {};
    if (versions) {
      extras._status = text("_status").$default(() => "draft");
      extras._version = integer("_version").$default(() => 1);
    }
    if (auth) {
      extras.hash = text("hash");
      extras.salt = text("salt");
      extras.token = text("token");
      extras.tokenExpiry = text("tokenExpiry");
    }

    tables[slug] = sqliteTable(slug, {
      ...baseColumns(),
      ...fieldCols,
      ...extras,
    });

    // Create version history table for versioned collections
    if (versions) {
      const versionsSlug = `${slug}_versions`;
      tables[versionsSlug] = sqliteTable(
        versionsSlug,
        {
          id: text("id").primaryKey(),
          _parentId: text("_parentId").notNull(),
          _version: integer("_version").notNull(),
          _status: text("_status").notNull(),
          _snapshot: text("_snapshot", { mode: "json" }),
          _createdBy: text("_createdBy"),
          createdAt: text("createdAt").notNull(),
        },
        (t) => [index(`${slug}_versions_parentId_idx`).on(t._parentId, t.createdAt)],
      );
    }
  }

  return tables;
}

/** Generate Drizzle tables used by global document persistence. */
export function generateGlobalTables(globals: GlobalConfig[]): GeneratedTables {
  if (globals.length === 0) return {};

  const tables: GeneratedTables = {
    [GLOBALS_TABLE_NAME]: sqliteTable(GLOBALS_TABLE_NAME, {
      slug: text("slug").primaryKey().notNull(),
      data: text("data").notNull(),
      updatedAt: text("updatedAt").notNull(),
      _status: text("_status").$default(() => "draft"),
      _version: integer("_version").$default(() => 1),
    }),
  };

  if (globals.some((global) => normalizeVersionConfig(global.versions))) {
    tables[GLOBAL_VERSIONS_TABLE_NAME] = sqliteTable(
      GLOBAL_VERSIONS_TABLE_NAME,
      {
        id: text("id").primaryKey().notNull(),
        _globalSlug: text("_globalSlug").notNull(),
        _version: integer("_version").notNull(),
        _status: text("_status").notNull(),
        _snapshot: text("_snapshot", { mode: "json" }).notNull(),
        _createdBy: text("_createdBy"),
        createdAt: text("createdAt").notNull(),
      },
      (t) => [index("idx_global_versions_slug").on(t._globalSlug, t.createdAt)],
    );
  }

  return tables;
}
