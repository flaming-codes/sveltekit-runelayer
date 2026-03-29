import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { Posts, Authors, Categories } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";

export async function load({ params, request }: { params: { slug: string }; request: Request }) {
  const [allPosts, allAuthors, allCategories] = await Promise.all([
    find(ctx(Posts, request)),
    find(ctx(Authors, request)),
    find(ctx(Categories, request)),
  ]);

  const post = (allPosts as any[]).find((p) => p.slug === params.slug);
  if (!post) throw error(404, "Post not found");

  const author = post.author
    ? ((allAuthors as any[]).find((a) => a.id === post.author) ?? null)
    : null;

  const category = post.category
    ? ((allCategories as any[]).find((c) => c.id === post.category) ?? null)
    : null;

  return { post, author, category };
}
