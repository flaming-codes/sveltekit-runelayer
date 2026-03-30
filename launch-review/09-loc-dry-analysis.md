# Lines of Code & DRY Analysis

## Synopsis

The sveltekit-runelayer package weighs 5,606 source LOC (excluding tests) across 7 modules plus a SvelteKit integration layer. The backend core (schema, db, auth, storage, hooks, query) is remarkably lean at 1,211 LOC, while the admin UI and SvelteKit runtime layer account for the remaining 4,235 LOC. The most significant DRY violations are duplicated CSS page-layout styles across Svelte components (~280 repeated lines), a duplicated `quoteIdent` utility in two files, duplicate hook type definitions across two modules, and a near-identical `RichTextField`/`JsonField` pair. Overall the code-to-feature ratio is excellent -- no bloat, no dead abstractions.

## Grade: 8/10

## LOC Summary

| Module                             | Source LOC | Test LOC  | Total      |
| ---------------------------------- | ---------- | --------- | ---------- |
| schema/                            | 343        | 104       | 447        |
| db/                                | 234        | 245       | 479        |
| auth/                              | 252        | 107       | 359        |
| storage/                           | 188        | 73        | 261        |
| hooks/                             | 80         | 77        | 157        |
| query/                             | 114        | 116       | 230        |
| admin/ (Svelte UI)                 | 2,577      | 0         | 2,577      |
| sveltekit/ (runtime)               | 1,658      | 723       | 2,381      |
| Root files (index, config, plugin) | 160        | 0         | 160        |
| **testutils**/                     | 0          | 64        | 64         |
| E2E tests                          | 0          | 3,035     | 3,035      |
| **Package total**                  | **5,606**  | **4,544** | **10,150** |
| Demo app                           | 3,313      | 0         | 3,313      |
| **Grand total**                    | **8,919**  | **4,544** | **13,463** |

### Proportions

- Backend core (schema + db + auth + storage + hooks + query): 1,211 LOC (22% of source)
- Admin UI components: 2,577 LOC (46% of source)
- SvelteKit integration runtime: 1,658 LOC (30% of source)
- Test-to-source ratio: 0.81:1 (healthy)

## DRY Violations

### 1. Duplicated CSS page-layout styles across admin Svelte components

- **Files:**
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/CollectionEdit.svelte` (lines 119-229)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/CollectionList.svelte` (lines 194-259)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/UserEdit.svelte` (lines 146-244)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/UsersList.svelte` (lines 170-251)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/GlobalEdit.svelte` (lines 62-139)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/Profile.svelte` (lines 94-208)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/Health.svelte` (lines 70-155)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/Dashboard.svelte` (lines 96-211)
- **Duplicated pattern:** The following CSS block is copy-pasted (with only minor variations) across all 8 page components:
  ```css
  .rk-page-header { background; border-bottom; padding }
  .rk-page-header-inner { max-width: 90rem; margin: 0 auto }
  .rk-page-title-row { display: flex; align-items; justify-content; gap; margin-top }
  .rk-eyebrow { margin: 0; font-size: 0.75rem; letter-spacing; text-transform; color }
  .rk-page-title-row h1 { margin; font-size: 1.75rem; font-weight: 300; line-height }
  .rk-page-body { max-width: 90rem; margin: 0 auto; padding }
  @media (max-width: 672px) { ... }
  ```
  Additionally, `CollectionEdit`, `UserEdit` share identical `.rk-sidebar-tile`, `.rk-meta-list`, `.rk-actions`, `.rk-fields` styles.
- **Estimated waste:** ~280 lines of duplicated CSS across 8 files.
- **Suggested fix:** Extract shared page-layout styles into a single `.css` file (e.g., `admin/styles/page-layout.css`) and import it from each component via `@import`. Alternatively, use Svelte's `:global()` styles in the `AdminLayout` shell component for the page-header/body pattern. The sidebar/meta-list styles shared between `CollectionEdit` and `UserEdit` could be extracted into a shared `editor-layout.css`.

### 2. Duplicated `quoteIdent` utility function

- **Files:**
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts` (lines 8-19)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/globals.ts` (lines 15-22)
- **Duplicated pattern:** Both files define an identical `SAFE_IDENTIFIER` regex and `quoteIdent` function. The `admin-queries.ts` version also exports a standalone `assertSafeIdentifier`.
- **Estimated waste:** ~15 lines duplicated.
- **Suggested fix:** Extract `quoteIdent` (and its safety check) into a shared utility, e.g., `sveltekit/sql-utils.ts`, and import from both files.

### 3. Duplicate hook type definitions across schema and hooks modules

