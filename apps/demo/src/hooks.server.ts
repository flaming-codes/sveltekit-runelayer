import type { Handle } from "@sveltejs/kit";
import { getRunekit } from "$lib/server/runekit.js";
import { seed } from "$lib/server/seed.js";

let seeded = false;

export const handle: Handle = async ({ event, resolve }) => {
  const runekit = getRunekit();

  // Auto-seed on first request
  if (!seeded) {
    await seed(runekit);
    seeded = true;
  }

  return runekit.handle({ event, resolve });
};
