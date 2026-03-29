import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { Authors, Posts } from "$lib/server/schema.js";
import type { AuthorRow, PostRow } from "$lib/types.js";

export async function load({ request }: { request: Request }) {
  const [allAuthors, allPosts] = await Promise.all([
    find(ctx(Authors, request)),
    find(ctx(Posts, request)),
  ]);

  const posts = allPosts as PostRow[];
  const authors = (allAuthors as AuthorRow[])
    .filter((a) => a.active)
    .map((a) => ({
      ...a,
      postCount: posts.filter((p) => p.author === a.id).length,
    }));

  return { authors };
}
