/**
 * Client-safe Svelte components for the sveltekit-runelayer admin UI.
 * This module contains NO server-only imports and is safe for browser bundles.
 */
export { default as AdminPage } from "./AdminPage.svelte";
export { default as AdminErrorPage } from "./AdminErrorPage.svelte";
export { default as AdminRoutePage } from "./AdminPage.svelte";
export type { RunelayerAdminPageProps, RunelayerAdminUIConfig } from "./types.js";
