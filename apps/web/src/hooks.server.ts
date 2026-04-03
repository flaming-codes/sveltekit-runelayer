import type { Handle } from "@sveltejs/kit";
import { getRunelayerApp } from "$lib/server/runelayer.js";

export const handle: Handle = async ({ event, resolve }) => {
  const app = getRunelayerApp();
  return app.handle({ event, resolve });
};
