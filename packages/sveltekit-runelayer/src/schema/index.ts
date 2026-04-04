export const SCHEMA_VERSION = "0.0.1";

// Types
export type {
  AccessFn,
  AccessControl,
  FieldAccess,
  ValidationFn,
  HookContext,
  BeforeChangeHook,
  AfterChangeHook,
  BeforeDeleteHook,
  AfterDeleteHook,
  BeforeReadHook,
  AfterReadHook,
  BeforePublishHook,
  AfterPublishHook,
  Hooks,
  CollectionAuthConfig,
  UploadConfig,
  HookArgs,
} from "./types.js";

// Fields
export type {
  Field,
  NamedField,
  TextField,
  TextareaField,
  NumberField,
  RichTextField,
  SelectField,
  MultiSelectField,
  CheckboxField,
  DateField,
  RelationshipField,
  UploadField,
  JsonField,
  SlugField,
  EmailField,
  GroupField,
  BlocksField,
  RowField,
  CollapsibleField,
  RefSentinel,
  BlockConfig,
  BlocksValue,
  InferBlockData,
  InferFieldsData,
} from "./fields.js";
export {
  text,
  textarea,
  number,
  richText,
  select,
  multiSelect,
  checkbox,
  date,
  relationship,
  upload,
  json,
  slug,
  email,
  group,
  blocks,
  defineBlock,
  row,
  collapsible,
} from "./fields.js";

// Collections
export type { CollectionConfig } from "./collections.js";
export { defineCollection } from "./collections.js";

// Globals
export type { GlobalConfig } from "./globals.js";
export { defineGlobal } from "./globals.js";

// Schema config
import type { CollectionConfig } from "./collections.js";
import type { GlobalConfig } from "./globals.js";

export interface SchemaConfig {
  collections: CollectionConfig[];
  globals?: GlobalConfig[];
}

export function defineSchema(config: SchemaConfig): SchemaConfig {
  return config;
}

// Auth access helpers — lightweight re-exports for schema definitions
export { isAdmin, isLoggedIn, hasRole } from "./access.js";
