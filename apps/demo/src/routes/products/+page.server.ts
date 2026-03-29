import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx, parseJson } from "$lib/server/query-helpers.js";
import { Products, Categories } from "$lib/server/schema.js";

export async function load({ request }: { request: Request }) {
  const [allProducts, allCategories] = await Promise.all([
    find(ctx(Products, request)),
    find(ctx(Categories, request)),
  ]);

  const categoryMap = new Map((allCategories as any[]).map((c) => [c.id, c]));
  const products = (allProducts as any[]).map((p) => ({
    ...p,
    categoryName: categoryMap.get(p.category)?.name ?? "Uncategorized",
    parsedFeatures: parseJson(p.features, []),
  }));

  return { products };
}
