import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { Categories, Posts } from "$lib/server/schema.js";
import type { CategoryRow, PostRow } from "$lib/types.js";

export async function load({ request }: { request: Request }) {
  const [allCategories, allPosts] = await Promise.all([
    find(ctx(Categories, request), { sort: "sortOrder" }),
    find(ctx(Posts, request)),
  ]);

  const posts = allPosts as PostRow[];
  const categories = (allCategories as CategoryRow[]).map((cat) => ({
    ...cat,
    postCount: posts.filter((p) => p.category === cat.id).length,
  }));

  return { categories };
}
