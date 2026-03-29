import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { SiteSettings, Authors, Posts, Categories } from "$lib/server/schema.js";

export async function load({ request }: { request: Request }) {
  const [settingsRows, authors, posts, categories] = await Promise.all([
    find(ctx(SiteSettings), { limit: 1 }),
    find(ctx(Authors, request)),
    find(ctx(Posts, request)),
    find(ctx(Categories, request)),
  ]);

  const settings = (settingsRows[0] as any) ?? {};

  return {
    settings,
    stats: {
      authors: (authors as any[]).length,
      posts: (posts as any[]).length,
      categories: (categories as any[]).length,
    },
  };
}
