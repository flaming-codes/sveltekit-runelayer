/**
 * @deprecated Import from `@flaming-codes/sveltekit-runelayer/sveltekit/server`
 * or `@flaming-codes/sveltekit-runelayer/sveltekit/components` instead.
 *
 * This combined entry point will be removed in a future major version.
 */
export { createRunelayerApp } from "./app.js";
export { defineRunelayerDrizzleConfig } from "./drizzle-config.js";
export { default as AdminPage } from "./AdminPage.svelte";
export { default as AdminErrorPage } from "./AdminErrorPage.svelte";
export type {
  CollectionInput,
  RunelayerAdminConfig,
  RunelayerAdminTheme,
  RunelayerAdminUIConfig,
  RunelayerAdminRuntime,
  RunelayerApp,
  RunelayerAppConfig,
  RunelayerQueryApi,
} from "./types.js";
