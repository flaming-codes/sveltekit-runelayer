import { createRunelayerAdminRoute } from "@flaming-codes/sveltekit-runelayer/sveltekit/server";
import { getRunelayerApp } from "$lib/server/runelayer.js";

export const { load, actions } = createRunelayerAdminRoute(getRunelayerApp);
