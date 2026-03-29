import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { Categories, Posts, Authors } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";

export async function load({ params, request }: { params: { slug: string }; request: Request }) {
  const [allCategories, allPosts, allAuthors] = await Promise.all([
    find(ctx(Categories, request)),
    find(ctx(Posts, request)),
    find(ctx(Authors, request)),
  ]);

  const category = (allCategories as any[]).find((c) => c.slug === params.slug);
  if (!category) throw error(404, "Category not found");

  const authorMap = new Map((allAuthors as any[]).map((a) => [a.id, a]));
  const posts = (allPosts as any[])
    .filter((p) => p.category === category.id)
    .map((p) => ({ ...p, authorName: authorMap.get(p.author)?.name ?? "Unknown" }));

  return { category, posts };
}
