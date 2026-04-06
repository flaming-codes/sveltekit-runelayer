export type {
  HookContext,
  BeforeChangeHook,
  AfterChangeHook,
  BeforeDeleteHook,
  AfterDeleteHook,
  BeforeReadHook,
  AfterReadHook,
  BeforePublishHook,
  AfterPublishHook,
  Hooks,
} from "../schema/types.js";

import type { Hooks } from "../schema/types.js";

export type CollectionHooks = Hooks;

export type GlobalHooks = Pick<Hooks, "beforeChange" | "afterChange" | "beforeRead" | "afterRead">;

export { runBeforeHooks, runAfterHooks } from "./runner.js";
