import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { Products, Categories, Media } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";
import type { ProductRow, CategoryRow, MediaRow } from "$lib/types.js";

export async function load({ params, request }: { params: { slug: string }; request: Request }) {
  const [allProducts, allCategories, allMedia] = await Promise.all([
    find(ctx(Products, request)),
    find(ctx(Categories, request)),
    find(ctx(Media, request)),
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
