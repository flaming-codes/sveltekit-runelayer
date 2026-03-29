import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { Authors, Posts, Categories } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";

export async function load({ params, request }: { params: { slug: string }; request: Request }) {
  const [allAuthors, allPosts, allCategories] = await Promise.all([
    find(ctx(Authors, request)),
    find(ctx(Posts, request)),
    find(ctx(Categories, request)),
  ]);

  const author = (allAuthors as any[]).find((a) => a.slug === params.slug);
  if (!author) throw error(404, "Author not found");

  const categoryMap = new Map((allCategories as any[]).map((c) => [c.id, c]));
  const posts = (allPosts as any[])
    .filter((p) => p.author === author.id)
    .map((p) => ({
      ...p,
      categoryName: categoryMap.get(p.category)?.name ?? "Uncategorized",
    }));

  return { author, posts };
}
