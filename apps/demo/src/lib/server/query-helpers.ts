import type { QueryContext, CollectionConfig } from "@flaming-codes/sveltekit-runelayer";
import { getRunekit } from "./runekit.js";

// Re-export parseJson from shared module for server files that need it
export { parseJson } from "../parse-json.js";

/**
 * Create a QueryContext for a collection.
 * Pass `request` from the SvelteKit load event to satisfy access control.
 */
export function ctx(collection: CollectionConfig, request?: Request): QueryContext {
  const req = request ?? new Request("http://localhost");
  return { db: getRunekit().database, collection, req };
}

/** Build an id→record lookup map from query results. */
export function buildLookupMap<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

/** Enrich items with a resolved name from a related collection. */
export function enrichWithName<T extends object>(
  items: T[],
  field: string,
  lookup: Map<string, { name: string }>,
  fallback = "Unknown",
): (T & Record<string, string>)[] {
  return items.map((item) => ({
    ...item,
    [`${field}Name`]:
      lookup.get((item as Record<string, unknown>)[field] as string)?.name ?? fallback,
  }));
}
