import { createAuthHandler } from "@flaming-codes/sveltekit-runelayer";
import { getRunekit } from "$lib/server/runekit.js";

// Lazy handler - initialized on first request
let _handler: ReturnType<typeof createAuthHandler> | undefined;

function handler(event: any) {
  if (!_handler) {
    _handler = createAuthHandler(getRunekit().auth);
  }
  return _handler(event);
}

export const GET = handler;
export const POST = handler;
