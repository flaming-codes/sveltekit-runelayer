import type { RunekitConfig } from "./config.js";

/**
 * Creates the Runekit SvelteKit integration.
 * This will be expanded to register admin routes, db, auth, and storage.
 */
export function createRunekit(config: RunekitConfig = {}) {
  const adminPath = config.adminPath ?? "/admin";

  return {
    name: "runekit",
    adminPath,
  };
}
