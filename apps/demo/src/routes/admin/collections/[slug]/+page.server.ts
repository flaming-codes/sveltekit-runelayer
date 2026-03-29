import { error } from "@sveltejs/kit";
import { handleCollectionList } from "@flaming-codes/sveltekit-runelayer/admin";
import { createAdminQueryAdapter, getCollectionBySlug } from "$lib/server/admin-adapter.js";
import { getRunekit } from "$lib/server/runekit.js";
import { toSerializable } from "$lib/server/serializable.js";

export async function load({ params, url }: { params: { slug: string }; url: URL }) {
  const runekit = getRunekit();
  const collection = getCollectionBySlug(runekit, params.slug);
  if (!collection) {
    throw error(404, `Unknown collection: ${params.slug}`);
  }

  const adapter = createAdminQueryAdapter(runekit);
  const list = handleCollectionList(collection, adapter);
  const data = await list({ url });
  return toSerializable(data);
}
