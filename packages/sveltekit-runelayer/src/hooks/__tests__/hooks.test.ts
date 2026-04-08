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

  it("catches async rejections without throwing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const asyncFailingHook = async () => {
      throw new Error("async boom");
    };
    await expect(runAfterHooks([asyncFailingHook], baseCtx)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("[runelayer]"),
      expect.objectContaining({ message: "async boom" }),
    );
    spy.mockRestore();
  });
});

describe("runBeforeHooks edge cases", () => {
  it("propagates errors thrown by a beforeHook", async () => {
    const throwingHook = (): HookContext => {
      throw new Error("hook exploded");
    };
    await expect(runBeforeHooks([throwingHook], baseCtx)).rejects.toThrow("hook exploded");
  });

  it("throws when beforeHook forgets to return (returns undefined)", async () => {
    const badHook = (() => undefined) as unknown as (ctx: HookContext) => HookContext;
    await expect(runBeforeHooks([badHook], baseCtx)).rejects.toThrow("must return");
  });

  it("executes hooks in order and passes accumulated state", async () => {
    const order: number[] = [];
    const hookA = (ctx: HookContext): HookContext => {
      order.push(1);
      return { ...ctx, data: { ...ctx.data, step: 1 } };
    };
    const hookB = (ctx: HookContext): HookContext => {
      order.push(2);
      expect(ctx.data?.step).toBe(1);
      return { ...ctx, data: { ...ctx.data, step: 2 } };
    };
    const hookC = (ctx: HookContext): HookContext => {
      order.push(3);
      expect(ctx.data?.step).toBe(2);
      return { ...ctx, data: { ...ctx.data, step: 3 } };
    };
    const result = await runBeforeHooks([hookA, hookB, hookC], baseCtx);
    expect(order).toEqual([1, 2, 3]);
    expect(result.data?.step).toBe(3);
  });

  it("stops execution when a hook throws (subsequent hooks do not run)", async () => {
    const tracker = vi.fn();
    const throwingHook = (): HookContext => {
      throw new Error("stop here");
    };
    const neverReachedHook = (ctx: HookContext): HookContext => {
      tracker();
      return ctx;
    };
    await expect(runBeforeHooks([throwingHook, neverReachedHook], baseCtx)).rejects.toThrow(
      "stop here",
    );
    expect(tracker).not.toHaveBeenCalled();
  });
});
