# Lines of Code & DRY Analysis

## Synopsis

`sveltekit-runelayer` is still compact for the amount of CMS functionality it ships. Excluding tests, the package is about `5,331` source LOC, with `admin/` (`2,281`) and `sveltekit/` (`1,654`) carrying most of the weight while the backend core remains lean. Several earlier DRY issues have already been cleaned up: shared page-layout CSS is extracted, `quoteIdent` lives in one shared SQL utility, and `AdminPage.svelte` now wraps the shell once instead of repeating it. The remaining duplication pressure is concentrated in the hook type split, repeated Better Auth admin URL assembly, a few near-identical field renderer wrappers, and the still-heavy SvelteKit orchestration layer.

## Grade: 8/10

## LOC Summary

| Module                                            | Source LOC |
| ------------------------------------------------- | ---------: |
| admin/ (Svelte UI)                                |      2,281 |
| sveltekit/ (runtime)                              |      1,654 |
| schema/                                           |        343 |
| db/                                               |        259 |
| auth/                                             |        252 |
| storage/                                          |        188 |
| root files (`index.ts`, `config.ts`, `plugin.ts`) |        160 |
| query/                                            |        114 |
| hooks/                                            |         80 |
| **Package total**                                 |  **5,331** |

### Proportions

- Admin UI: `2,281` LOC, about `43%` of source.
- SvelteKit integration layer: `1,654` LOC, about `31%` of source.
- Backend core (`schema + db + auth + storage + hooks + query`): `1,046` LOC, about `20%` of source.
- The package is still small enough that most complexity comes from orchestration, not from raw size.

## DRY Analysis

### 1. Hook types still exist in two shapes

- **Files:**
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/schema/types.ts`
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/hooks/types.ts`
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/query/operations.ts`
- **Pattern:** the public schema hook types and the runtime hook context are still split, and `query/operations.ts` still bridges that gap with `as any` casts at the hook call sites.
- **Why it matters:** this duplication is not large in LOC, but it creates the highest mental overhead in the data layer. Contributors have to remember which hook shape is user-facing and which one is runtime-facing, then trace the adapter behavior by hand.
- **Assessment:** this is the main remaining type-level DRY problem in the core package.

### 2. Better Auth admin URL assembly is repeated

- **Files:**
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime.ts`
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts`
- **Pattern:** both files build `/api/auth/admin/*` URLs and assemble the same style of request parameters for list/get/create/update/remove user flows.
- **Why it matters:** the duplication is small, but the surface is brittle. When Better Auth's admin API shape changes, this is the exact place where drift would happen first.
- **Assessment:** low LOC cost, medium maintenance risk.

### 3. The rich text and JSON field wrappers are still nearly identical

- **Files:**
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/fields/JsonField.svelte`
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/fields/RichTextField.svelte`
- **Pattern:** `RichTextField` is still just a thin `JsonField` wrapper with different helper text.
- **Why it matters:** this is acceptable if rich-text behavior diverges soon, but right now it is duplicated plumbing for two components that render the same control.
- **Assessment:** a reasonable extraction candidate if the field set grows again.

### 4. `runtime.ts` is still the main coordination hotspot

- **File:**
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime.ts`
- **Pattern:** the file still owns route parsing, admin gating, user lookup, health handling, loader dispatch, and wiring for query APIs.
- **Why it matters:** the file is not bloated, but it is the place where several subsystems meet. That makes it the highest cognitive-load file in the package even after the cleaner extraction work that already landed.
- **Assessment:** the size is fine; the mental model is the issue. Keep it as a coordinator, not a place where new behavior accretes.

### 5. `AdminPage.svelte` is now more acceptable than before

- **File:**
  - `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/AdminPage.svelte`
- **Pattern:** the shell is wrapped once, and the file now acts as a straightforward discriminated view router.
- **Why it matters:** this was previously a duplication hotspot, but the current structure is reasonable. The remaining complexity is the number of possible admin views, not repetitive prop passing.
- **Assessment:** no current DRY finding here, just a file worth keeping flat.

## Dead Code & Unused Surface

### Confirmed dead or placeholder surface

1. `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/schema/index.ts` still exports `SCHEMA_VERSION`, and it is not consumed anywhere.
2. `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/index.ts` remains a deprecated barrel. It is documented, but it still duplicates the newer entry points.
3. `CollectionAuthConfig` and `UploadConfig.imageSizes` are still part of the public schema surface, but the runtime does not fully consume those knobs yet. That is more of an API promise problem than a LOC problem, but it adds noise for readers.

## Code Efficiency Assessment

The package is still efficient relative to the feature set it exposes. The backend core is compact, the admin shell has already been cleaned up substantially, and the shared CSS extraction means the UI no longer repeats its layout scaffolding across every page file. The real cost now comes from coordination modules:

- `sveltekit/admin-actions.ts` remains the biggest single file at `381` lines.
- `sveltekit/runtime.ts` is the next coordination hotspot at `252` lines.
- `db/schema.ts` and `query/operations.ts` stay small and readable, which is the right place to be.

That shape is healthy. The codebase is not suffering from generic bloat; it is suffering from a few concentrated seams where multiple responsibilities meet.

## Action Items

### Critical

None. The remaining DRY issues are real, but they are not yet at the level of immediate maintainability risk.

### Medium

1. Collapse the hook type split into one canonical model or a thin adapter layer. This removes the remaining `as any` pressure in `query/operations.ts` and makes the hook pipeline easier to reason about.
2. Centralize Better Auth admin URL construction and request-parameter assembly so `runtime.ts` and `admin-actions.ts` do not need to keep parallel copies of the same endpoint knowledge.
3. Decide whether `RichTextField` should remain a separate wrapper or become a shared JSON textarea base with different helper text. Right now the split is mostly nominal.

### Low

1. Remove `SCHEMA_VERSION` from `schema/index.ts` if it is not going to drive migration logic.
2. Give `sveltekit/index.ts` a removal date or delete it once downstream consumers have moved to the split entry points.
3. Consider a shared test harness for the repeated E2E tempdir/migration setup under `__testutils__` so the tests stop carrying the same bootstrap scaffolding in each file.

### Recommendation

1. Keep the extracted page-layout and editor-layout CSS as the template for future UI refactors. That cleanup already paid off and should be preserved.
2. Resist adding more special-case SQL or routing paths unless there is no existing helper that can be extended. The current shape is small enough that centralization still beats localized shortcuts.
3. If the runtime grows again, prefer a typed discriminated union for admin view data before adding more branching. The current `AdminPage.svelte` shape is acceptable, but that is where coupling would reappear first.
