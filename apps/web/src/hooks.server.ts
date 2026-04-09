import type { Handle } from "@sveltejs/kit";
import { createRunelayerHandle } from "@flaming-codes/sveltekit-runelayer/sveltekit/server";
import { getRunelayerApp } from "$lib/server/runelayer.js";

export const handle: Handle = createRunelayerHandle(getRunelayerApp);
