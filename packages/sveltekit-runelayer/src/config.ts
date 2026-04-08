import type { CollectionConfig } from "./schema/collections.js";
import type { GlobalConfig } from "./schema/globals.js";
import type { AuthConfig } from "./auth/types.js";
import type { LocalStorageConfig } from "./storage/local.js";
import type { DatabaseConnectionConfig } from "./db/init.js";

export interface RunelayerStorageConfig extends LocalStorageConfig {
  /**
   * When true, uploaded files under `storage.urlPrefix` are publicly readable.
   * Defaults to false (authenticated reads only).
   */
  publicRead?: boolean;
}

export interface RunelayerConfig {
  /** Base path for the admin UI (default: "/admin") */
  adminPath?: string;
  /** Collections to register */
  collections: CollectionConfig[];
  /** Globals to register */
  globals?: GlobalConfig[];
  /** Database connection (default: { url: "file:./data/sveltekit-runelayer.db" }) */
  database?: DatabaseConnectionConfig;
  /** Auth configuration */
  auth: AuthConfig;
  /** Storage configuration */
  storage?: RunelayerStorageConfig;
}

export function defineConfig(config: RunelayerConfig): RunelayerConfig {
  return {
    ...config,
    adminPath: config.adminPath ?? "/admin",
    database: { url: "file:./data/sveltekit-runelayer.db", ...config.database },
    globals: config.globals ?? [],
  };
}
