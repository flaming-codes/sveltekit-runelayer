# Code Complexity & Readability Review

## Synopsis

The sveltekit-runelayer codebase is well-structured with clean module boundaries and minimal unnecessary abstraction. The core library modules (schema, db, auth, hooks, query, storage) are straightforward and small. The primary complexity hotspot is the `sveltekit/runtime.ts` file, a 433-line monolith that handles all admin route loading, guard logic, and data assembly. Secondary issues include duplicated type definitions between `schema/types.ts` and `hooks/types.ts`, duplicated utility functions across sveltekit files, and pervasive `as any` casts that erode type safety.

## Grade: 7/10

## Dependency Graph

```
index.ts (public API barrel)
  +-- config.ts
  +-- plugin.ts
  |     +-- config.ts
  |     +-- db/init.ts --> db/schema.ts --> schema/collections.ts, schema/fields.ts
  |     +-- auth/index.ts --> auth/schema.ts, auth/handler.ts, auth/access.ts, auth/types.ts
  |     +-- storage/local.ts --> storage/types.ts
  |
  +-- schema/index.ts --> schema/fields.ts, schema/collections.ts, schema/globals.ts, schema/types.ts
  +-- db/index.ts --> db/init.ts, db/schema.ts, db/operations.ts, db/drizzle-kit.ts
  +-- hooks/index.ts --> hooks/runner.ts, hooks/types.ts
  +-- query/index.ts --> query/operations.ts, query/access.ts, query/types.ts
  |     query/operations.ts --> db/operations.ts, hooks/runner.ts, query/access.ts
  +-- storage/index.ts --> storage/types.ts, storage/local.ts, storage/handler.ts, storage/serve.ts

sveltekit/ (SvelteKit integration layer)
  +-- app.ts --> runtime.ts --> AdminPage.svelte
  |     runtime.ts --> plugin.ts, config.ts, admin-routing.ts, admin-queries.ts,
  |                    admin-actions.ts, globals.ts, serializable.ts
  +-- admin-actions.ts --> admin-queries.ts, admin-routing.ts, globals.ts, serializable.ts
  +-- admin-queries.ts --> query/index.ts, plugin.ts
  +-- globals.ts --> hooks/runner.ts, query/access.ts (uses raw SQL, bypasses db/operations.ts)
  +-- server.ts --> app.ts (server-only entry with window guard)
  +-- components.ts --> AdminPage.svelte, AdminErrorPage.svelte

admin/ (Svelte 5 UI components)
  +-- index.ts (barrel for all admin components)
  +-- AdminPage.svelte --> all page components via admin/index.ts
  +-- components/fields/FieldRenderer.svelte --> 9 field components
```

Key observations:

- No circular dependencies detected.
- `globals.ts` bypasses the standard db/operations layer, writing raw SQL directly. This is an intentional design choice (globals use a separate key-value table) but creates a parallel data path.
- `auth/schema.ts` imports from `db/schema.ts` (for the `GeneratedTables` type), while `db/drizzle-kit.ts` imports from `auth/schema.ts`. This is a bidirectional dependency between `db` and `auth` at the module level, though not circular at the file level.

## Complexity Hotspots

### 1. `sveltekit/runtime.ts` -- The God Function

