import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { Authors, Posts } from "$lib/server/schema.js";

export async function load({ request }: { request: Request }) {
  const [allAuthors, allPosts] = await Promise.all([
    find(ctx(Authors, request)),
    find(ctx(Posts, request)),
  ]);

  const posts = allPosts as any[];
  const authors = (allAuthors as any[])
    .filter((a) => a.active)
    .map((a) => ({
      ...a,
      postCount: posts.filter((p) => p.author === a.id).length,
    }));

  return { authors };
}
