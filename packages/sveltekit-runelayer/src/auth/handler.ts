import { toSvelteKitHandler } from "better-auth/svelte-kit";
import type { RunelayerAuth } from "./types.js";

/**
 * Creates a SvelteKit request handler for Better Auth API endpoints.
 * Mount this at your auth base path (default `/api/auth`).
 *
 * Usage in `src/routes/api/auth/[...all]/+server.ts`:
 * ```ts
 * import { auth } from "$lib/auth";
 * import { createAuthHandler } from "@flaming-codes/sveltekit-runelayer";
 * const handler = createAuthHandler(auth);
 * export const GET = handler;
 * export const POST = handler;
 * ```
 */
export function createAuthHandler(runelayerAuth: RunelayerAuth) {
  return toSvelteKitHandler(runelayerAuth.auth as any);
}