- **File**: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime.ts`
- **Issue**: `createRunelayerRuntime()` is a single 433-line function containing 12+ nested function definitions, a massive `load()` function (~190 lines) with a 13-branch if-else chain, and inline health check logic duplicated between `load()` and `handle`.
- **Mental model required**: A reader must hold the entire function's closure scope in their head -- `runelayer`, `adminPath`, `ui`, `authBasePath`, all helper closures (`guardAdminRoute`, `fetchManagedUserList`, `fetchManagedUser`, `safeInt`, `authAdminPath`), and the `load` function with its 13 route-kind branches.
- **Specific pain points**:
  - Lines 184-375: The `load` function is ~190 lines with a long if-else chain dispatching on `route.kind`. Each branch assembles a different data shape.
  - Lines 192-216 and 390-418: Health check logic is duplicated (once for HTML load, once for JSON API handle).
  - Lines 125-167: `fetchManagedUserList` builds URLSearchParams with "magic" parameter names (`filterField`, `filterOperator`, `searchValue`, etc.) that come from Better Auth's undocumented API.
- **Suggested simplification**: Extract route-specific loaders into a dispatch map (`Record<AdminRoute["kind"], (event, route) => Promise<...>>`). Extract the health check into a shared function. Move `fetchManagedUserList` and `fetchManagedUser` into `admin-queries.ts` where they conceptually belong.

### 2. `sveltekit/admin-actions.ts` -- Repetitive Boilerplate

- **File**: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts`
- **Issue**: Every action handler repeats the same preamble: parse route, check route kind, count admin users, call guardAdminRoute. This pattern appears 8 times across the 397-line file.
- **Mental model required**: Understanding why each action re-validates the route kind (defense-in-depth), plus the `AdminActionsConfig` interface that threads 8 dependencies from `runtime.ts`.
- **Specific code pattern repeated 8 times** (lines 69-71, 105-108, 160-168, 181-189, etc.):
  ```ts
  const route = parseAdminRoute(event.params.path);
  if (!route || route.kind !== "...") {
    throw error(404, "...");
  }
  const adminExists = (await countAdminUsers(cfg.runelayer)) > 0;
  await cfg.guardAdminRoute(event, route, cfg.adminPath, adminExists);
  ```
- **Suggested simplification**: Extract a shared `resolveAndGuard(event, expectedKind)` helper that consolidates route parsing, kind validation, admin existence check, and guard call.

### 3. Duplicated Hook Type Definitions

- **Files**:
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/schema/types.ts` (lines 34-53)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/hooks/types.ts` (lines 10-35)
- **Issue**: Two separate type systems define hook signatures. `schema/types.ts` defines `BeforeChangeHook`, `AfterChangeHook`, etc. using `HookArgs`. `hooks/types.ts` defines identically-named types using `HookContext`. They are structurally different -- `HookArgs` uses `{ req, data, originalDoc, id }` while `HookContext` uses `{ collection, operation, req, data, id, existingDoc }`.
- **Mental model required**: A contributor must understand that schema hooks are the user-facing API (what you write in config), while hooks/types are the internal runtime representation. But the names are identical, causing confusion.
- **Evidence of confusion**: `query/operations.ts` casts all hooks with `as any` (lines 21, 27, 44, 46, 57, 59, 69, 72) to bridge the two incompatible types. `globals.ts` does the same (lines 124-128, 152-153, 178).
- **Suggested simplification**: Unify into a single hook type system. Either make `HookContext` the canonical type everywhere, or create an adapter that converts schema-defined hooks to runtime hooks without `as any`.

### 4. Pervasive `as any` Type Erosion

- **Files**: Multiple files throughout the codebase
- **Issue**: `as any` casts appear at critical junctions, defeating TypeScript's type safety exactly where it matters most.
- **Specific locations**:
  - `query/operations.ts` lines 21, 27, 44, 46, 57, 59, 69, 72 -- all hook invocations
  - `globals.ts` lines 124-128, 152-153, 178 -- hook invocations
  - `auth/index.ts` line 54 -- `(session.user as any).role`
  - `auth/index.ts` line 69 -- `auth as unknown as RunelayerAuth["auth"]`
  - `auth/handler.ts` line 18 -- `runelayerAuth.auth as any`
  - `db/operations.ts` line 18 -- `(table as any)[opts.sort.column]`
  - `plugin.ts` line 22 -- `handle` signature uses `event: any`
  - `sveltekit/runtime.ts` -- `AdminPage.svelte` data is untyped `Record<string, any>`
- **Mental model required**: A contributor cannot trust type signatures at module boundaries. They must read implementations to understand actual shapes.
- **Suggested simplification**: Fix the root causes. Better Auth's user type should be extended with `role`. Hook types should be unified. The `handle` function should use SvelteKit's `Handle` type.

### 5. `sveltekit/globals.ts` -- Parallel Data Path with Raw SQL

