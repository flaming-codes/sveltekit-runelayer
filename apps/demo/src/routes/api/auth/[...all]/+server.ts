import type { RequestHandler } from "@sveltejs/kit";
import { createAuthHandler } from "@flaming-codes/sveltekit-runelayer";
import { getRunekit } from "$lib/server/runekit.js";

let _handler: RequestHandler | undefined;

const handler: RequestHandler = (event) => {
  if (!_handler) {
    _handler = createAuthHandler(getRunekit().auth) as RequestHandler;
  }
  return _handler(event);
};

export const GET = handler;
export const POST = handler;
