import { error } from "@sveltejs/kit";
import {
  handleCollectionDelete,
  handleCollectionGet,
  handleCollectionUpdate,
} from "@flaming-codes/sveltekit-runelayer/admin";
import { createAdminQueryAdapter, getCollectionBySlug } from "$lib/server/admin-adapter.js";
import { getRunekit } from "$lib/server/runekit.js";
import { toSerializable } from "$lib/server/serializable.js";

export async function load({
  params,
}: {
  params: {
    slug: string;
    id: string;
  };
}) {
  const runekit = getRunekit();
  const collection = getCollectionBySlug(runekit, params.slug);
  if (!collection) {
    throw error(404, `Unknown collection: ${params.slug}`);
  }

  const adapter = createAdminQueryAdapter(runekit);
  const get = handleCollectionGet(collection, adapter);
  const data = await get({ params: { id: params.id } });
  return toSerializable(data);
}

export const actions = {
  update: async ({
    params,
    request,
  }: {
    params: { slug: string; id: string };
    request: Request;
  }) => {
    const runekit = getRunekit();
    const collection = getCollectionBySlug(runekit, params.slug);
    if (!collection) {
      throw error(404, `Unknown collection: ${params.slug}`);
    }

    const adapter = createAdminQueryAdapter(runekit);
    const update = handleCollectionUpdate(collection, adapter);
    return await update({ request });
  },

  delete: async ({
    params,
    request,
  }: {
    params: { slug: string; id: string };
    request: Request;
  }) => {
    const runekit = getRunekit();
    const collection = getCollectionBySlug(runekit, params.slug);
    if (!collection) {
      throw error(404, `Unknown collection: ${params.slug}`);
    }

    const adapter = createAdminQueryAdapter(runekit);
    const remove = handleCollectionDelete(collection, adapter);
    return await remove({ request });
  },
};