- **File**: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/globals.ts`
- **Issue**: Globals bypass the standard `db/operations.ts` CRUD layer and write raw SQL against a `__runelayer_globals` key-value table. This means globals have their own table creation logic (`ensureGlobalTable`), their own SQL quoting (`quoteIdent` -- duplicated from `admin-queries.ts`), and their own data serialization.
- **Mental model required**: Understanding that globals are stored fundamentally differently from collections, that `ensureGlobalTable` auto-creates a table at runtime (not via migrations), and that a `WeakSet<RunelayerInstance>` tracks initialization state.
- **Duplication**: `quoteIdent` and `SAFE_IDENTIFIER` regex appear identically in both `globals.ts` (line 15-19) and `admin-queries.ts` (lines 8-19).
- **Suggested simplification**: Extract `quoteIdent` into a shared utility. Document why globals use a different storage strategy. Consider whether globals could use the standard operations layer with a virtual "collection".

### 6. `AdminPage.svelte` -- Massive View Router with Repeated Shell Props

- **File**: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/AdminPage.svelte`
- **Issue**: This 176-line component is a manually maintained view router. The `AdminShell` component receives the same 6 props (`collections`, `globals`, `user`, `basePath`, `currentPath`, `ui`) in 10 separate locations. Adding a new admin view requires adding a new branch and copy-pasting the shell wrapper.
- **Suggested simplification**: Extract the shell props into a derived object and use a `{#snippet}` or wrapper pattern to avoid repeating the `AdminShell` props. Or use a component map pattern:
  ```ts
  const viewComponents = { dashboard: AdminDashboardPage, ... };
  ```

### 7. Untyped Data Contract Between `runtime.ts` Load and `AdminPage.svelte`

- **Files**:
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime.ts` (load function)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/AdminPage.svelte`
- **Issue**: The `load` function returns `Record<string, unknown>` and the Svelte component receives `Record<string, any>`. There is no shared type defining what each view returns. The contract is implicit: `runtime.ts` assembles an object with `view: "dashboard"` plus view-specific fields, and `AdminPage.svelte` destructures them. If either side changes a property name, there is no compile-time error.
- **Mental model required**: A contributor must cross-reference `runtime.ts` branches with `AdminPage.svelte` branches by hand.
- **Suggested simplification**: Define a discriminated union type like `AdminViewData = { view: "dashboard"; dashboardCollections: ... } | { view: "login" } | ...` and use it in both places.

## Naming & Clarity Issues

1. **`runtime.ts` vs `app.ts`**: `app.ts` exists only to call `createRunelayerRuntime(config, AdminPage)`. The indirection is confusing -- `createRunelayerApp` (public) delegates to `createRunelayerRuntime` (internal). A reader encountering `createRunelayerApp` must trace through `app.ts` to find the actual implementation.

2. **`table` helper in `query/operations.ts`** (line 7): `function table(ctx)` is a confusingly generic name for "look up the Drizzle table object for this collection." `getTable` or `resolveTable` would be clearer.

3. **`hookCtx` in `query/operations.ts`** (line 11): Abbreviation obscures purpose. `createHookContext` would be self-documenting.

4. **`hc` variable** used throughout `query/operations.ts` and `globals.ts`: Short-lived abbreviation for "hook context." Acceptable in a tight scope but used across 5+ lines each time.

5. **`cfg` parameter** in `admin-actions.ts` (line 35): `AdminActionsConfig` is a grab-bag of 8 dependencies. The name `cfg` gives no hint about what it contains. Consider destructuring at the function level.

6. **`ManagedUser` vs `AdminUser` vs `User`**: Three user types exist -- `User` in `auth/types.ts`, `AdminUser` in `admin-queries.ts`, and `ManagedUser` in `admin-queries.ts`. `AdminUser` is the session user; `ManagedUser` is a user being managed by an admin. The distinction is not obvious from the names alone.

7. **`toSerializable`**: The name suggests converting to a serializable format, but it actually strips functions via JSON round-trip. A name like `stripFunctions` or `deepCloneWithoutFunctions` would be more precise.

## New Contributor Onboarding Difficulty

The hardest parts for a new contributor, ranked:

