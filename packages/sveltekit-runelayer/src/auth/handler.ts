import { toSvelteKitHandler } from "better-auth/svelte-kit";
import type { RunekitAuth } from "./types.js";

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
export function createAuthHandler(runekitAuth: RunekitAuth) {
  return toSvelteKitHandler(runekitAuth.auth as any);
}
