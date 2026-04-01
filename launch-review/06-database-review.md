# Database Implementation Review

## Synopsis

The database layer is intentionally thin and easy to reason about: schema definitions generate SQLite tables, `db/operations.ts` wraps Drizzle CRUD, and the query layer adds access control and hooks on top. That is a sensible base for a package CMS, but the current implementation still overpromises relative to runtime behavior. Against Payload CMS v3.80.0, the biggest gaps are enforced filtering, relational integrity, typed results, transactions, and strict schema compilation. The design is workable, but still permissive enough to allow silent data loss or caller-controlled fields.

## Grade: 6/10

## Main Body

### What Is Solid

- `generateTables()` is compact and readable.
- `quoteIdent()` and `assertSafeIdentifier()` keep raw SQL interpolation controlled.
- Host-managed migrations are a reasonable choice for a package library.
- The query layer cleanly separates access, hooks, and DB calls.

### What Is Not Yet Production-Hard

1. `insertOne()` lets callers override `id`, `createdAt`, and `updatedAt` because `...data` is spread after the generated values.
2. `FindArgs.where` is declared but ignored. No filter path reaches `findMany()`, so the public API advertises a capability that does not exist.
3. `generateTables()` only creates auxiliary tables for top-level `array` and `relationship.hasMany` fields. Nested arrays or nested many-relations inside groups, arrays, or layout fields are silently dropped.
4. There are no foreign keys or secondary indexes on collection tables, arrays, or join tables.
5. `update()` reads the existing doc but does not fail when it is missing, and `delete()`/`updateOne()` return `undefined` for missing rows without a typed 404 path.
6. The query and DB types erase too much information (`AnyTable`, `Record<string, unknown>`, `any` returns), so callers get little compile-time protection.
7. `fieldsToColumns()` does not detect duplicate flattened names, so collisions can silently overwrite earlier column mappings.
8. `timestamps?: boolean` exists on `CollectionConfig`, but `generateTables()` always generates timestamps and never branches on the flag.
9. The schema layer exposes `validate`, `required`, `min`, and `max` metadata, but the DB/query path does not enforce it before writes.

### Performance And Migration Notes

- Sort handling is brittle: `findMany()` indexes `(table as any)[opts.sort.column]` without validating the column name.
- Pagination is minimal and there is no total-count helper in the core query API.
- Host-managed migrations are fine, but the package does not verify schema drift at startup, so missing migrations fail late.
- `globals.ts` stores global documents in a manually created `__runelayer_globals` table outside the Drizzle schema, which is pragmatic but separate from the migration contract.
- The globals table is created lazily on first access, so runtime behavior depends on request order instead of schema state.

## Action Items

### Critical

- Prevent caller override of generated fields in `insertOne()` and `updateOne()`. Move the generated fields after user data or strip reserved keys before write.
- Make filter behavior explicit. Either implement `where` end-to-end or remove it from `FindArgs`; do not keep a silent no-op in the public API.
- Reject or fully support nested `array` and `relationship.hasMany` structures. Silent omission during schema generation is data loss.

### Medium

- Add foreign keys and indexes for relationships, arrays, and common query columns.
- Fail on missing rows in `update()`/`delete()` and wrap read-modify-write paths in a transaction where needed.
- Validate sort columns and surface descriptive errors instead of passing unchecked property lookups into Drizzle.
- Enforce schema validation metadata before writes, including required fields and value validators.
- Remove the dead `timestamps` flag or wire it into table generation.
- Replace `AnyTable`/`any`/`Record<string, unknown>` return shapes with generated document types.

### Low

- Detect duplicate field-name and flattened-column collisions during schema compilation.
- Add count/total helpers and lightweight population support for common list views.
- Normalize `_parentId` versus `parentId` naming in auxiliary tables.
- Add runtime schema drift checks or a startup migration smoke test.
- Document the ad hoc `__runelayer_globals` storage table and its lifecycle.

### Recommendation

- Treat schema compilation as a compiler pass: fail fast on unsupported nesting, duplicate names, and ambiguous relationships instead of silently flattening or dropping fields.
- Introduce a typed filter DSL and projection API so query behavior can grow without raw `Record<string, unknown>` plumbing.
- Keep the host-managed migration model, but add a verification step so missing tables are caught before the first user request.
