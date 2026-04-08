import type { CollectionConfig } from "../schema/collections.js";
import type { GlobalConfig } from "../schema/globals.js";
import { generateTables, generateGlobalTables, type GeneratedTables } from "./schema.js";
import { betterAuthSchema } from "../auth/schema.js";

/**
 * Generates Drizzle schema exports from Runelayer collection configs.
 * Host apps should re-export the result from a schema file consumed by drizzle-kit.
 *
 * Usage in drizzle-schema.ts:
 * ```ts
 * import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer/drizzle";
 * import { allCollections, allGlobals } from "./schema.js";
 * export const { pages, __runelayer_globals, user, session, account, verification } =
 *   createDrizzleKitSchema(allCollections, allGlobals);
 * ```
 *
 * Note: drizzle-kit only discovers Drizzle table instances from top-level named exports.
 * You must destructure and re-export each table individually.
 * Call `listTableNames(collections, globals)` to get the list of table keys to destructure.
 */
export function createDrizzleKitSchema(
  collections: CollectionConfig[],
  globals: GlobalConfig[] = [],
): GeneratedTables {
  return {
    ...generateTables(collections),
    ...generateGlobalTables(globals),
    ...betterAuthSchema,
  };
}

/**
 * Returns the list of table names that `createDrizzleKitSchema` will generate
 * for the given collections. Useful for generating the destructured export statement.
 */
export function listTableNames(
  collections: CollectionConfig[],
  globals: GlobalConfig[] = [],
): string[] {
  return [
    ...Object.keys(generateTables(collections)),
    ...Object.keys(generateGlobalTables(globals)),
    ...Object.keys(betterAuthSchema),
  ];
}