1. **Understanding the sveltekit integration layer**: The `sveltekit/` directory is the most complex module. A new contributor must understand how `createRunelayerApp` in `app.ts` delegates to `createRunelayerRuntime` in `runtime.ts`, which creates closures over the entire CMS state and returns `{ handle, admin, withRequest, system }`. The `admin.load` function is the core data provider, and `admin.actions` handles mutations. These are wired into SvelteKit's `+page.server.ts` by the host app. This requires understanding SvelteKit's load/actions model, Better Auth's admin API, and the internal routing system simultaneously.

2. **The hook type split**: Encountering `as any` casts on every hook invocation raises immediate questions about type safety. Tracing why requires understanding both `schema/types.ts` and `hooks/types.ts` define different interfaces for the same concept.

3. **The auth header-injection pattern**: Understanding that auth context flows via HTTP headers (`x-user-id`, `x-user-role`, `x-user-email`) injected in `auth/index.ts` and read in `auth/access.ts` requires reading both files. The `systemRequest()` function in `admin-queries.ts` creates a synthetic request with these headers to bypass access control for internal operations.

4. **How globals work differently from collections**: Collections use generated Drizzle tables and the standard query layer. Globals use a manually-created `__runelayer_globals` key-value table with raw SQL. This divergence is not documented in code comments.

## Action Items

### Critical

- **Unify hook type definitions**: Merge `schema/types.ts` hook types and `hooks/types.ts` hook types into a single canonical definition. Eliminate all `as any` casts on hook invocations in `query/operations.ts` (8 occurrences) and `globals.ts` (4 occurrences). This is the highest-ROI change for type safety.

- **Type the load-to-component data contract**: Define a discriminated union (`AdminViewData`) for the data returned by `runtime.ts` `load()` and consumed by `AdminPage.svelte`. This prevents silent breakage when view data shapes change.

### Medium

- **Decompose `runtime.ts` load function**: Extract per-route loaders into a dispatch map or individual functions. The current 190-line if-else chain in `load()` is the single largest function in the codebase and the hardest to navigate.

- **Extract shared `quoteIdent` utility**: `quoteIdent` and `SAFE_IDENTIFIER` are duplicated between `globals.ts` (lines 15-19) and `admin-queries.ts` (lines 8-19). Move to a shared `db/util.ts` or `db/sql.ts` module.

- **Deduplicate health check logic**: The health check in `runtime.ts` appears twice -- in `load()` (lines 192-216) and `handle` (lines 390-418). Extract to a shared `buildHealthPayload(runelayer)` function.

- **Extract action guard boilerplate**: The 4-line preamble (parse route, validate kind, count admins, guard) is repeated 8 times in `admin-actions.ts`. Extract a `resolveGuardedRoute(event, expectedKind, cfg)` helper.

### Low

- **Reduce `AdminPage.svelte` prop repetition**: The `AdminShell` component receives the same 6 props in 10 branches. Use a shared props object or wrapper component pattern.

- **Improve naming**: Rename `table()` to `resolveTable()`, `hookCtx()` to `createHookContext()`, `toSerializable()` to `stripFunctions()`. These are safe renames with no behavior change.

- **Remove `sveltekit/index.ts` deprecated barrel**: This file is marked deprecated but still exports everything. If no consumers rely on it, remove it. If consumers exist, add a deprecation timeline.

- **Fix `auth/index.ts` line 54 type cast**: `(session.user as any).role` can be fixed by extending Better Auth's user type with the admin plugin's `role` field, removing the need for `as any`.

### Recommendations

- **Add inline comments in `globals.ts`** explaining why globals use a separate storage strategy (key-value table vs. generated Drizzle tables). The `WeakSet<RunelayerInstance>` pattern for lazy table creation is clever but non-obvious.

- **Document the system request pattern**: `systemRequest()` in `admin-queries.ts` creates a fake `Request` with admin headers to bypass access control. This is a critical security-adjacent pattern that should have a doc comment explaining when and why it is safe to use.

- **Consider a `sveltekit/health.ts` module**: Health check logic (DB ping, collection/global counts, timestamp) is currently inlined in `runtime.ts` twice. A dedicated module would make the health endpoint easier to extend (e.g., adding storage health checks).
