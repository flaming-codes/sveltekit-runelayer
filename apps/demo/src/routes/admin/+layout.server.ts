import { getRunekit } from "$lib/server/runekit.js";
import { toSerializable } from "$lib/server/serializable.js";

export async function load() {
  const runekit = getRunekit();
  return {
    collections: toSerializable(runekit.collections),
    globals: toSerializable(runekit.globals),
    user: { email: "admin@demo.local" },
  };
}
