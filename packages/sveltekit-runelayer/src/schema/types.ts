// Shared types for the Runelayer schema system

export type AccessFn = (args: {
  req: Request;
  id?: string;
  data?: unknown;
}) => boolean | Promise<boolean>;

export type AccessControl = {
  create?: AccessFn;
  read?: AccessFn;
  update?: AccessFn;
  delete?: AccessFn;
  publish?: AccessFn;
};

export type FieldAccess = {
  create?: AccessFn;
  read?: AccessFn;
  update?: AccessFn;
};

export type ValidationFn<T = unknown> = (
  value: T,
  args: { data: Record<string, unknown> },
) => true | string;

export type HookContext = {
  collection: string;
  operation: "create" | "read" | "update" | "delete" | "publish";
  req?: Request;
  data?: Record<string, unknown>;
  id?: string;
  existingDoc?: Record<string, unknown>;
  previousStatus?: string;
};

// Backward-compatible alias for the historical schema hook naming.
export type HookArgs = HookContext;

export type BeforeChangeHook = (ctx: HookContext) => HookContext | Promise<HookContext>;
export type AfterChangeHook = (
  ctx: HookContext & { doc: Record<string, unknown> },
) => void | Promise<void>;
export type BeforeDeleteHook = (ctx: HookContext) => HookContext | Promise<HookContext>;
export type AfterDeleteHook = (ctx: HookContext) => void | Promise<void>;

export type BeforeReadHook = (ctx: HookContext) => HookContext | Promise<HookContext>;
export type AfterReadHook = (
  ctx: HookContext & { doc: Record<string, unknown> },
) => void | Promise<void>;

export type BeforePublishHook = (ctx: HookContext) => HookContext | Promise<HookContext>;
export type AfterPublishHook = (
  ctx: HookContext & { doc: Record<string, unknown> },
) => void | Promise<void>;

export type Hooks = {
  beforeChange?: BeforeChangeHook[];
  afterChange?: AfterChangeHook[];
  beforeDelete?: BeforeDeleteHook[];
  afterDelete?: AfterDeleteHook[];
  beforeRead?: BeforeReadHook[];
  afterRead?: AfterReadHook[];
  beforePublish?: BeforePublishHook[];
  afterPublish?: AfterPublishHook[];
};

export type CollectionAuthConfig = {
  tokenExpiration?: number;
  verify?: boolean;
  maxLoginAttempts?: number;
  lockTime?: number;
};

export type UploadConfig = {
  mimeTypes?: string[];
  maxSize?: number;
  imageSizes?: { name: string; width: number; height?: number }[];
};
