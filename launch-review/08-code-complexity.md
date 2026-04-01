# Code Complexity & Readability Review

## Synopsis

`sveltekit-runelayer` is no longer organized around a single runtime god function. The worst of the old sprawl has already been split into `runtime-loaders.ts` and `resolveGuardedRoute()`, which is a real improvement. What remains is a set of compact but mentally dense coordination layers: `runtime.ts` still owns orchestration, `AdminPage.svelte` still acts as a hand-written view router, `db/schema.ts` still encodes several implicit storage rules, and `globals.ts` still follows a separate storage path from collections. The code is readable, but only if you already understand the CMS model and the SvelteKit integration contract.

## Grade: 7/10

## Main Findings

### 1. `runtime.ts` is a composition root, not a simple entry point

The current `runtime.ts` is much better than the old monolith, but it still concentrates a lot of meaning in one closure. It owns admin-path normalization, auth guard policy, the query API wiring, health interception, and the loader/action dependency graph. Understanding it means jumping between `[runtime.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime.ts#L28)`, `[runtime-loaders.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime-loaders.ts#L1)`, `[admin-actions.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts#L1)`, and `[admin-queries.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts#L1)`.

The good news is that the old route-dispatch chain is gone. The remaining cost is not line count, it is closure density: `loaderCtx` carries a lot of implicit context, and the runtime still exposes a few special-case paths that only make sense once you know the auth and admin bootstrap rules.

### 2. `AdminPage.svelte` is still a manual view router

`[AdminPage.svelte](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/AdminPage.svelte#L1)` is now wrapped by `AdminShell` only once, which is cleaner than before. The remaining complexity is the manual `if/else` chain over `data.view` and the untyped `Record<string, any>` contract. The page works, but the data shape is implicit and easy to drift.

This is the main place where a new contributor has to hold two files in their head at once: the loader shapes in `runtime-loaders.ts` and the rendering branches in `AdminPage.svelte`. A discriminated union would make that contract visible instead of tribal knowledge.

### 3. `admin-actions.ts` is better factored, but still mixes too many concerns

The shared `resolveGuardedRoute()` helper removed a lot of repeated guard boilerplate, which is good. The file is still cognitively heavy because it combines collection CRUD, global writes, auth login/bootstrap, and Better Auth user management in one module.

The special-case paths are what make it hard to reason about:

- `createFirstUser` has to coordinate signup, promotion to admin, and the "no admins exist yet" bootstrap rule.
- `deleteUser` has to enforce self-delete protection and the last-admin invariant.
- `create` and `update` mix form parsing, query-layer calls, and global-vs-collection branching.

To understand those flows, you need `[runtime.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime.ts#L50)`, `[admin-actions.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts#L55)`, and `[auth/index.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/auth/index.ts#L18)` together.

### 4. `db/schema.ts` encodes a lot of implicit CMS semantics

The schema-to-table mapper is compact, but it hides several important rules by omission. Some field types persist to columns, some are layout-only, some flatten into prefixed columns, and some create auxiliary tables. That is a clean implementation, but it is also easy to misread if you do not already know the Payload-style field model.

The hidden contract is:

- `row` and `collapsible` disappear structurally.
- `group` prefixes columns.
- `array` becomes a child table.
- `relationship` with `hasMany` becomes a join table.
- Unsupported field types silently fall through to `{}`.

That behavior is correct, but it is encoded as a switch statement plus omissions rather than as an explicit model. See `[db/schema.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/db/schema.ts#L10)`.

### 5. `query/operations.ts` and `globals.ts` still split the data model in two

`[query/operations.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/query/operations.ts#L1)` is small, but it still relies on `as any` hook bridging and a loose table lookup by slug. That is not a lot of code, but it is the kind of code that forces readers to trust the implementation instead of the types.

`[globals.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/globals.ts#L1)` is the other mental-model hotspot. Globals do not use the normal generated table path at all. They create and maintain a separate table at runtime, then read and write it with raw SQL. That is a valid design, but it means the package really has two storage stories:

- collections go through generated Drizzle tables and the query layer
- globals go through a separate key-value table and direct SQL

That split is worth keeping, but it should stay explicit because it is easy for new contributors to assume globals behave like collections.

### 6. Auth handling is correct but still conceptually elevated

`[auth/index.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/auth/index.ts#L18)` is not especially long, but it has a non-trivial mental model: strip spoofed headers, resolve session, inject verified headers, then let Better Auth handle its own routes. On top of that, `[admin-queries.ts](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts#L63)` creates a synthetic `systemRequest()` with admin headers so server-side code can bypass normal access checks on purpose.

That is fine, but it is a privileged path that new contributors will not guess without reading the code. It should stay very explicit in docs and comments.

## Action Items

### Critical

None.

### Medium

- Define a discriminated union for admin loader data and use it in both `runtime-loaders.ts` and `AdminPage.svelte` so the view contract is enforced by TypeScript.
- Split Better Auth user-management helpers out of `admin-actions.ts` so `runtime.ts` and `admin-actions.ts` stop carrying auth bootstrap, collection CRUD, and user admin in the same mental bucket.
- Replace the `as any` hook bridging in `query/operations.ts` and `globals.ts` with a single canonical hook context or adapter.

### Low

- Rename `table()` and `hookCtx()` in `query/operations.ts` to self-describing names; the current names are compact but do not help a reader who is not already inside that module.
- Add a short comment or docstring near `systemRequest()` explaining that it is an intentional privileged server-only bypass, not a normal request factory.
- Add a note in `db/schema.ts` that `row` and `collapsible` are layout-only while `array` and `hasMany relationship` create auxiliary tables.

### Recommendation

- Consider a view-map or wrapper pattern in `AdminPage.svelte` once another admin view is added; the current branch chain is fine now, but it will get harder to extend as the admin surface grows.
- Consider extracting globals storage into a dedicated module with explicit "key-value table" semantics so the parallel path stays obvious as the package evolves.