- **Files:**
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/schema/types.ts` (lines 27-53: `BeforeChangeHook`, `AfterChangeHook`, `BeforeDeleteHook`, `AfterDeleteHook`, `BeforeReadHook`, `AfterReadHook`, `Hooks`)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/hooks/types.ts` (lines 10-35: `BeforeChangeHook`, `AfterChangeHook`, `BeforeDeleteHook`, `AfterDeleteHook`, `BeforeReadHook`, `AfterReadHook`, `CollectionHooks`, `GlobalHooks`)
- **Duplicated pattern:** Both modules define the same 6 hook function type signatures. The `schema/types.ts` versions use a different `HookArgs` shape than `hooks/types.ts`'s `HookContext`, creating a subtle divergence that leads to `as any` casts in `query/operations.ts` (lines 21, 27, 45, 49, 56, 60, 67, 71).
- **Estimated waste:** ~35 lines of redundant type definitions plus 8 `as any` casts.
- **Suggested fix:** Consolidate hook types in one canonical location (`hooks/types.ts`). Have `schema/types.ts` re-export from there. Align the hook argument shape so `query/operations.ts` does not need `as any` casts.

### 4. Near-identical RichTextField and JsonField components

- **Files:**
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/fields/RichTextField.svelte` (29 lines)
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/fields/JsonField.svelte` (29 lines)
- **Duplicated pattern:** These two files are structurally identical. Both render a `TextArea` with a `serializeValue` helper that does JSON.stringify. The only differences are the `helperText` string ("Rich text JSON (Tiptap integration placeholder)" vs "JSON payload").
- **Estimated waste:** ~25 lines (one file is entirely redundant).
- **Suggested fix:** Merge into a single `JsonTextArea.svelte` that takes a `helperText` prop. `FieldRenderer` can pass different helper text for `richText` vs `json` field types.

### 5. Repeated `AdminShell` wrapper in AdminPage.svelte

- **File:** `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/AdminPage.svelte`
- **Duplicated pattern:** The `AdminShell` component with its 6 props (`collections`, `globals`, `user`, `basePath`, `currentPath`, `ui`) is instantiated identically 10 times in a chain of `{#if}`/`{:else if}` blocks (lines 31-168). Only the child content differs.
- **Estimated waste:** ~70 lines of repeated `AdminShell` prop-passing.
- **Suggested fix:** Restructure to use a single `AdminShell` wrapper outside the `{#if}` chain. Only the login/create-first-user views skip the shell. This could become:
  ```svelte
  {#if data.view === "login" || data.view === "create-first-user"}
    <AdminLoginPage ... />
  {:else}
    <AdminShell {collections} {globals} {user} {basePath} {currentPath} {ui}>
      {#if data.view === "dashboard"} ... {:else if ...} ... {/if}
    </AdminShell>
  {/if}
  ```

### 6. Repeated admin action guard boilerplate

- **File:** `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts`
- **Duplicated pattern:** Every action handler (create, update, delete, createUser, updateUser, deleteUser) begins with the same 4-line preamble:
  ```ts
  const route = parseAdminRoute(event.params.path);
  if (!route || route.kind !== "...") {
    throw error(404, "...");
  }
  const adminExists = (await countAdminUsers(cfg.runelayer)) > 0;
  await cfg.guardAdminRoute(event, route, cfg.adminPath, adminExists);
  ```
  This appears 7 times across the file.
- **Estimated waste:** ~35 lines.
- **Suggested fix:** Extract a helper like `resolveAndGuard(event, expectedKind)` that combines route parsing, kind validation, admin existence check, and guard invocation.

### 7. Duplicated E2E test setup/teardown pattern

- **Files:** All 7 E2E test files in `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/__e2e__/`
- **Duplicated pattern:** Each file has a near-identical setup block:
  ```ts
  let tmpDir: string;
  let runelayer: RunelayerInstance;
  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "rl-e2e-"));
    runelayer = createRunelayer(defineConfig({ ... }));
    await migrateDatabaseForTests(runelayer);
  });
  afterAll(async () => { await rm(tmpDir, { recursive: true }); });
  ```
- **Estimated waste:** ~50 lines across 7 files.
- **Suggested fix:** Create a shared `createTestHarness(collections, globals?)` in `__testutils__/` that handles tmpdir creation, config, runelayer initialization, migration, and cleanup. Returns `{ runelayer, tmpDir, cleanup }`.

## Dead Code & Unused Exports

### Confirmed Dead Code

1. **`schema/index.ts` exports `SCHEMA_VERSION`** (line 1) -- this constant (`"0.0.1"`) is not imported or referenced anywhere in the codebase. It appears to be a placeholder for future schema versioning.

2. **`sveltekit/index.ts`** -- This file is a deprecated re-export barrel (marked `@deprecated` in its JSDoc). It duplicates exports from `sveltekit/server.ts` and `sveltekit/components.ts`. The deprecation is correctly documented but the file remains.

### Potentially Unused

3. **`storage/serve.ts` (`createServeHandler`)** and **`storage/handler.ts` (`createUploadHandler`)** -- These are exported from the package but neither the demo app nor any internal code uses them. They appear designed for direct SvelteKit route handlers but the demo app uses the admin actions layer instead. They are valid public API for manual integration, so this is not dead code per se, but they are untested in integration.

