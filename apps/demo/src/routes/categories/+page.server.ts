import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { Categories, Posts } from "$lib/server/schema.js";

export async function load({ request }: { request: Request }) {
  const [allCategories, allPosts] = await Promise.all([
    find(ctx(Categories, request), { sort: "sortOrder" }),
    find(ctx(Posts, request)),
  ]);

  const posts = allPosts as any[];
  const categories = (allCategories as any[]).map((cat) => ({
    ...cat,
    postCount: posts.filter((p) => p.category === cat.id).length,
  }));

  return { categories };
}
