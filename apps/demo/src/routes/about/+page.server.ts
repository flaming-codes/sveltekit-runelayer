import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { SiteSettings, Authors, Posts, Categories } from "$lib/server/schema.js";
import type { SiteSettingsRow, AuthorRow, PostRow, CategoryRow } from "$lib/types.js";

export async function load({ request }: { request: Request }) {
  const [settingsRows, authors, posts, categories] = await Promise.all([
    find(ctx(SiteSettings), { limit: 1 }),
    find(ctx(Authors, request)),
    find(ctx(Posts, request)),
    find(ctx(Categories, request)),
  ]);

  const settings = (settingsRows[0] as SiteSettingsRow) ?? {};

  return {
    settings,
    stats: {
      authors: (authors as AuthorRow[]).length,
      posts: (posts as PostRow[]).length,
      categories: (categories as CategoryRow[]).length,
    },
  };
}
