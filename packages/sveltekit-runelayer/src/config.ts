import type { CollectionConfig } from "./schema/collections.js";
import type { GlobalConfig } from "./schema/globals.js";
import type { AuthConfig } from "./auth/types.js";
import type { LocalStorageConfig } from "./storage/local.js";

export interface RunekitConfig {
  /** Base path for the admin UI (default: "/admin") */
  adminPath?: string;
  /** Collections to register */
  collections: CollectionConfig[];
  /** Globals to register */
  globals?: GlobalConfig[];
  /** Database file path (default: "./data/runekit.db") */
  dbPath?: string;
  /** Auth configuration */
  auth: AuthConfig;
  /** Storage configuration */
  storage?: LocalStorageConfig;
}

export function defineConfig(config: RunekitConfig): RunekitConfig {
  return {
    adminPath: "/admin",
    dbPath: "./data/runekit.db",
    globals: [],
    ...config,
  };
}
