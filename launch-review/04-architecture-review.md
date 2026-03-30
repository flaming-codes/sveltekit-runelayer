# Package & App Architecture Review

## Synopsis

sveltekit-runelayer is a well-layered CMS-as-a-package with clean module boundaries and a schema-driven design that delivers on its "single source of truth" promise. The architecture has solid fundamentals -- properly separated server/client entry points, deny-by-default access control, and a thin adapter strategy -- but carries several type-safety gaps, a dual API surface problem, and missing runtime validation that create real risk for consumers at scale.

## Grade: 7/10

## Module Dependency Graph

```
schema (leaf -- zero runtime deps)
  |
  +---> db/schema.ts (generates Drizzle tables from CollectionConfig)
  +---> db/init.ts (creates libsql client + drizzle instance)
  +---> db/operations.ts (raw CRUD against Drizzle tables)
  |
  +---> auth/schema.ts (Better Auth Drizzle tables)
  +---> auth/index.ts (createAuth, consumes db instance)
  +---> auth/access.ts (isAdmin, isLoggedIn, hasRole -- reads x-user-* headers)
  |
  +---> storage/local.ts (filesystem adapter, no deps on db/auth)
  |
  +---> hooks/runner.ts (sequential hook execution, generic)
  |
  +---> query/access.ts (calls AccessFn from schema/types)
  +---> query/operations.ts (composes db/operations + hooks/runner + query/access)
  |
  +---> config.ts (RunelayerConfig type, depends on schema + auth + storage + db types)
  +---> plugin.ts (createRunelayer -- composition root, wires db + auth + storage)
  |
  +---> sveltekit/runtime.ts (high-level SvelteKit integration, depends on everything above)
  +---> sveltekit/server.ts (server-only entry with typeof window guard)
  +---> sveltekit/components.ts (client-safe Svelte component re-exports)
  |
  +---> admin/ (Svelte 5 components, consumes data props -- no direct module imports)
```

The layering is fundamentally sound: schema is a leaf, db/auth/storage are peers, query composes them, and sveltekit/ sits at the top. No circular dependencies were found.

## Detailed Analysis

### Public API Surface

**Two competing API surfaces.** The package exports two distinct ways to use it:

1. **Low-level API** (`@flaming-codes/sveltekit-runelayer`): exposes `createRunelayer()`, raw query functions (`find`, `findOne`, `create`, `update`, `remove`), `createDatabase()`, `createAuth()`, `createLocalStorage()`, and all schema builders. Consumers must manually compose these.

2. **High-level API** (`@flaming-codes/sveltekit-runelayer/sveltekit/server`): exposes `createRunelayerApp()` which handles all composition internally and returns `RunelayerApp` with `handle`, `admin`, `withRequest()`, and `system` query API.

The demo app uses **only** the high-level API. The low-level API is exported but has no consumer. This creates maintenance burden and potential confusion -- users have two paths to the same functionality with different ergonomics and different type safety characteristics.

**Excessive `any` in public types.** Key interfaces use `any` extensively:

- `RunelayerQueryApi.find()` returns `Promise<any[]>` -- callers get zero type inference on document shape.
- `RunelayerQueryApi.findOne()` returns `Promise<unknown>`.
- `RunelayerQueryApi.create/update/remove` return `Promise<any>`.
- `RunelayerApp.admin.Page` is typed as `Component<any>`.
- `createAuth()` accepts `db: any` for the Drizzle instance.
- `RunelayerAuth.auth` is typed via `as unknown as RunelayerAuth["auth"]` cast.
- `plugin.ts` types `event` and `resolve` as `any` in the handle function.

This means the query API provides no compile-time safety for document shapes. For a schema-driven CMS, this is a significant missed opportunity.

**Field builder API is well-designed.** The `text()`, `select()`, `array()`, etc. factory functions with the spread pattern (`{ name: "title", ...text({ required: true }) }`) is clean and produces good IntelliSense. The `NamedField = Field & { name: string }` intersection type is simple and correct.

**Hook type duplication.** Hook types are defined in two places with different signatures:

- `schema/types.ts`: `BeforeChangeHook` takes `HookArgs` and returns `Record<string, unknown>`.
- `hooks/types.ts`: `BeforeChangeHook` takes `HookContext` and returns `HookContext`.

The query layer casts between them with `as any`. This is a real type-safety hole that will confuse contributors and could cause runtime bugs if hook return values are misinterpreted.

### Module Boundaries

**schema/ -- Clean leaf module.** No runtime dependencies. Defines types and builder functions only. The `SCHEMA_VERSION` export suggests versioning intent but is unused anywhere in the codebase.

