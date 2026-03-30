# Database Implementation Review

## Synopsis

The database layer is cleanly factored: schema definitions drive Drizzle table generation, a thin CRUD wrapper provides low-level operations, and a query layer adds access control and hooks on top. The design is sound for a v1 CMS-as-a-package but has several gaps that will become production risks as usage grows -- no transaction support, no foreign-key enforcement, no indexes beyond primary keys, untyped return values, and incomplete `where`-clause filtering.

## Grade: 6/10

## Architecture Overview

```
CollectionConfig[]
   |  generateTables()          -- src/db/schema.ts
   v
GeneratedTables (slug -> SQLiteTable)
   |  createDatabase()          -- src/db/init.ts
   v
RunelayerDatabase { db, tables, client }
   |  findMany / insertOne / ... -- src/db/operations.ts
   v
query layer (find / create / update / remove)  -- src/query/operations.ts
   + checkAccess()              -- src/query/access.ts
   + runBeforeHooks / runAfterHooks -- src/hooks/runner.ts
```

`createDrizzleKitSchema()` merges collection tables with Better Auth tables so hosts can run `drizzle-kit` migrations externally before app startup. Tests use `applySchemaForTests()` which issues raw `CREATE TABLE` / `ALTER TABLE` DDL derived from Drizzle table metadata.

## Detailed Analysis

### Schema-to-Table Mapping

**Strengths:**

- Clean recursive `mapField` handles groups (prefix flattening), arrays (child table), rows/collapsibles (pass-through), and hasMany relationships (join table).
- Auto columns (`id`, `createdAt`, `updatedAt`) are consistent across all tables.
- Version (`_status`, `_version`) and auth (`hash`, `salt`, `token`, `tokenExpiry`) columns are added conditionally.

**Issues:**

1. **No foreign-key constraints on relationship columns.**
   `/packages/sveltekit-runelayer/src/db/schema.ts`, lines 36-37 -- a single relationship stores the related ID as bare `text(col)`. There is no `.references()` call, so the database will happily accept dangling IDs. The join table for hasMany (lines 106-110) also has no FK constraints. Contrast with `auth/schema.ts` line 28 where `authSessionTable.userId` correctly uses `.references(() => authUserTable.id, { onDelete: "cascade" })`.

2. **No secondary indexes.**
   The only index on any collection table is the primary key. Common query patterns (sort by `createdAt`, lookup by `slug`, filter by `status`) will all do full table scans. The auth schema does define a composite unique index (`account_provider_account_idx`), proving the pattern is available but unused for collection tables.

3. **Array child tables lack a foreign-key to the parent.**
   `/packages/sveltekit-runelayer/src/db/schema.ts`, line 99 -- `_parentId` is `text("_parentId").notNull()` with no `.references()` and no index. Querying child rows for a parent will scan the entire child table.

4. **`_parentId` on array tables vs `parentId` on join tables -- inconsistent naming.**
   Array tables use `_parentId` (line 99), join tables use `parentId` (line 108). Pick one convention.

5. **Nested array/group fields inside arrays are not handled.**
   `generateTables` only walks top-level fields for auxiliary tables. If an `array` field contains a nested `array` or `hasMany` relationship, those structures are silently dropped.

6. **`timestamps: true` on CollectionConfig is declared but never read.**
   `/packages/sveltekit-runelayer/src/db/schema.ts` lines 74-75 destructure `{ slug, fields, versions, auth }` but never `timestamps`. The `createdAt`/`updatedAt` columns are always generated regardless of the `timestamps` flag.

### Query Layer

**Strengths:**

- Clean separation of concerns: access check, before-hooks, DB operation, after-hooks.
- `checkAccess` is deny-by-default when an access function is defined but no `Request` is present -- good security posture.
- After-hook errors are caught and logged, preventing downstream failures.

**Issues:**

1. **`FindArgs.where` is declared but never wired.**
   `/packages/sveltekit-runelayer/src/query/types.ts` line 11 declares `where?: Record<string, unknown>` but `/packages/sveltekit-runelayer/src/query/operations.ts` line 22 never passes `args.where` to `findMany`. The low-level `findMany` accepts `where?: SQL` (a Drizzle SQL expression), but the query layer's `Record<string, unknown>` type would need conversion logic. This means users cannot filter data through the query API at all -- they must fetch everything and filter in JS.

2. **No transaction wrapping for multi-step operations.**
   `update` (query/operations.ts line 53-61) reads the existing doc, runs hooks, then writes. If two concurrent updates hit the same document, both read the same `existingDoc`, both run hooks, and the last write wins silently. For `remove`, there is no check that the document still exists between the access check and the delete.

