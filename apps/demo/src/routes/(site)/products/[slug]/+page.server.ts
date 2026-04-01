import { query } from "$lib/server/query-helpers.js";
import { Products, Categories, Media } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";
import type { ProductRow, CategoryRow, MediaRow } from "$lib/types.js";

export async function load({ params, request }: { params: { slug: string }; request: Request }) {
  const [allProducts, allCategories, allMedia] = await Promise.all([
    query(request).find(Products),
    query(request).find(Categories),
    query(request).find(Media),
  ]);

  const product = (allProducts as ProductRow[]).find((p) => p.slug === params.slug);
  if (!product) throw error(404, "Product not found");

  const category = product.category
    ? ((allCategories as CategoryRow[]).find((c) => c.id === product.category) ?? null)
    : null;

  const image = product.image
    ? ((allMedia as MediaRow[]).find((m) => m.id === product.image) ?? null)
    : null;

  return { product, category, image };
}