**db/ -- Well isolated.** Takes `CollectionConfig[]` as input, produces Drizzle tables and CRUD operations. The `generateTables()` function is the core schema-to-DB bridge and handles all 16 field types including nested groups, arrays, and join tables. One concern: the `mapField` switch statement silently returns `{}` for unknown field types rather than throwing, which means a typo in a field type would produce a table with missing columns and no error.

**auth/ -- Reasonable but leaky.** The header-based identity context (`x-user-id`, `x-user-role`, `x-user-email`) is pragmatic for decoupling from SvelteKit's `event.locals`, but the `createAuth()` function also writes to `event.locals.user` and `event.locals.session` directly. This dual-write means there are two sources of truth for user identity within a single request, and they could diverge if middleware modifies headers after auth runs.

**storage/ -- Independent and correct.** Path traversal protection via `safePath()` is properly implemented. The `StorageAdapter` interface is clean and minimal. However, the storage adapter is initialized in `createRunelayer()` but never wired into the `handle` hook -- the upload/serve handlers (`createUploadHandler`, `createServeHandler`) are exported but the runtime does not mount them. The demo app does not use file uploads at all, suggesting this is incomplete functionality.

**hooks/ -- Minimal and correct.** The sequential runner properly propagates context through before-hooks and swallows after-hook errors (with console.error). The `AfterHook` type uses `any` for its context parameter, which is loose but pragmatic for a generic runner.

**query/ -- Good access control, weak filtering.** The access check pattern (deny-by-default when `AccessFn` exists but no `Request` is provided) is a strong security default. However, `FindArgs.where` is typed as `Record<string, unknown>` but is never actually passed through to `findMany()` -- the `find()` operation in `query/operations.ts` does not use `args.where` at all. This is dead API surface that would silently ignore user-provided filter criteria.

**sveltekit/ -- Largest module, doing the most.** `runtime.ts` is 433 lines handling routing, auth guards, data loading for 13 route kinds, and delegating to admin-actions/admin-queries. This is the integration layer and its size is justified by the coordination it performs. The server/client split (`server.ts` vs `components.ts`) with the `typeof window` poison pill is a good pattern for preventing accidental server code in browser bundles.

**admin/ -- Opaque from outside.** Admin components receive data as props from the `load` function and render using Carbon Design System. They do not import any runtime modules directly (schema, db, auth, etc.), which is the correct boundary. The `toSerializable()` pass strips functions before sending data to the client.

### Configuration Design

**`defineConfig()` is a pass-through with defaults.** It spreads user config over defaults and returns the same type. This is fine for v1 but provides no validation -- invalid field names, missing required fields, or nonsensical configurations (e.g., negative `sessionMaxAge`) pass silently.

**`RunelayerAppConfig` vs `RunelayerConfig` -- confusing split.** `RunelayerAppConfig` extends `RunelayerConfig` (minus `adminPath`) and adds `kit` and `admin`. The demo app uses `RunelayerAppConfig` via `createRunelayerApp()`. The lower-level `RunelayerConfig` is used by `createRunelayer()` which requires manual handle composition. Having two config types that overlap significantly but differ in structure creates confusion about which to use.

**`SvelteKitUtils` injection is architecturally necessary and well-documented.** The requirement to pass `{ redirect, error, fail }` from the host's `@sveltejs/kit` import prevents class identity mismatches. The comment explains why. This is a good pattern.

**`auth.secret` has no validation.** The demo app falls back to a hardcoded 53-character secret. There is no minimum length check or warning when the secret is too short or obviously a placeholder.

### Build & Packaging

**Source-only distribution.** `package.json` has `"files": ["src", "package.json"]` and exports point directly to `.ts` source files. There is no pre-built JS output. This means:

- Consumers must have a build toolchain that handles TypeScript (SvelteKit does, so this works for the target audience).
- The package cannot be consumed by plain Node.js projects or non-Svelte bundlers without additional configuration.
- `"svelte"` condition in exports ensures Svelte-aware bundlers resolve correctly.

This is a valid choice for a SvelteKit-specific package and avoids the complexity of pre-compiling Svelte components.

**`vite` and `vitest` are aliased to vite-plus forks.** The `pnpm-workspace.yaml` catalog maps `vite` to `@voidzero-dev/vite-plus-core` and `vitest` to `@voidzero-dev/vite-plus-test` via npm aliases. The `peerDependencyRules` suppress version warnings. This is an unconventional but documented choice. Risk: if vite-plus diverges from upstream Vite, consumers may hit compatibility issues.

