import { query } from "$lib/server/query-helpers.js";
import { Pages } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";
import type { PageRow } from "$lib/types.js";

export async function load({ params, request }: { params: { slug: string }; request: Request }) {
  const allPages = await query(request).find(Pages);
  const page = (allPages as PageRow[]).find((p) => p.slug === params.slug);
  if (!page) throw error(404, "Page not found");
  return { page };
}
