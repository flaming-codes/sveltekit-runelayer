import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { Pages } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";

export async function load({ params, request }: { params: { slug: string }; request: Request }) {
  const allPages = await find(ctx(Pages, request));
  const page = (allPages as any[]).find((p) => p.slug === params.slug);
  if (!page) throw error(404, "Page not found");
  return { page };
}
