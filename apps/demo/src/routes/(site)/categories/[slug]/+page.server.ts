import { query, buildLookupMap, enrichWithName } from "$lib/server/query-helpers.js";
import { Categories, Posts, Authors } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";
import type { CategoryRow, PostRow, AuthorRow } from "$lib/types.js";

export async function load({ params, request }: { params: { slug: string }; request: Request }) {
  const [allCategories, allPosts, allAuthors] = await Promise.all([
    query(request).find(Categories),
    query(request).find(Posts),
    query(request).find(Authors),
  ]);

  const category = (allCategories as CategoryRow[]).find((c) => c.slug === params.slug);
  if (!category) throw error(404, "Category not found");

  const authorMap = buildLookupMap(allAuthors as AuthorRow[]);
  const posts = enrichWithName(
    (allPosts as PostRow[]).filter((p) => p.category === category.id),
    "author",
    authorMap,
  );

  return { category, posts };
}
