import { createAdminQueryAdapter } from "$lib/server/admin-adapter.js";
import { getRunekit } from "$lib/server/runekit.js";

export async function load() {
  const runekit = getRunekit();
  const adapter = createAdminQueryAdapter(runekit);

  const collections = await Promise.all(
    runekit.collections.map(async (collection) => ({
      slug: collection.slug,
      label: collection.labels?.plural ?? collection.slug,
      count: await adapter.count(collection.slug),
    })),
  );

  return {
    collections,
  };
}