4. **`schema/types.ts` `CollectionAuthConfig`** -- The `auth` field on `CollectionConfig` accepts `boolean | CollectionAuthConfig`, but the `db/schema.ts` table generation only checks `if (auth)` without reading any `CollectionAuthConfig` properties. The detailed fields (`tokenExpiration`, `verify`, `maxLoginAttempts`, `lockTime`) are accepted but never consumed.

5. **`schema/types.ts` `UploadConfig.imageSizes`** -- The `upload` field on `CollectionConfig` accepts detailed `UploadConfig` with `imageSizes`, but image resizing is never implemented. The storage layer stores raw files without transformation.

## Code Efficiency Assessment

The codebase is lean for what it delivers. Key observations:

**Strengths:**

- The backend core (schema through query) is only 1,211 LOC for a full schema-driven CRUD system with access control, lifecycle hooks, and Drizzle ORM integration. This is impressively compact.
- Field builder functions in `schema/fields.ts` use a clean `Opts<F>` generic pattern that avoids repetition across 16 field types.
- The `db/schema.ts` field-to-column mapper handles all 16 field types in a single 52-line switch statement.
- The query layer (`query/operations.ts`) implements all 5 CRUD operations in just 74 lines by delegating cleanly to db and hooks modules.
- The hooks runner is 32 lines total. No over-abstraction.
- Individual field renderer components are 11-29 lines each -- appropriately thin wrappers around Carbon components.

**Areas of concern:**

- The SvelteKit runtime layer (`sveltekit/runtime.ts` at 433 LOC and `sveltekit/admin-actions.ts` at 397 LOC) is the heaviest single module. This is expected -- it orchestrates routing, auth guards, form actions, and user management. However, the repeated guard boilerplate could be tightened.
- Admin CSS duplication inflates the admin module by ~280 lines (roughly 11% of admin LOC).
- The `AdminPage.svelte` view router (175 lines) could be cut nearly in half by extracting the `AdminShell` wrapper.
- The demo app at 3,313 LOC is larger than half the library source. The seed file alone (570 LOC) and schema file (388 LOC) are substantial. This is acceptable for a feature-rich demo but worth noting.

**Code-to-feature ratio:**

The library delivers: schema DSL, 16 field types, table generation, CRUD operations, access control, lifecycle hooks, auth with session management and admin roles, local file storage, a complete admin UI with 11 pages and 9 field renderers, user management, globals, health monitoring, drizzle-kit integration, and a SvelteKit handle hook -- all in 5,606 LOC. That is approximately 350 LOC per major feature. This is a well-engineered, compact codebase.

## Action Items

### Critical

None. There are no DRY violations severe enough to cause maintenance hazards or bugs.

### Medium

1. **Consolidate hook type definitions** -- Merge the dual hook type systems in `schema/types.ts` and `hooks/types.ts` to eliminate 8 `as any` casts in `query/operations.ts`. This is the highest-value cleanup because the type divergence could hide type errors.
   - Files: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/schema/types.ts`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/hooks/types.ts`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/query/operations.ts`

2. **Extract shared admin CSS** -- Move the repeated `.rk-page-header`, `.rk-page-body`, `.rk-eyebrow`, `.rk-page-title-row`, and responsive breakpoint styles into a shared stylesheet imported by all page components. Saves ~280 lines and ensures visual consistency.
   - Files: All 8 page components in `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/`

3. **Extract `quoteIdent` to shared utility** -- Deduplicate the SQL identifier quoting function.
   - Files: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/globals.ts`

### Low

4. **Merge RichTextField and JsonField** -- Combine into a single component with a `helperText` prop.
   - Files: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/fields/RichTextField.svelte`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/fields/JsonField.svelte`

5. **Deduplicate AdminShell wrapper in AdminPage.svelte** -- Wrap the shell once outside the view-switch chain.
   - File: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/AdminPage.svelte`

6. **Extract admin action guard helper** -- Reduce the repeated 4-line preamble in `admin-actions.ts`.
   - File: `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts`

7. **Create shared E2E test harness** -- Centralize the tmpdir/runelayer setup pattern.
   - Files: All 7 E2E test files in `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/__e2e__/`

### Recommendations

- **Remove `SCHEMA_VERSION`** from `schema/index.ts` or put it to use. An unused version constant creates a false promise of schema versioning.
- **Audit `CollectionAuthConfig` and `UploadConfig.imageSizes`** -- Either implement the features these types describe or remove the unused properties to avoid misleading API consumers.
- **Plan for `sveltekit/index.ts` removal** -- The deprecated barrel file should have a removal timeline to avoid confusion about which entry point to use.
- **Consider adding admin UI tests** -- The admin module is 2,577 LOC with zero test coverage. While UI testing is harder, even basic component rendering tests would catch regressions in the view router and field renderer dispatch.
