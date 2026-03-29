# Testing

Runekit uses vitest (via vite-plus) for unit and integration testing. All tests run in-process with in-memory SQLite for speed and isolation.

## Running Tests

```bash
# From monorepo root
pnpm run test           # Alias for vp run test -r

# From packages/sveltekit-runelayer
pnpm test               # Alias for vp test
npx vitest run           # Direct vitest invocation
npx vitest --watch       # Watch mode
```

## Test Structure

Tests are colocated with source code in `__tests__/` directories:

```
packages/sveltekit-runelayer/src/
├── schema/__tests__/schema.test.ts     # 6 tests
├── db/__tests__/db.test.ts             # 10 tests
├── auth/__tests__/access.test.ts       # 8 tests
├── hooks/__tests__/hooks.test.ts       # 6 tests
├── storage/__tests__/storage.test.ts   # 6 tests
└── query/__tests__/query.test.ts       # 18 tests
```

Total: **54 tests** across **6 test suites**.

## Test Coverage by Module

### Schema Tests

- Field builder functions return correct `type` discriminants
- Options are preserved through builder functions
- `defineCollection` returns config unchanged
- `defineGlobal` returns config unchanged
- `defineSchema` combines collections and globals
- `defineSchema` allows omitting globals

### Database Tests

- `generateTables` creates base columns (id, createdAt, updatedAt) plus field columns
- Auxiliary tables for `array` fields
- Join tables for `hasMany` relationships
- Version columns (`_status`, `_version`) when `versions: true`
- Auth columns (`hash`, `salt`, etc.) when `auth: true`
- `createDatabase` + `pushSchema` creates tables in SQLite
- `insertOne` auto-generates UUID and timestamps
- `findById` retrieves and returns undefined for missing IDs
- `findMany` returns all rows and respects `limit`
- `updateOne` modifies data and refreshes `updatedAt`
- `deleteOne` removes the document

### Auth Access Tests

- `isLoggedIn()` returns true/false based on `x-user-id` header
- `hasRole()` matches/rejects based on `x-user-role` header
- `isAdmin()` delegates to `hasRole('admin')`

### Hooks Tests

- `runBeforeHooks` runs hooks sequentially with context threading
- `runBeforeHooks` handles sync and async hooks
- `runBeforeHooks` returns context unchanged for undefined/empty arrays
- `runAfterHooks` catches errors without throwing
- `runAfterHooks` continues running remaining hooks after an error

### Storage Tests

- Upload writes a file and returns correct metadata
- Upload supports `folder` option for subdirectories
- `exists` returns true for uploaded files, false for missing files
- `delete` removes files from disk
- `getUrl` returns the correct prefixed URL

### Query Tests

- `checkAccess` passes when accessFn is undefined
- `checkAccess` denies when accessFn is defined but req is undefined
- `checkAccess` passes when no accessFn even if req is undefined
- `checkAccess` passes when accessFn returns true
- `checkAccess` throws 403 when accessFn returns false
- `checkAccess` error includes `status: 403` property
- CRUD operations (create, findOne, find, update, remove) with in-memory DB
- `beforeChange` hooks modify data during create
- `afterChange` hooks are called after create

## Testing Patterns

### In-Memory SQLite

Use `:memory:` for test databases:

```ts
import { createDatabase, pushSchema } from "../../db/init.js";

let rdb: RunekitDatabase;

beforeEach(() => {
  rdb = createDatabase({ filename: ":memory:", collections: [collection] });
  pushSchema(rdb);
});
```

Each test gets a fresh database. No cleanup needed — the database is garbage collected.

### Mock Requests for Access Control

```ts
const adminReq = new Request("http://test", {
  headers: { "x-user-id": "1", "x-user-role": "admin" },
});

const publicReq = new Request("http://test");
```

### Testing Hooks

```ts
import { vi } from "vitest";

const tracker = vi.fn();
const collection = {
  ...baseCollection,
  hooks: { afterChange: [tracker] },
};

await create(ctx, { title: "Test" });
expect(tracker).toHaveBeenCalledOnce();
```

### Temp Directories for Storage

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "runekit-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});
```

## Testing Strategy

### V1 (Current)

- **Unit tests** with vitest for all core modules
- **Integration tests** using in-memory SQLite for DB + query layer
- **No external dependencies** — tests are fully hermetic

### V2 (Planned)

- **E2E tests** with Testcontainers:
  - Mailpit container for auth email flows
  - MinIO container for S3 storage adapter tests
  - PostgreSQL container for forward-compat adapter checks
  - SvelteKit dev server + Playwright for browser E2E

- **Contract tests** for adapter interfaces:
  - StorageAdapter contract (local FS, S3)
  - DatabaseAdapter contract (SQLite, PostgreSQL)
  - AuthAdapter contract

### CI Quality Gates (Planned)

- No merge with failing tests
- Critical-path E2E required for auth, upload, and content publishing flows
- Bundle-size and route-isolation checks