3. **`update` does not verify the document exists before writing.**
   Line 55 fetches `existingDoc` and passes it to hooks, but if the document does not exist (`existingDoc` is `undefined`), the `updateOne` call proceeds anyway. Drizzle's `update().where().returning().get()` will return `undefined`, which is silently returned to the caller. This should throw a 404.

4. **Caller data can override auto-generated fields.**
   `/packages/sveltekit-runelayer/src/db/operations.ts` line 36:

   ```ts
   const row = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...data };
   ```

   The spread of `data` after auto-fields means a caller can inject `id`, `createdAt`, or `updatedAt` values. Similarly, `updateOne` (line 49) allows overriding `updatedAt`. This could cause ID collisions or timestamp manipulation.

5. **No `count` / `totalDocs` support in `findMany`.**
   Pagination without knowing the total count forces the client to over-fetch or make separate raw queries.

6. **No relationship population / eager loading.**
   Relationship fields store IDs, but there is no mechanism to join or populate related documents. The E2E test at `blog-cms.e2e.test.ts` lines 366-385 manually loops to verify references -- this is an N+1 pattern that would be the caller's burden in production.

### TypeScript Typing

**Issues:**

1. **`AnyTable` (`SQLiteTableWithColumns<any>`) erases column type safety.**
   `/packages/sveltekit-runelayer/src/db/operations.ts` line 5 -- all CRUD functions accept `AnyTable`. Return types from `insertOne`, `findById`, etc. are `any`. The query layer (query/operations.ts) returns these untyped results directly. Callers must cast, as seen throughout the E2E tests (e.g., `doc.id as string`).

2. **`Record<string, unknown>` for data parameters.**
   Both the low-level `insertOne`/`updateOne` and the query-layer `create`/`update` accept `Record<string, unknown>`. There is no compile-time protection against passing invalid column names or wrong value types.

3. **Hook type mismatches papered over with `as any`.**
   `/packages/sveltekit-runelayer/src/query/operations.ts` lines 21, 27, 33, 45, 56, 60, 67, 72 all cast hook arrays with `as any`. The `schema/types.ts` hook types (`BeforeChangeHook`) expect `HookArgs` with a required `req: Request`, but `hooks/types.ts` defines a different `HookContext` with optional `req`. These two type systems are incompatible and need reconciliation.

### Performance

1. **No indexes** -- covered above. Every `findMany` with a sort or future `where` will scan the full table.

2. **No batch insert.**
   Bulk creation (tested in `multi-tenant.e2e.test.ts` lines 302-322) uses `Promise.all` over 20 individual `insertOne` calls. Each one is a separate round-trip. Drizzle supports `insert().values([...])` for batch inserts.

3. **Sort column lookup is unchecked.**
   `/packages/sveltekit-runelayer/src/db/operations.ts` line 18:

   ```ts
   const col = (table as any)[opts.sort.column];
   ```

   If `opts.sort.column` is not a valid column name, `col` is `undefined`, and the `sql` template tag will produce a broken query. No validation or error message is given.

4. **No connection pooling or keep-alive configuration.**
   `createDatabase` creates a single `@libsql/client` instance. For Turso remote connections, there is no configuration for connection limits, retry behavior, or health checks.

### Test Coverage

**Strengths:**

- Unit tests cover all 5 CRUD operations, table generation for arrays and join tables, version/auth column generation, and all `checkAccess` paths.
- E2E tests cover realistic multi-collection workflows (blog CMS), schema evolution across 3 migrations, role-based access control with 4 roles, hook pipelines with audit trails, multi-tenant simulation with 25 concurrent writes, and migration contract verification.
- Total: ~150+ tests across 8 E2E files and 6 unit test files.

**Gaps:**

1. **No tests for `findMany` with `where` clause** -- because the feature is not wired, but the type exists.
2. **No tests for sort on invalid columns** -- the unchecked `(table as any)[col]` path.
3. **No tests for `updateOne` on a nonexistent ID** -- both at the low-level and query layer.
4. **No tests for `deleteOne` on a nonexistent ID.**
5. **No tests for duplicate ID insertion** -- since callers can override `id`.
6. **No tests for array field CRUD** -- child table operations (`posts_tags`) are generated but never inserted/queried in any test.
7. **No tests for hasMany join table operations** -- join tables are generated and verified to exist, but no data is ever written to them.
8. **No tests for group field flattening** -- `mapField` with prefix is not exercised in any test.
9. **No concurrency tests for conflicting updates** -- the multi-tenant test does parallel creates but not parallel updates to the same document.
10. **No error-path tests for DB constraint violations** (e.g., NOT NULL violations, malformed data).

### Migration Strategy

The host-managed migration approach is architecturally sound -- the library generates schemas, `drizzle-kit` handles migrations externally. The `createDrizzleKitSchema` function correctly merges collection tables with Better Auth tables.

**Issues:**

