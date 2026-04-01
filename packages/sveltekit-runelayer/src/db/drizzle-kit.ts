import type { CollectionConfig } from "../schema/collections.js";
import { generateTables, type GeneratedTables } from "./schema.js";
import { betterAuthSchema } from "../auth/schema.js";

/**
 * Generates Drizzle schema exports from Runelayer collection configs.
 * Host apps can export this object from a schema file consumed by drizzle-kit.
 */
export function createDrizzleKitSchema(collections: CollectionConfig[]): GeneratedTables {
  return {
    ...generateTables(collections),
    ...betterAuthSchema,
  };
}
