import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { Posts, Authors } from "$lib/server/schema.js";

export async function load({ url, request }: { url: URL; request: Request }) {
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = 10;

  const [allPosts, allAuthors] = await Promise.all([
    find(ctx(Posts, request), { sort: "createdAt", sortOrder: "desc" }),
    find(ctx(Authors, request)),
  ]);

  const posts = allPosts as any[];
  const authors = allAuthors as any[];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  // Enrich posts with author names
  const enriched = posts.map((p) => ({
    ...p,
    authorName: authorMap.get(p.author)?.name ?? "Unknown",
  }));

  const totalPages = Math.ceil(enriched.length / limit);
  const paginated = enriched.slice((page - 1) * limit, page * limit);

  return { posts: paginated, page, totalPages, total: enriched.length };
}
