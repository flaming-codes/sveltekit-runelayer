import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx, parseJson } from "$lib/server/query-helpers.js";
import { Media } from "$lib/server/schema.js";

export async function load({ request }: { request: Request }) {
  const media = await find(ctx(Media, request));
  const items = (media as any[]).map((m) => ({
    ...m,
    parsedTags: parseJson(m.tags, []),
  }));
  return { media: items };
}
