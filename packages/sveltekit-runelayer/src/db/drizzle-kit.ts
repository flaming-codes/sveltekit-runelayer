import type { CollectionConfig } from "../schema/collections.js";
import { generateTables, type GeneratedTables } from "./schema.js";
import { betterAuthSchema } from "../auth/schema.js";

/**
 * Generates Drizzle schema exports from Runelayer collection configs.
 * Host apps should re-export the result from a schema file consumed by drizzle-kit.
 *
 * Usage in drizzle-schema.ts:
 * ```ts
 * import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer/drizzle";
 * import { allCollections } from "./schema.js";
 * export const { pages, user, session, account, verification } = createDrizzleKitSchema(allCollections);
 * ```
 *
 * Note: drizzle-kit only discovers Drizzle table instances from top-level named exports.
 * You must destructure and re-export each table individually.
 * Call `listTableNames(collections)` to get the list of table keys to destructure.
 */
export function createDrizzleKitSchema(collections: CollectionConfig[]): GeneratedTables {
  return {
    ...generateTables(collections),
    ...betterAuthSchema,
  };
}

/**
 * Returns the list of table names that `createDrizzleKitSchema` will generate
 * for the given collections. Useful for generating the destructured export statement.
 */
export function listTableNames(collections: CollectionConfig[]): string[] {
  return [
    ...Object.keys(generateTables(collections)),
    ...Object.keys(betterAuthSchema),
  ];
}
