import type {
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
};

export type CollectionHooks = Hooks;

export type GlobalHooks = Pick<Hooks, "beforeChange" | "afterChange" | "beforeRead" | "afterRead">;
