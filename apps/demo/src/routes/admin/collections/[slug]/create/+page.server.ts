import { error } from "@sveltejs/kit";
import { handleCollectionCreate } from "@flaming-codes/sveltekit-runelayer/admin";
import { createAdminQueryAdapter, getCollectionBySlug } from "$lib/server/admin-adapter.js";
import { getRunekit } from "$lib/server/runekit.js";
import { toSerializable } from "$lib/server/serializable.js";

export async function load({ params }: { params: { slug: string } }) {
  const runekit = getRunekit();
  const collection = getCollectionBySlug(runekit, params.slug);
  if (!collection) {
    throw error(404, `Unknown collection: ${params.slug}`);
  }

  return {
    collection: toSerializable(collection),
    document: null,
  };
}

export const actions = {
  create: async ({ params, request }: { params: { slug: string }; request: Request }) => {
    const runekit = getRunekit();
    const collection = getCollectionBySlug(runekit, params.slug);
    if (!collection) {
      throw error(404, `Unknown collection: ${params.slug}`);
    }

    const adapter = createAdminQueryAdapter(runekit);
    const create = handleCollectionCreate(collection, adapter);
    return await create({ request });
  },
};
