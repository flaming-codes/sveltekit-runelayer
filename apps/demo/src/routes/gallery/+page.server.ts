import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx, parseJson } from "$lib/server/query-helpers.js";
import { Media } from "$lib/server/schema.js";
import type { MediaRow, EnrichedMedia } from "$lib/types.js";

export async function load({ request }: { request: Request }) {
  const media = await find(ctx(Media, request));
  const items: EnrichedMedia[] = (media as MediaRow[]).map((m) => ({
    ...m,
    parsedTags: parseJson<string[]>(m.tags, []),
  }));
  return { media: items };
}
