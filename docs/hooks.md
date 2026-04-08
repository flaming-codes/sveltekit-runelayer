# Hooks System

Hooks are lifecycle callbacks that run around query and global operations. They are the extension point for data transformation, side effects, and policy checks that need access to the public document shape rather than storage keys.

## Hook Types

| Hook            | When                     | Can Modify Context         | Error Behavior                     |
| --------------- | ------------------------ | -------------------------- | ---------------------------------- |
| `beforeChange`  | Before create/update     | Yes                        | Throws — blocks the operation      |
| `afterChange`   | After create/update      | No                         | Caught and logged — does not block |
| `beforeDelete`  | Before delete            | Yes, but no persisted data | Throws — blocks the operation      |
| `afterDelete`   | After delete             | No                         | Caught and logged — does not block |
| `beforeRead`    | Before find/findOne      | Yes                        | Throws — blocks the operation      |
| `afterRead`     | After each document read | No                         | Caught and logged — does not block |
| `beforePublish` | Before publish           | Yes                        | Throws — blocks the operation      |
| `afterPublish`  | After publish            | No                         | Caught and logged — does not block |

## Hook Context

Collections and globals use the same runtime hook context shape.

```ts
type HookContext = {
  collection: string;
  operation: "create" | "read" | "update" | "delete" | "publish";
  req?: Request;
  data?: Record<string, unknown>;
  id?: string;
  existingDoc?: Record<string, unknown>;
  previousStatus?: string;
};

type BeforeChangeHook = (ctx: HookContext) => HookContext | Promise<HookContext>;
type AfterChangeHook = (
  ctx: HookContext & { doc: Record<string, unknown> },
) => void | Promise<void>;
type BeforeDeleteHook = (ctx: HookContext) => HookContext | Promise<HookContext>;
type AfterDeleteHook = (ctx: HookContext) => void | Promise<void>;
type BeforeReadHook = (ctx: HookContext) => HookContext | Promise<HookContext>;
type AfterReadHook = (ctx: HookContext & { doc: Record<string, unknown> }) => void | Promise<void>;
type BeforePublishHook = (ctx: HookContext) => HookContext | Promise<HookContext>;
type AfterPublishHook = (
  ctx: HookContext & { doc: Record<string, unknown> },
) => void | Promise<void>;
```

The schema layer still exports `HookArgs` as a backward-compatible alias for `HookContext`.

Hook payloads use the public document contract. Group fields appear as nested objects in `data`, `existingDoc`, and `doc`, even though persistence uses flattened storage keys internally.

## Usage in Collections

```ts
const Posts = defineCollection({
  slug: "posts",
  fields: [
    { name: "title", ...text({ required: true }) },
    {
      name: "seo",
      ...group({
        fields: [{ name: "metaTitle", ...text() }],
      }),
    },
  ],
  hooks: {
    beforeChange: [
      (ctx) => {
        if (ctx.data?.title && !ctx.data.slug) {
          return {
            ...ctx,
            data: {
              ...ctx.data,
              slug: ctx.data.title.toString().toLowerCase().replace(/\s+/g, "-"),
            },
          };
        }
        return ctx;
      },
    ],
    afterChange: [
      async (ctx) => {
        await sendWebhook("post-updated", {
          id: ctx.doc.id,
          data: ctx.data,
          seo: ctx.doc.seo,
        });
      },
    ],
  },
});
```

## Execution Model

### Before Hooks

Before hooks run sequentially in array order. Each hook receives the full context and may return a modified context.

```ts
async function runBeforeHooks(hooks, context): Promise<HookContext> {
  if (!hooks?.length) return context;

  let ctx = context;
  for (const hook of hooks) {
    ctx = await hook(ctx);
  }
  return ctx;
}
```

- If a hook throws, the operation is aborted and the error propagates.
- If a hook changes `ctx.data`, later hooks and the write operation receive the updated payload.
- Hooks that do not need to modify anything should return the original context.

### After Hooks

After hooks run sequentially with error isolation. Their return values are ignored.

```ts
async function runAfterHooks(hooks, context): Promise<void> {
  if (!hooks?.length) return;

  for (const hook of hooks) {
    try {
      await hook(context);
    } catch (err) {
      console.error("[runelayer] afterHook error:", err);
    }
  }
}
```

- Errors are caught and logged but do not block the response.
- After hooks should be treated as side-effect-only.
- `afterRead` runs once per returned document, including `find()` results.

## Hook Execution Order

For `create()`:

1. Access control check
2. `beforeChange` hooks
3. Validation and persistence
4. `afterChange` hooks with the created document

For `update()` and `saveDraft()`:

1. Fetch existing document
2. Access control check
3. `beforeChange` hooks with `data`, `id`, and `existingDoc`
4. Validation and persistence
5. `afterChange` hooks with the updated document

For `publish()`:

1. Fetch existing document
2. Publish access check
3. `beforePublish` hooks with `existingDoc` and `previousStatus`
4. Validation and persistence
5. `afterPublish` hooks with the published document

For `remove()`:

1. Access control check
2. `beforeDelete` hooks
3. Delete
4. `afterDelete` hooks

For `find()` and `findOne()`:

1. Access control check
2. `beforeRead` hooks
3. Read and materialize nested documents
4. `afterRead` hooks with each materialized document

## Global Hooks

Globals support the read and change hooks only.

```ts
type GlobalHooks = {
  beforeChange?: BeforeChangeHook[];
  afterChange?: AfterChangeHook[];
  beforeRead?: BeforeReadHook[];
  afterRead?: AfterReadHook[];
};
```

Globals do not support delete or publish-specific hooks.

## Empty Hooks

If a hook array is `undefined` or empty, the runner returns immediately with no extra work.
