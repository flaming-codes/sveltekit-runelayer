import { getRunelayerApp } from "$lib/server/runelayer.js";

const app = getRunelayerApp();

export const load = app.admin.load;
export const actions = app.admin.actions;
