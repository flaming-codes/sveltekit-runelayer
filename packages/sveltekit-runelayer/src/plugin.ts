import type { RunekitConfig } from "./config.js";
import { createDatabase, pushSchema, type RunekitDatabase } from "./db/index.js";
import { createAuth, type RunekitAuth } from "./auth/index.js";
import { createLocalStorage, type StorageAdapter } from "./storage/index.js";
import type { CollectionConfig } from "./schema/collections.js";
import type { GlobalConfig } from "./schema/globals.js";

export interface RunekitInstance {
  /** Resolved admin path */
  adminPath: string;
  /** Database instance */
  database: RunekitDatabase;
  /** Auth instance with SvelteKit handle hook */
  auth: RunekitAuth;
  /** Storage adapter */
  storage: StorageAdapter;
  /** Registered collections */
  collections: CollectionConfig[];
  /** Registered globals */
  globals: GlobalConfig[];
  /** SvelteKit handle hook (combines auth + file serving) */
  handle: (input: {
    event: any;
    resolve: (event: any) => Response | Promise<Response>;
  }) => Promise<Response>;
}

/**
 * Creates the Runekit CMS instance.
 * Initializes database, auth, storage, and returns a handle hook for SvelteKit.
 */
export function createRunekit(config: RunekitConfig): RunekitInstance {
  const adminPath = config.adminPath ?? "/admin";
  const collections = config.collections;
  const globals = config.globals ?? [];

  // Initialize database
  const database = createDatabase({
    filename: config.dbPath ?? "./data/runekit.db",
    collections,
  });

  // Push schema (create/alter tables)
  pushSchema(database);

  // Initialize auth
  const auth = createAuth(config.auth, database.db);

  // Initialize storage
  const storage = createLocalStorage(config.storage);

  // Combined SvelteKit handle hook: auth session + header injection
  const handle = async ({
    event,
    resolve,
  }: {
    event: any;
    resolve: (event: any) => Response | Promise<Response>;
  }) => {
    return auth.handle({ event, resolve });
  };

  return {
    adminPath,
    database,
    auth,
    storage,
    collections,
    globals,
    handle,
  };
}
