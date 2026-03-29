import { query, parseJson, buildLookupMap } from "$lib/server/query-helpers.js";
import { Products, Categories } from "$lib/server/schema.js";
import type { ProductRow, EnrichedProduct, CategoryRow } from "$lib/types.js";

export async function load({ request }: { request: Request }) {
  const [allProducts, allCategories] = await Promise.all([
    query(request).find(Products),
    query(request).find(Categories),
  ]);

  const categoryMap = buildLookupMap(allCategories as CategoryRow[]);
  const products: EnrichedProduct[] = (allProducts as ProductRow[]).map((p) => ({
    ...p,
    categoryName: categoryMap.get(p.category ?? "")?.name ?? "Uncategorized",
    parsedFeatures: parseJson<string[]>(p.features, []),
  }));

  return { products };
}
