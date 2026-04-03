# Query API

The query API is the public-facing data access layer. It wraps raw database operations with access control checks and hook execution, providing a safe, consistent interface for all content operations.

If you use the high-level SvelteKit integration (`createRunelayerApp`), call queries through:

- `runelayer.withRequest(request)` for request-bound access checks
- `runelayer.system` for explicit server-context operations (seeding/jobs)

## Query Context

Every query operation requires a `QueryContext`:

```ts
interface QueryContext {
  db: RunelayerDatabase; // Database instance from createDatabase()
  collection: CollectionConfig; // Collection definition
  req?: Request; // Request for access control (optional)
}
```

If `req` is omitted and the collection has access control functions, the operation is **denied** (403). This prevents accidental access bypass in server-side code.

## Operations

### find

List documents with optional pagination and sorting.

```ts
import { find } from "@flaming-codes/sveltekit-runelayer";

const docs = await find(ctx, {
  limit: 10,
  offset: 0,
  sort: "createdAt",
  sortOrder: "desc",
});
```

```ts
interface FindArgs {
  where?: Record<string, unknown>; // Allowlisted equality filters
  limit?: number;
  offset?: number;
  sort?: string; // Column name to sort by
  sortOrder?: "asc" | "desc";
  draft?: boolean; // Include draft documents (default: false for versioned collections)
}
```

Returns an array of document objects.

`where` uses simple equality checks and only allows schema-backed fields plus core system columns (`id`, `createdAt`, `updatedAt`, and version columns when enabled). Unknown keys are rejected with a 400 error.

For versioned collections, `find()` automatically filters to `_status = 'published'` unless `draft: true` is passed. This ensures public APIs only return published content by default.

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
- payload is schema-allowlisted before write (unknown and reserved keys are rejected)
- required fields and field validators are enforced
- field-level `access.create` rules are enforced
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
- payload is schema-allowlisted before write (unknown and reserved keys are rejected)
- updated fields are validated against schema rules and validators
- field-level `access.update` rules are enforced
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

## Version Operations

These operations are available for collections with `versions` enabled.

### publish

Promote a document from draft to published. Enforces full validation (required fields must be present).

```ts
import { publish } from "@flaming-codes/sveltekit-runelayer";

const doc = await publish(ctx, "document-id");
// Sets _status = "published", increments _version, creates snapshot
```

- Checks `access.publish` (falls back to `access.update`)
- Runs `beforePublish` / `afterPublish` hooks
- Enforces all required field validation
- Creates a version snapshot

### unpublish

Revert a published document to draft.

```ts
import { unpublish } from "@flaming-codes/sveltekit-runelayer";

const doc = await unpublish(ctx, "document-id");
// Sets _status = "draft", increments _version, creates snapshot
```

### saveDraft

Save document data with relaxed validation (required fields are not enforced). Sets `_status` to "draft".

```ts
import { saveDraft } from "@flaming-codes/sveltekit-runelayer";

const doc = await saveDraft(ctx, "document-id", { title: "Work in progress" });
// Allows incomplete data, sets _status = "draft"
```

Saving a published document as draft will unpublish it (no longer returned by default `find()` calls).

### findVersionHistory

Retrieve the version history for a document.

```ts
import { findVersionHistory } from "@flaming-codes/sveltekit-runelayer";

const versions = await findVersionHistory(ctx, "document-id", { limit: 20 });
// Returns array of { id, _version, _status, createdAt, _createdBy }
```

### restoreVersion

Copy an old version's content forward as a new draft. History is never mutated — the restore creates a new version record.

```ts
import { restoreVersion } from "@flaming-codes/sveltekit-runelayer";

const doc = await restoreVersion(ctx, "document-id", "version-id");
// Copies snapshot, sets _status = "draft", increments _version
```

### Versioned Collection Behavior

When `versions` is enabled:

- `create()` sets `_status = "draft"` and `_version = 1`, creates initial snapshot
- `update()` increments `_version`, creates snapshot
- `remove()` cascade-deletes all version records
- Pruning runs automatically based on `maxPerDoc` config

Calling version operations on a non-versioned collection throws a 400 error.

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

### Field-level read projection

On read operations (`find`, `findOne`):

- field-level `access.read` rules are evaluated per field
- denied fields are redacted from returned documents
- collections with `auth: true` automatically redact auth-sensitive columns (`hash`, `salt`, `token`, `tokenExpiry`)

### checkAccess

The access check utility is also exported for custom use:

```ts
import { checkAccess } from "@flaming-codes/sveltekit-runelayer";

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
- Field-level access denied: throws `Error` with `.status = 403`
- Schema enforcement errors (unknown fields, invalid sort/where keys, validation failures): throw `Error` with `.status = 400`
- Before-hook errors: propagate and abort the operation
- After-hook errors: caught and logged, do not affect the response
- Database errors: propagate from Drizzle (typically constraint violations)

## Low-Level Operations

For cases where you need to bypass access control and hooks (e.g., migrations, seeding), use the raw database operations directly:

```ts
import {
  findMany,
  findById,
  insertOne,
  updateOne,
  deleteOne,
} from "@flaming-codes/sveltekit-runelayer";

// Direct DB access — no access checks, no hooks
const docs = await findMany(db, table);
const doc = await insertOne(db, table, { title: "Seeded" });
```
