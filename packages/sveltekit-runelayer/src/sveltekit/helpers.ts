import { error as kitError, type Actions, type Handle } from "@sveltejs/kit";
import type { RunelayerApp } from "./types.js";
import { ADMIN_ACTION_NAMES } from "./admin-action-names.js";

export type RunelayerAppGetter = () => RunelayerApp;

/**
 * Creates a SvelteKit `handle` hook without resolving the app instance at module load time.
 * This keeps app initialization deferred to request handling.
 */
export function createRunelayerHandle(getApp: RunelayerAppGetter): Handle {
  return async ({ event, resolve }) => {
    return getApp().handle({ event, resolve });
  };
}

/**
 * Creates `{ load, actions }` for `+page.server.ts` without resolving the app instance
 * during module evaluation.
 */
export function createRunelayerAdminRoute(
  getApp: RunelayerAppGetter,
): Pick<RunelayerApp["admin"], "load" | "actions"> {
  const load: RunelayerApp["admin"]["load"] = async (event) => {
    return getApp().admin.load(event);
  };

  const actions = {} as Actions;
  for (const actionName of ADMIN_ACTION_NAMES) {
    actions[actionName] = async (event) => {
      const action = getApp().admin.actions[actionName];
      if (typeof action !== "function") {
        throw kitError(404, `Unknown admin action: ${actionName}`);
      }
      return action(event);
    };
  }

  return { load, actions };
}
