import { query } from "$lib/server/query-helpers.js";
import { Posts, Authors, Categories } from "$lib/server/schema.js";
import { error } from "@sveltejs/kit";
import type { PostRow, AuthorRow, CategoryRow } from "$lib/types.js";

export async function load({ params, request }: { params: { slug: string }; request: Request }) {
  const [allPosts, allAuthors, allCategories] = await Promise.all([
    query(request).find(Posts),
    query(request).find(Authors),
    query(request).find(Categories),
  ]);

  const post = (allPosts as PostRow[]).find((p) => p.slug === params.slug);
  if (!post) throw error(404, "Post not found");

  const author = post.author
    ? ((allAuthors as AuthorRow[]).find((a) => a.id === post.author) ?? null)
    : null;

  const category = post.category
    ? ((allCategories as CategoryRow[]).find((c) => c.id === post.category) ?? null)
    : null;

  return { post, author, category };
}
