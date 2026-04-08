import type { RunelayerDatabase } from "../db/init.js";
import type { CollectionConfig } from "../schema/collections.js";

export interface QueryContext {
  db: RunelayerDatabase;
  collection: CollectionConfig;
  req?: Request;
  /** All registered collections — needed for ref population with read projection. */
  collections?: CollectionConfig[];
}

export interface FindArgs {
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  sort?: string;
  sortOrder?: "asc" | "desc";
  /** Include draft documents. Defaults to false for versioned collections. */
  draft?: boolean;
  /** Population depth. 0 (default) returns raw RefSentinel objects; 1 replaces sentinels with full documents (or null if missing). */
  depth?: 0 | 1;
}

export interface FindOneOpts {
  /** Population depth. 0 (default) returns raw RefSentinel objects; 1 replaces sentinels with full documents (or null if missing). */
  depth?: 0 | 1;
}
