/**
 * Server-only entry point for sveltekit-runelayer.
 * Importing this module in client/browser code will cause a runtime error.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "@flaming-codes/sveltekit-runelayer/sveltekit/server must not be imported in client code. " +
      "Use @flaming-codes/sveltekit-runelayer/sveltekit/components for Svelte components.",
  );
}

export { createRunelayerApp } from "./app.js";
export { defineRunelayerDrizzleConfig } from "./drizzle-config.js";
export { createRunelayerHandle, createRunelayerAdminRoute } from "./helpers.js";
export type { RunelayerAppGetter } from "./helpers.js";
export type {
  CollectionInput,
  RunelayerAdminConfig,
  RunelayerAdminFormData,
  RunelayerAdminPageProps,
  RunelayerAdminUIConfig,
  RunelayerAdminRuntime,
  RunelayerApp,
  RunelayerAppConfig,
  RunelayerQueryApi,
  SvelteKitUtils,
} from "./types.js";
