import type { QueryContext, CollectionConfig } from "@flaming-codes/sveltekit-runelayer";
import { getRunekit } from "./runekit.js";

/**
 * Create a QueryContext for a collection.
 * Pass `request` from the SvelteKit load event to satisfy access control.
 * For server-only queries without a user request (e.g., layout data for
 * public collections), pass a synthetic request.
 */
export function ctx(collection: CollectionConfig, request?: Request): QueryContext {
  const req = request ?? new Request("http://localhost");
  return { db: getRunekit().database, collection: collection as any, req };
}

/** Parse a JSON string or return fallback if not a string / invalid. */
export function parseJson<T>(val: unknown, fallback: T): T {
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return (val as T) ?? fallback;
}
