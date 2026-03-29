import { describe, it, expect, vi } from "vitest";
import { runBeforeHooks, runAfterHooks } from "../runner.js";
import type { HookContext } from "../types.js";

const baseCtx: HookContext = {
  collection: "posts",
  operation: "create",
  data: { title: "Hello" },
};

describe("runBeforeHooks", () => {
  it("returns context unchanged when hooks is undefined", async () => {
    const result = await runBeforeHooks(undefined, baseCtx);
    expect(result).toBe(baseCtx);
  });

  it("returns context unchanged when hooks is empty", async () => {
    const result = await runBeforeHooks([], baseCtx);
    expect(result).toBe(baseCtx);
  });

  it("runs hooks in sequence passing modified context", async () => {
    const hookA = (ctx: HookContext): HookContext => ({
      ...ctx,
      data: { ...ctx.data, addedByA: true },
    });
    const hookB = (ctx: HookContext): HookContext => ({
      ...ctx,
      data: { ...ctx.data, addedByB: true },
    });
    const result = await runBeforeHooks([hookA, hookB], baseCtx);
    expect(result.data).toEqual({ title: "Hello", addedByA: true, addedByB: true });
  });

  it("supports async hooks", async () => {
    const asyncHook = async (ctx: HookContext): Promise<HookContext> => ({
      ...ctx,
      data: { ...ctx.data, async: true },
    });
    const result = await runBeforeHooks([asyncHook], baseCtx);
    expect(result.data?.async).toBe(true);
  });
});

describe("runAfterHooks", () => {
  it("does nothing when hooks is undefined", async () => {
    await expect(runAfterHooks(undefined, baseCtx)).resolves.toBeUndefined();
  });

  it("does nothing when hooks is empty", async () => {
    await expect(runAfterHooks([], baseCtx)).resolves.toBeUndefined();
  });

  it("catches errors without throwing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failingHook = () => {
      throw new Error("boom");
    };
    await expect(runAfterHooks([failingHook], baseCtx)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("continues running remaining hooks after an error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const tracker = vi.fn();
    const failingHook = () => {
      throw new Error("boom");
    };
    const goodHook = (ctx: unknown) => {
      tracker(ctx);
    };
    await runAfterHooks([failingHook, goodHook], baseCtx);
    expect(tracker).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
