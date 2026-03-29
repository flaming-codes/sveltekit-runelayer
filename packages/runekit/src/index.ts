// Config
export { defineConfig } from './config.js';
export type { RunekitConfig } from './config.js';

// Plugin
export { createRunekit } from './plugin.js';
export type { RunekitInstance } from './plugin.js';

// Schema
export {
	defineSchema, defineCollection, defineGlobal,
	text, textarea, number, richText,
	select, multiSelect, checkbox, date,
	relationship, upload, json, slug, email,
	group, array, row, collapsible,
} from './schema/index.js';
export type {
	SchemaConfig, CollectionConfig, GlobalConfig,
	Field, NamedField, AccessFn, AccessControl, ValidationFn,
} from './schema/index.js';

// Auth
export { createAuth, isAdmin, isLoggedIn, hasRole } from './auth/index.js';
export type { AuthConfig, User, Session, Role } from './auth/index.js';

// Storage
export { createLocalStorage } from './storage/index.js';
export type { StorageAdapter, StoredFile, UploadOptions } from './storage/index.js';

// Database
export { createDatabase, pushSchema } from './db/index.js';
export type { RunekitDatabase, DatabaseConfig } from './db/index.js';

// Hooks
export { runBeforeHooks, runAfterHooks } from './hooks/index.js';
export type { HookContext, CollectionHooks, GlobalHooks } from './hooks/index.js';

// Query API
export { find, findOne, create, update, remove } from './query/index.js';
export type { QueryContext, FindArgs } from './query/index.js';
