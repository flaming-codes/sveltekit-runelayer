import { query, buildLookupMap, enrichWithName } from "$lib/server/query-helpers.js";
import { Posts, Authors } from "$lib/server/schema.js";
import type { PostRow, EnrichedPost, AuthorRow } from "$lib/types.js";

export async function load({ url, request }: { url: URL; request: Request }) {
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = 10;

  const [allPosts, allAuthors] = await Promise.all([
    query(request).find(Posts, { sort: "createdAt", sortOrder: "desc" }),
    query(request).find(Authors),
  ]);

  const posts = allPosts as PostRow[];
  const authorMap = buildLookupMap(allAuthors as AuthorRow[]);

  // Enrich posts with author names
  const enriched = enrichWithName(posts, "author", authorMap) as EnrichedPost[];

  const totalPages = Math.ceil(enriched.length / limit);
  const paginated = enriched.slice((page - 1) * limit, page * limit);

  return { posts: paginated, page, totalPages, total: enriched.length };
}
