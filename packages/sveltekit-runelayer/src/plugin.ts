import type { RunelayerConfig } from "./config.js";
import { createDatabase, type RunelayerDatabase } from "./db/index.js";
import { createAuth, type RunelayerAuth } from "./auth/index.js";
import { createLocalStorage, type StorageAdapter } from "./storage/index.js";
import type { CollectionConfig } from "./schema/collections.js";
import type { GlobalConfig } from "./schema/globals.js";

export interface RunelayerInstance {
  /** Resolved admin path */
  adminPath: string;
  /** Database instance */
  database: RunelayerDatabase;
  /** Auth instance with SvelteKit handle hook */
  auth: RunelayerAuth;
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
 * Creates the Runelayer CMS instance.
 * Initializes database, auth, storage, and returns a handle hook for SvelteKit.
 */
export function createRunelayer(config: RunelayerConfig): RunelayerInstance {
  const adminPath = config.adminPath ?? "/admin";
  const collections = config.collections;
  const globals = config.globals ?? [];

  // Initialize database
  const database = createDatabase({
    url: config.database?.url ?? "file:./data/sveltekit-runelayer.db",
    authToken: config.database?.authToken,
    collections,
  });

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
