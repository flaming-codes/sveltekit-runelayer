import { query, parseJson } from "$lib/server/query-helpers.js";
import { Media } from "$lib/server/schema.js";
import type { MediaRow, EnrichedMedia } from "$lib/types.js";

export async function load({ request }: { request: Request }) {
  const media = await query(request).find(Media);
  const items: EnrichedMedia[] = (media as MediaRow[]).map((m) => ({
    ...m,
    parsedTags: parseJson<string[]>(m.tags, []),
  }));
  return { media: items };
}
