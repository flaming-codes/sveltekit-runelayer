# Query API

The query API is the public-facing data access layer. It wraps raw database operations with access control checks and hook execution, providing a safe, consistent interface for all content operations.

## Query Context

Every query operation requires a `QueryContext`:

```ts
interface QueryContext {
  db: RunekitDatabase; // Database instance from createDatabase()
  collection: CollectionConfig; // Collection definition
  req?: Request; // Request for access control (optional)
}
```

If `req` is omitted and the collection has access control functions, the operation is **denied** (403). This prevents accidental access bypass in server-side code.

## Operations

### find

List documents with optional pagination and sorting.

```ts
import { find } from "runekit";

const docs = await find(ctx, {
  limit: 10,
  offset: 0,
  sort: "createdAt",
  sortOrder: "desc",
});
```

```ts
interface FindArgs {
  where?: Record<string, unknown>; // Filter conditions (not yet implemented)
  limit?: number;
  offset?: number;
  sort?: string; // Column name to sort by
  sortOrder?: "asc" | "desc";
}
```

Returns an array of document objects.

### findOne

Get a single document by ID.

```ts
const doc = await findOne(ctx, "document-id");
// Returns the document object or undefined
```

### create

Create a new document.

```ts
const doc = await create(ctx, {
  title: "New Post",
  status: "draft",
});
// Returns the created document with auto-generated id and timestamps
```

- ID is auto-generated using `crypto.randomUUID()`
- `createdAt` and `updatedAt` are auto-set to the current ISO timestamp
- `beforeChange` hooks can modify the data before insertion
- `afterChange` hooks run after the insert with the created document

### update

Update an existing document.

```ts
const doc = await update(ctx, "document-id", {
  title: "Updated Title",
});
// Returns the updated document
```

- `updatedAt` is auto-refreshed
- The existing document is fetched and passed to hooks as `existingDoc`
- `beforeChange` hooks can modify the update data
- `afterChange` hooks run after the update

### remove

Delete a document.

```ts
const doc = await remove(ctx, "document-id");
// Returns the deleted document
```

- `beforeDelete` hooks can throw to abort deletion
- `afterDelete` hooks run after the delete

## Access Control Integration

Access control is checked automatically before every operation:

```ts
// Collection with access control
const Posts = defineCollection({
  slug: "posts",
  access: {
    create: isLoggedIn(),
    read: () => true,
    update: isLoggedIn(),
    delete: isAdmin(),
  },
  fields: [
    /* ... */
  ],
});

// This works — public read
const docs = await find(ctx);

// This throws 403 — requires authentication
const created = await create(ctx, { title: "New" });
```

### Access Check Rules

| AccessFn    | Request                   | Result               |
| ----------- | ------------------------- | -------------------- |
| Not defined | Any                       | **Allowed** (public) |
| Defined     | Provided, returns `true`  | **Allowed**          |
| Defined     | Provided, returns `false` | **Denied** (403)     |
| Defined     | Not provided              | **Denied** (403)     |

The deny-by-default when no request is provided prevents accidental bypass in server-side code.

### checkAccess

The access check utility is also exported for custom use:

```ts
import { checkAccess } from "runekit";

try {
  await checkAccess(accessFn, request, data, id);
  // Access granted
} catch (err) {
  // err.status === 403
}
```

## Hook Integration

Hooks are called automatically during query operations. See [hooks.md](./hooks.md) for the full execution model.

The query layer maps between the `HookContext` used by the runner and the collection's `Hooks` configuration. `beforeChange` hooks that modify `ctx.data` have their changes applied to the database operation.

## Error Handling

- Access denied: throws `Error` with `.status = 403`
- Before-hook errors: propagate and abort the operation
- After-hook errors: caught and logged, do not affect the response
- Database errors: propagate from Drizzle (typically constraint violations)

## Low-Level Operations

For cases where you need to bypass access control and hooks (e.g., migrations, seeding), use the raw database operations directly:

```ts
import { findMany, findById, insertOne, updateOne, deleteOne } from "runekit";

// Direct DB access — no access checks, no hooks
const docs = findMany(db, table);
const doc = insertOne(db, table, { title: "Seeded" });
```
