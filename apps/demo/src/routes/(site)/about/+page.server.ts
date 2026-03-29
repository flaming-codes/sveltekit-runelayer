import { query } from "$lib/server/query-helpers.js";
import { SiteSettings, Authors, Posts, Categories } from "$lib/server/schema.js";
import type { SiteSettingsRow, AuthorRow, PostRow, CategoryRow } from "$lib/types.js";

export async function load({ request }: { request: Request }) {
  const [settingsRows, authors, posts, categories] = await Promise.all([
    query().find(SiteSettings, { limit: 1 }),
    query(request).find(Authors),
    query(request).find(Posts),
    query(request).find(Categories),
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
