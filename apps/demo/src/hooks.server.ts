import type { Handle } from "@sveltejs/kit";
import { getRunelayerApp } from "$lib/server/runelayer.js";
import { seed } from "$lib/server/seed.js";

let seeded = false;

export const handle: Handle = async ({ event, resolve }) => {
  const app = getRunelayerApp();

  // Auto-seed on first request
  if (!seeded) {
    await seed(app);
    seeded = true;
  }

  return app.handle({ event, resolve });
};
