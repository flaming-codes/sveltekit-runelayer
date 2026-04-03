export interface HookContext {
  collection: string;
  operation: "create" | "read" | "update" | "delete" | "publish";
  req?: Request;
  data?: Record<string, unknown>;
  id?: string;
  existingDoc?: Record<string, unknown>;
  previousStatus?: string;
}

export type BeforeChangeHook = (ctx: HookContext) => Promise<HookContext> | HookContext;
export type AfterChangeHook = (
  ctx: HookContext & { doc: Record<string, unknown> },
) => Promise<void> | void;
export type BeforeDeleteHook = (ctx: HookContext) => Promise<HookContext> | HookContext;
export type AfterDeleteHook = (ctx: HookContext) => Promise<void> | void;
export type BeforeReadHook = (ctx: HookContext) => Promise<HookContext> | HookContext;
export type AfterReadHook = (
  ctx: HookContext & { doc: Record<string, unknown> },
) => Promise<Record<string, unknown>>;

export type BeforePublishHook = (ctx: HookContext) => Promise<HookContext> | HookContext;
export type AfterPublishHook = (
  ctx: HookContext & { doc: Record<string, unknown> },
) => Promise<void> | void;

export interface CollectionHooks {
  beforeChange?: BeforeChangeHook[];
  afterChange?: AfterChangeHook[];
  beforeDelete?: BeforeDeleteHook[];
  afterDelete?: AfterDeleteHook[];
  beforeRead?: BeforeReadHook[];
  afterRead?: AfterReadHook[];
  beforePublish?: BeforePublishHook[];
  afterPublish?: AfterPublishHook[];
}

export interface GlobalHooks {
  beforeChange?: BeforeChangeHook[];
  afterChange?: AfterChangeHook[];
  beforeRead?: BeforeReadHook[];
  afterRead?: AfterReadHook[];
}
