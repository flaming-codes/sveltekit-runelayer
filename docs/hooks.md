# Hooks System

Hooks are lifecycle callbacks that run before and after CRUD operations. They enable data transformation, side effects, and custom business logic without modifying the core query layer.

## Hook Types

| Hook           | When                 | Can Modify Data            | Error Behavior                     |
| -------------- | -------------------- | -------------------------- | ---------------------------------- |
| `beforeChange` | Before create/update | Yes (return modified data) | Throws — blocks the operation      |
| `afterChange`  | After create/update  | No                         | Caught and logged — does not block |
| `beforeDelete` | Before delete        | No (can throw to abort)    | Throws — blocks the operation      |
| `afterDelete`  | After delete         | No                         | Caught and logged — does not block |
| `beforeRead`   | Before read/find     | No (can throw to abort)    | Throws — blocks the operation      |
| `afterRead`    | After read/find      | No                         | Caught and logged — does not block |

## Hook Signatures

### Schema-Level Hooks (in CollectionConfig)

```ts
type HookArgs = {
  req: Request;
  data: Record<string, unknown>;
  originalDoc?: Record<string, unknown>;
  id?: string;
};

type BeforeChangeHook = (
  args: HookArgs,
) => Record<string, unknown> | Promise<Record<string, unknown>>;
type AfterChangeHook = (args: HookArgs) => void | Promise<void>;
type BeforeDeleteHook = (args: Omit<HookArgs, "data">) => void | Promise<void>;
type AfterDeleteHook = (args: Omit<HookArgs, "data">) => void | Promise<void>;
type BeforeReadHook = (args: Omit<HookArgs, "data">) => void | Promise<void>;
type AfterReadHook = (
  args: Omit<HookArgs, "data"> & { doc: Record<string, unknown> },
) => void | Promise<void>;
```

### Hooks Runner (Internal)

The hooks runner module uses a broader `HookContext` type:

```ts
interface HookContext {
  collection: string;
  operation: "create" | "read" | "update" | "delete";
  req?: Request;
  data?: Record<string, unknown>;
  id?: string;
  existingDoc?: Record<string, unknown>;
}
```

## Usage in Collections

```ts
const Posts = defineCollection({
  slug: "posts",
  fields: [
    /* ... */
  ],
  hooks: {
    beforeChange: [
      // Auto-generate slug from title
      (args) => {
        if (args.data.title && !args.data.slug) {
          return {
            ...args,
            data: {
              ...args.data,
              slug: args.data.title.toString().toLowerCase().replace(/\s+/g, "-"),
            },
          };
        }
        return args;
      },
    ],

    afterChange: [
      // Send notification
      async (args) => {
        await sendWebhook("post-updated", { id: args.id, data: args.data });
      },
    ],

    beforeDelete: [
      // Prevent deletion of pinned posts
      async (args) => {
        const doc = await findById(db, table, args.id!);
        if (doc?.pinned) throw new Error("Cannot delete pinned post");
      },
    ],
  },
});
```

## Execution Model

### Before Hooks

Run **sequentially** in array order. Each hook receives the context and can return a modified version:

```ts
async function runBeforeHooks(hooks, context): Promise<HookContext> {
  let ctx = context;
  for (const hook of hooks) {
    ctx = await hook(ctx);
  }
  return ctx;
}
```

- If a hook throws, the operation is aborted and the error propagates
- If a hook returns modified data, subsequent hooks and the DB operation receive the modified data
- Hooks that do not modify data should return the context unchanged

### After Hooks

Run **sequentially** with error isolation:

```ts
async function runAfterHooks(hooks, context): Promise<void> {
  for (const hook of hooks) {
    try {
      await hook(context);
    } catch (err) {
      console.error("[runelayer] afterHook error:", err);
    }
  }
}
```

- Errors are caught and logged but do not block the response
- The operation has already completed when after-hooks run
- After hooks receive the final document in the context

## Hook Execution Order in Query Operations

For a `create` operation:

1. Access control check
2. `beforeChange` hooks (can modify `data`)
3. Database `insertOne` (uses potentially modified data from hooks)
4. `afterChange` hooks (receive the created document)

For an `update` operation:

1. Access control check
2. Fetch existing document
3. `beforeChange` hooks (receive `data`, `id`, `existingDoc`)
4. Database `updateOne`
5. `afterChange` hooks

For a `remove` operation:

1. Access control check
2. `beforeDelete` hooks
3. Database `deleteOne`
4. `afterDelete` hooks

For `find`/`findOne` operations:

1. Access control check
2. `beforeRead` hooks
3. Database query
4. `afterRead` hooks

## Global Hooks

Globals support a subset of hooks:

```ts
interface GlobalHooks {
  beforeChange?: BeforeChangeHook[];
  afterChange?: AfterChangeHook[];
  beforeRead?: BeforeReadHook[];
  afterRead?: AfterReadHook[];
}
```

No delete hooks — globals cannot be deleted.

## Empty/Undefined Hooks

If a hooks array is `undefined` or empty, the runner returns the context unchanged with no overhead.