1. **`applySchemaForTests` does not handle column removal or type changes.**
   It only adds missing columns via `ALTER TABLE ADD COLUMN`. This is fine for tests but could mislead users about what schema evolution is safe. SQLite's `ALTER TABLE` limitations mean column drops and type changes require table rebuilds.

2. **No runtime schema validation.**
   When the app starts, there is no check that the database schema matches the Drizzle table definitions. If a host forgets to run migrations, errors only surface at query time (as tested in `migration-contract.test.ts`).

### Error Handling

1. **Database errors propagate raw from Drizzle/libsql.**
   There is no error wrapping or normalization. A `NOT NULL constraint failed` from SQLite will bubble up with its raw message. Users get no guidance about which field or collection caused the error.

2. **No retry logic for transient errors.**
   For Turso remote connections, network failures will throw immediately with no retry.

3. **`deleteOne` and `updateOne` return `undefined` silently when the target row does not exist.**
   The `.returning().get()` call returns `undefined` for zero affected rows. The query layer passes this through without checking.

## Action Items

### Critical

- **Wire `where` filtering or remove it from the type.** `FindArgs.where` is a dead declaration at `/packages/sveltekit-runelayer/src/query/types.ts:11`. Users will try to use it and get silently ignored filters, leading to data leaks (e.g., multi-tenant scenarios where tenant filtering is expected). Either implement the conversion from `Record<string, unknown>` to Drizzle `SQL` expressions, or remove the field and document that filtering must be done at the application layer.

- **Prevent caller override of auto-generated fields.** In `/packages/sveltekit-runelayer/src/db/operations.ts:36`, strip `id`, `createdAt`, and `updatedAt` from the incoming `data` before spreading, or spread `data` first and auto-fields after:

  ```ts
  const row = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  ```

- **Add foreign-key constraints to relationship columns and join/array tables.** This prevents orphaned references and enables cascading deletes. The pattern is already established in `auth/schema.ts`.

### Medium

- **Throw 404 when `update` or `remove` targets a nonexistent document.** In `/packages/sveltekit-runelayer/src/query/operations.ts`, check `existingDoc` after line 55 and the return value of `deleteOne` after line 71.

- **Add secondary indexes for common access patterns.** At minimum, index `createdAt` and `updatedAt` on every collection table. Allow collections to declare additional indexed fields.

- **Add index on `_parentId` for array child tables and `parentId`/`relatedId` for join tables.** Without these, any lookup by parent will scan the full auxiliary table.

- **Wrap `update` in a transaction.** The read-modify-write in `/packages/sveltekit-runelayer/src/query/operations.ts:53-61` is not atomic. Use `db.transaction()` to prevent lost updates.

- **Reconcile the two hook type systems.** `schema/types.ts` (`HookArgs`) and `hooks/types.ts` (`HookContext`) define overlapping but incompatible types, leading to pervasive `as any` casts in the query layer.

- **Validate sort column names.** In `/packages/sveltekit-runelayer/src/db/operations.ts:18`, check that `(table as any)[opts.sort.column]` is defined before using it, and throw a descriptive error if not.

### Low

- **Normalize `_parentId` vs `parentId` naming** in array child tables vs join tables. Pick one convention.

- **Support nested arrays/groups inside array fields.** Currently silently dropped.

- **Add a `count` operation** to `findMany` (or a separate `countDocs`) for proper pagination.

- **Consider batch insert support** for bulk operations, using Drizzle's multi-row `values([...])`.

- **Add runtime schema drift detection** at startup -- compare generated table definitions against `PRAGMA table_info` and warn if columns are missing.

- **Decide what `timestamps: true` means.** The flag exists on `CollectionConfig` but is never read by `generateTables`. Either remove it or make it control whether `createdAt`/`updatedAt` are generated.

### Recommendations

- **Type the return values.** Introduce a generic `Document<T>` type parameterized by the collection's field definitions, so CRUD return values carry column types instead of `any`. This is the single highest-leverage improvement for developer experience.

- **Add relationship population.** Even a simple `depth: 1` option on `find`/`findOne` that joins related documents would eliminate the N+1 pattern currently forced on callers. The join table infrastructure is already generated.

- **Implement `where` with a safe builder API.** Rather than accepting raw `Record<string, unknown>` (which would need sanitization), expose a typed filter builder that maps to Drizzle's `eq`, `like`, `gt`, `lt`, etc. This prevents both SQL injection risk and eliminates the dead type declaration.

- **Add error wrapping.** Catch Drizzle/libsql errors in the operations layer and wrap them with structured error objects that include the collection slug, operation type, and a user-friendly message. This dramatically improves debuggability.

- **Document connection lifecycle.** The `client.close()` pattern is used in tests but not documented for production. SvelteKit server hooks run for the lifetime of the process, so the client should stay open, but this should be explicit.