**Peer dependencies are correct.** `@sveltejs/kit` and `svelte` are peer deps (the host provides them). `drizzle-orm`, `@libsql/client`, `better-auth`, and Carbon UI libraries are direct dependencies (the package vendors them). This is the right split -- the package owns its data layer but defers to the host for the framework.

**Carbon UI as direct dependency of both root and package.** The root `package.json` lists `carbon-components-svelte`, `carbon-icons-svelte`, etc. as dependencies, and so does the library package.json. The root dependencies appear to be for the demo app's direct Carbon usage. The `catalog:` protocol keeps versions synchronized but the root-level Carbon deps are unusual -- they should likely only appear in the demo app's `package.json`.

### Demo App Integration

**Clean integration pattern.** The demo app demonstrates the intended consumption:

1. Define collections/globals in `$lib/server/schema.ts` using the schema builders.
2. Create the app singleton in `$lib/server/runelayer.ts` via `createRunelayerApp()`.
3. Wire `app.handle` in `hooks.server.ts`.
4. Mount `app.admin.load` and `app.admin.actions` in a catch-all `[...path]` route.
5. Render `<AdminPage {data} {form} />` in the page component.

This is approximately 10 lines of host-app glue code for a full CMS admin UI, which is excellent DX.

**Seed-on-first-request pattern is demo-only but fragile.** The `seeded` flag in `hooks.server.ts` is a module-level boolean. In serverless environments or after hot module replacement, this could re-trigger seeding. The demo marks this clearly as demo behavior.

**`query()` helper creates a fake Request for server-side queries.** `query-helpers.ts` falls back to `new Request("http://localhost")` when no request is provided. This bypasses the deny-by-default access check (since the Request exists but has no auth headers). Collections with `read: () => true` are fine, but any collection with access control would deny these requests. This is a potential footgun for demo consumers who copy this pattern.

**`svelte.config.js` runes workaround is well-documented.** The per-file runes detection that excludes `node_modules` is necessary because Carbon Svelte uses `export let` (Svelte 4 style). The comment explains this will be removable in Svelte 6.

### Extensibility

**No plugin/middleware system.** The architecture is closed to extension beyond hooks. There is no way to:

- Add custom field types without modifying the package source.
- Register custom storage adapters (the `StorageAdapter` interface exists but `createRunelayerApp` always creates `createLocalStorage`).
- Add custom admin routes/pages.
- Intercept or modify the auth flow.

For v1 this is acceptable -- the CLAUDE.md "second-use rule" justifies deferring plugin architecture. But the code should be structured to make these extension points addable without breaking changes.

**Hooks are the only extension point.** `beforeChange`/`afterChange`/`beforeDelete`/`afterDelete`/`beforeRead`/`afterRead` hooks run sequentially and can modify data. This covers the most common customization needs (auto-slug generation, computed fields, side effects).

**Custom access control functions are flexible.** The `AccessFn` signature `(args: { req: Request; id?; data? }) => boolean | Promise<boolean>` allows any async logic. The `isAdmin()`, `isLoggedIn()`, `hasRole()` factories are composable. Users can write arbitrary access functions using the Request object.

## Action Items

### Critical

- **Fix hook type duplication.** `schema/types.ts` and `hooks/types.ts` define incompatible `BeforeChangeHook`/`AfterChangeHook` types. The query layer (`query/operations.ts`) casts between them with `as any`. Consolidate to a single definition or create explicit adapter functions. Impact: hooks could silently receive wrong context shapes, causing runtime errors in user-provided hook code. Files: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/schema/types.ts`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/hooks/types.ts`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/query/operations.ts`.

- **`FindArgs.where` is accepted but silently ignored.** The `find()` function in `query/operations.ts` passes `limit`, `offset`, and `sort` to `findMany()` but never forwards `args.where`. Consumers who pass `where` clauses will get unfiltered results with no error. Either implement filtering or remove `where` from the `FindArgs` type. Files: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/query/types.ts`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/query/operations.ts`.

- **`systemRequest()` injects synthetic admin headers that bypass all access control.** The function in `admin-queries.ts` creates a Request with hardcoded `x-user-id: "runelayer-system"` and `x-user-role: "admin"` headers. The auth middleware strips these from incoming external requests, but `systemRequest()` creates them after that step. If this pattern is exposed to user code or if the system query API is inadvertently used where user-scoped queries are expected, it grants full admin access. The `system` property on `RunelayerApp` makes this available to any code with access to the app instance. Document this clearly and consider limiting scope. File: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts`.

### Medium

