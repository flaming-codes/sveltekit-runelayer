import type { RequestEvent } from "@sveltejs/kit";
import { getRunelayerApp } from "./runekit.js";

// Re-export parseJson from shared module for server files that need it
export { parseJson } from "../parse-json.js";

export type QueryRequest = RequestEvent | Request;

export function query(request?: QueryRequest) {
  return getRunelayerApp().withRequest(request ?? new Request("http://localhost"));
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
