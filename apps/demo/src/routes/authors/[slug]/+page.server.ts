import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx, buildLookupMap, enrichWithName } from "$lib/server/query-helpers.js";
import { Authors, Posts, Categories } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";
import type { AuthorRow, PostRow, CategoryRow } from "$lib/types.js";

export async function load({ params, request }: { params: { slug: string }; request: Request }) {
  const [allAuthors, allPosts, allCategories] = await Promise.all([
    find(ctx(Authors, request)),
    find(ctx(Posts, request)),
    find(ctx(Categories, request)),
  ]);

  const author = (allAuthors as AuthorRow[]).find((a) => a.slug === params.slug);
  if (!author) throw error(404, "Author not found");

  const categoryMap = buildLookupMap(allCategories as CategoryRow[]);
  const posts = enrichWithName(
    (allPosts as PostRow[]).filter((p) => p.author === author.id),
    "category",
    categoryMap,
    "Uncategorized",
  );

  return { author, posts };
}
