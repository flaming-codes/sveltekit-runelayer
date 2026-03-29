import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { Posts, Authors, Categories, Products } from "$lib/server/schema.js";

export async function load({ request }: { request: Request }) {
  const [allPosts, authors, categories, products] = await Promise.all([
    find(ctx(Posts, request), { sort: "createdAt", sortOrder: "desc" }),
    find(ctx(Authors, request)),
    find(ctx(Categories, request)),
    find(ctx(Products, request)),
  ]);

  const posts = allPosts as any[];
  const published = posts.filter((p) => p.status === "published");
  const featured = published.filter((p) => p.featured).slice(0, 3);
  const recent = published.slice(0, 6);

  return {
    featured,
    recent,
    stats: {
      posts: posts.length,
      published: published.length,
      authors: (authors as any[]).length,
      categories: (categories as any[]).length,
      products: (products as any[]).length,
    },
  };
}
