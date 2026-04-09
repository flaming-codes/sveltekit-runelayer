// Config
export { defineConfig } from "./config.js";
export type { RunelayerConfig } from "./config.js";

// Plugin
export { createRunelayer } from "./plugin.js";
export type { RunelayerInstance } from "./plugin.js";

// Schema
export {
  defineSchema,
  defineCollection,
  defineGlobal,
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
} from "./schema/index.js";
export type {
  SchemaConfig,
  CollectionConfig,
  GlobalConfig,
  Field,
  NamedField,
  AccessFn,
  AccessControl,
  ValidationFn,
  BlocksField,
  BlockConfig,
  RefSentinel,
  BlocksValue,
  InferBlockData,
  InferFieldsData,
} from "./schema/index.js";

// Auth
export { createAuth, createAuthHandler, isAdmin, isLoggedIn, hasRole } from "./auth/index.js";
export type { AuthConfig, User, Session, Role } from "./auth/index.js";

// Storage
export { createLocalStorage, createUploadHandler, createServeHandler } from "./storage/index.js";
export type {
  StorageAdapter,
  StoredFile,
  UploadOptions,
  LocalStorageConfig,
  UploadHandlerConfig,
  ServeHandlerConfig,
} from "./storage/index.js";

// Database
export {
  createDatabase,
  createDrizzleKitSchema,
  findMany,
  findById,
  insertOne,
  updateOne,
  deleteOne,
  createVersionSnapshot,
  findVersions,
  findVersionById,
  getLatestVersionNumber,
  deleteVersionsByParent,
  pruneVersions,
} from "./db/index.js";
export type {
  RunelayerDatabase,
  DatabaseConfig,
  DatabaseConnectionConfig,
  FindManyOpts,
} from "./db/index.js";

// Hooks
export { runBeforeHooks, runAfterHooks } from "./hooks/index.js";
export type { HookContext, CollectionHooks, GlobalHooks } from "./hooks/index.js";

// Query API
export {
  find,
  findOne,
  create,
  update,
  remove,
  publish,
  unpublish,
  saveDraft,
  findVersionHistory,
  restoreVersion,
  checkAccess,
} from "./query/index.js";
export type { QueryContext, FindArgs } from "./query/index.js";

// Validation
export {
  validateWritePayload,
  assertValidWritePayload,
  isWriteValidationError,
  WriteValidationError,
  stripReservedWriteFields,
  validationIssuesToFieldErrors,
} from "./schema/index.js";
export type {
  ValidationIssue,
  WriteValidationResult,
  WriteValidationOptions,
  WriteOperation,
} from "./schema/index.js";

// Versions
export { normalizeVersionConfig } from "./versions/config.js";
export type { NormalizedVersionConfig } from "./versions/config.js";