- **Query API returns `any`/`unknown` everywhere.** `RunelayerQueryApi` methods return `Promise<any[]>`, `Promise<unknown>`, `Promise<any>`. For a schema-driven CMS, the type system should be able to infer document shapes from collection configs. At minimum, return `Record<string, unknown>` instead of `any` so consumers get object-level type checking. File: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/types.ts`.

- **`mapField()` silently drops unknown field types.** In `db/schema.ts`, the `default` case returns `{}`, meaning an unrecognized field type produces no column and no error. Add a warning or throw for unknown types during table generation. File: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/db/schema.ts`.

- **Storage adapter is not wired into the runtime handle hook.** `createRunelayer()` initializes storage but does not mount upload/serve routes. The `createUploadHandler` and `createServeHandler` are exported but unused by the runtime. Either wire them in or document that consumers must mount them manually. Files: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/plugin.ts`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/storage/handler.ts`.

- **No runtime config validation.** `defineConfig()` and `createRunelayerApp()` accept config objects without any runtime checks. Missing `auth.secret`, empty `collections`, `database.url` with wrong format -- all pass silently and fail later with cryptic errors. Add validation at initialization time with clear error messages. Files: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/config.ts`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime.ts`.

- **Dual identity write (headers + event.locals).** `createAuth()` in `auth/index.ts` writes user data to both request headers and `event.locals`. Access functions read headers; admin code reads `event.locals`. If any middleware between auth and route handling modifies one but not the other, they diverge. Pick one canonical source or derive one from the other. File: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/auth/index.ts`.

- **Root `package.json` has Carbon UI as direct dependencies.** `carbon-components-svelte`, `carbon-icons-svelte`, `carbon-pictograms-svelte`, and `carbon-preprocess-svelte` are listed as dependencies of the monorepo root. These appear to be needed only by the demo app (which lists its own Carbon deps). Move them to `apps/demo/package.json` or remove if redundant. File: `/Users/tom/Github/sveltekit-runelayer/package.json`.

### Low

- **`SCHEMA_VERSION` is exported but unused.** `schema/index.ts` exports `SCHEMA_VERSION = "0.0.1"` but nothing in the codebase reads it. Either use it (e.g., for migration compatibility checks) or remove it. File: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/schema/index.ts`.

- **Deprecated `sveltekit/index.ts` combined entry point.** This re-exports both server and client code from one module, marked `@deprecated`. Set a timeline for removal and log a console warning when imported. File: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/index.ts`.

- **`quoteIdent()` is duplicated.** Both `admin-queries.ts` and `globals.ts` define their own `quoteIdent()` and `SAFE_IDENTIFIER` regex. Extract to a shared utility. Files: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/globals.ts`.

- **`toSerializable()` strips functions via JSON roundtrip.** This works but is O(n) on payload size and loses `undefined` values, `Date` objects, `BigInt`, etc. For the current use case (stripping access/hook functions from collection configs before sending to client) it is adequate, but the behavior should be documented as it can surprise consumers who pass non-JSON-safe data. File: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/serializable.ts`.

- **`@sveltejs/vite-plugin-svelte` version mismatch.** The demo app pins `@sveltejs/vite-plugin-svelte: ^6.2.4` while the catalog does not include this package (catalog has `^5`). This could cause version conflicts. File: `/Users/tom/Github/sveltekit-runelayer/apps/demo/package.json`.

### Recommendations

- **Consider removing or deprecating the low-level API surface** (`createRunelayer`, raw `find`/`create`/`update`/`remove`, `createDatabase`, `createAuth`). The high-level `createRunelayerApp()` API is what the demo uses and what documentation should guide users toward. Keeping two API surfaces doubles the maintenance and testing burden. If the low-level API is needed for advanced use cases, document those cases explicitly.

- **Invest in generic document types.** The schema system has enough static information (field types, required flags) to derive TypeScript types for documents. Even a partial solution -- e.g., `find<T extends Record<string, unknown>>(collection, args): Promise<T[]>` with user-provided generics -- would be a significant DX improvement over `any`.

- **Add collection slug validation at definition time.** Collection slugs become SQL table names. Validate them against the `SAFE_IDENTIFIER` regex in `defineCollection()` rather than waiting for runtime SQL errors. Slugs with spaces, special characters, or SQL reserved words would cause confusing failures.

- **Make the `Role` type extensible.** The `Role` type in `auth/types.ts` is `"admin" | "editor" | "user"` -- a closed union. If a consumer needs custom roles (e.g., "moderator"), they cannot extend this without module augmentation. Consider making it `string` with well-typed defaults, or provide a generic parameter on the config.

- **Add integration tests for the high-level `createRunelayerApp()` flow.** The existing E2E tests cover individual modules but the runtime composition in `sveltekit/runtime.ts` -- which is the primary entry point -- should have its own integration test that exercises the full load/action/handle cycle.
