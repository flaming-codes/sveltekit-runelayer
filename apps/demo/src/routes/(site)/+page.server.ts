import { query } from "$lib/server/query-helpers.js";
import { Posts, Authors, Categories, Products } from "$lib/server/schema.js";
import type { PostRow, AuthorRow, CategoryRow, ProductRow } from "$lib/types.js";

export async function load({ request }: { request: Request }) {
  const [allPosts, authors, categories, products] = await Promise.all([
    query(request).find(Posts, { sort: "createdAt", sortOrder: "desc" }),
    query(request).find(Authors),
    query(request).find(Categories),
    query(request).find(Products),
  ]);

  const posts = allPosts as PostRow[];
  const published = posts.filter((p) => p.status === "published");
  const featured = published.filter((p) => p.featured).slice(0, 3);
  const recent = published.slice(0, 6);

  return {
    featured,
    recent,
    stats: {
      posts: posts.length,
      published: published.length,
      authors: (authors as AuthorRow[]).length,
      categories: (categories as CategoryRow[]).length,
      products: (products as ProductRow[]).length,
    },
  };
}
