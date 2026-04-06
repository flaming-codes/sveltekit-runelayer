import type { HookContext } from "./types.js";

type BeforeHook = (ctx: HookContext) => Promise<HookContext> | HookContext;
type AfterHook = (ctx: any) => Promise<void> | void;

export async function runBeforeHooks(
  hooks: BeforeHook[] | undefined,
  context: HookContext,
): Promise<HookContext> {
  if (!hooks?.length) return context;

  let ctx = context;
  for (const hook of hooks) {
    const result = await hook(ctx);
    if (result == null) {
      throw new Error("[runelayer] beforeHook must return HookContext — did you forget to return?");
    }
    ctx = result;
  }
  return ctx;
}

export async function runAfterHooks(
  hooks: AfterHook[] | undefined,
  context: unknown,
): Promise<void> {
  if (!hooks?.length) return;

  for (const hook of hooks) {
    try {
      await hook(context);
    } catch (err) {
      console.error("[runelayer] afterHook error:", err);
    }
  }
}
