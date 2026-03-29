import type { RunelayerDatabase } from "../db/init.js";
import type { CollectionConfig } from "../schema/collections.js";

export interface QueryContext {
  db: RunelayerDatabase;
  collection: CollectionConfig;
  req?: Request;
}

export interface FindArgs {
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  sort?: string;
  sortOrder?: "asc" | "desc";
}
