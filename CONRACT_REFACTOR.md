# Group Field Contract Refactor

## Purpose

This document records the current group-field contract drift in the codebase, the concrete places where it appears, and the recommended long-term refactor plan.

It is intended as a handoff document for the next agent so the work can continue from a clear architectural baseline instead of accumulating more boundary-specific patches.

## Summary

The codebase does not have a single canonical runtime contract for `group()` fields.

Today, three different models coexist:

1. Schema typing and admin state model groups as nested objects.
2. Database schema and query enforcement model groups as flattened underscore-prefixed keys.
3. First-party demo app code consumes grouped data as flattened keys.

This mismatch is the root cause behind the recent admin draft/create issues and is broader than admin form transport.

The recommended long-term direction is:

- Canonical external contract: nested group objects.
- Internal persistence contract: flattened storage keys.
- Translation boundary: one shared schema-aware layer that is the only place that knows how to flatten and inflate groups.

## Why This Matters

Without a single contract:

- admin loaders and editors receive data in a different shape than they render,
- hooks and access control reason about storage-shaped data instead of document-shaped data,
- globals and collections risk diverging further,
- version snapshots preserve persistence shape leaks,
- public query behavior becomes difficult to document accurately,
- first-party apps encode assumptions that contradict the schema DSL.

The immediate admin payload flattening fix is a stopgap. It prevents one user-visible failure, but it does not resolve the architectural drift.

## Current State Snapshot

### 1. Schema DSL and inferred types say groups are nested

`packages/sveltekit-runelayer/src/schema/fields.ts`

- `GroupField` is declared as a structural field with nested `fields`.
- `InferFieldValue` and `InferFieldsData` infer groups as nested objects.

Effect:

- A field like `seo` with children `metaTitle` and `metaDescription` implies a runtime shape like:

```ts
{
  seo: {
    metaTitle: string;
    metaDescription: string;
  }
}
```

### 2. Admin UI state says groups are nested

`packages/sveltekit-runelayer/src/admin/components/fields/GroupField.svelte`

- `values[name]` is initialized as an object.
- child fields render against `values[name]`.

Effect:

- The admin field renderer expects `group` state to look like:

```ts
values.seo = {
  metaTitle: "...",
  metaDescription: "...",
};
```

### 3. Database schema generation says groups are flattened

`packages/sveltekit-runelayer/src/db/schema.ts`

- `group` fields are recursively mapped to prefixed columns.

Effect:

- `seo.metaTitle` becomes `seo_metaTitle`.
- `hero.heading` becomes `hero_heading`.

This is a valid internal persistence strategy and does not need to change by itself.

### 4. Query enforcement says groups are flattened

`packages/sveltekit-runelayer/src/query/enforcement.ts`

- runtime field maps are built with flattened keys for groups,
- field validation, required checks, field access checks, and allowlists all operate on flattened names,
- block subfield enforcement also flattens nested groups inside blocks.

Effect:

- collection/global write payloads are accepted in storage-shaped form,
- the query layer is currently not a nested document boundary.

### 5. Admin actions currently flatten nested payloads before query writes

`packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts`

Current state:

- admin forms submit a single JSON `payload`,
- `flattenAdminPayload()` recursively flattens groups,
- `parseDocumentPayload()` requires JSON payload and converts it to query-layer shape before write.

This solves the specific browser form flattening bug, but it is explicitly a translation patch at the admin boundary.

### 6. Query read path still exposes flattened group keys

`packages/sveltekit-runelayer/src/query/operations.ts`

Observed behavior:

- DB rows are fetched in flat form,
- group traversal for relationship collection/population uses prefixed keys,
- no general group rehydration step reconstructs nested objects before returning documents.

Effect:

- `find()` and `findOne()` return flat group keys,
- collection documents used by loaders remain storage-shaped.

### 7. Globals also return flattened group keys

`packages/sveltekit-runelayer/src/sveltekit/globals.ts`

Important clarification:

- globals are not exempt from this problem,
- `updateGlobalDocument()` calls `enforceWritePayload()`, which flattens/accepts group data by storage key,
- `materializeGlobalDoc()` spreads stored data directly into the returned document,
- `readGlobalDocument()` does not rehydrate grouped keys.

Effect:

- global documents are also storage-shaped on read,
- the current admin global path only works because the action layer now flattens nested writes, not because the global runtime contract is nested.

### 8. First-party demo code already depends on flat grouped keys

Files:

- `apps/demo/src/lib/types.ts`
- `apps/demo/src/lib/server/seed.ts`
- `apps/demo/src/routes/(site)/blog/[slug]/+page.svelte`
- `apps/demo/src/routes/(site)/pages/[slug]/+page.svelte`

Observed behavior:

- row types declare fields like `seo_metaTitle` and `hero_heading`,
- seed data writes flattened group keys,
- page components render flattened group keys.

Effect:

- the repository itself encodes the flat leak,
- any long-term refactor must migrate first-party consumers alongside the package contract.

## Concrete Drift Inventory

### Drift A: Schema typing vs runtime query results

Schema type inference implies nested groups.
Runtime collection/global reads return flattened keys.

Impact:

- Type-level expectations are misleading.
- Host apps can write code that is type-correct but runtime-wrong.

### Drift B: Admin editor state vs loader document shape

Group UI components expect nested values.
Loaders provide flat documents.

Impact:

- previously saved grouped values will not round-trip cleanly through admin edit flows,
- empty or reset UI state is likely when editing grouped content.

### Drift C: Collections and globals share the same conceptual problem

The mismatch is not isolated to collections.
Both collections and globals persist flat keys and return flat keys.

Impact:

- fixing only collection query reads would leave globals inconsistent,
- future code will drift again unless both paths share one translation layer.

### Drift D: Docs describe multiple incompatible contracts

Examples:

- `docs/schema.md` says groups are flattened with prefix,
- `docs/admin-ui.md` says group values are nested,
- schema inference implies nested external shape,
- demo app examples consume flat runtime keys.

Impact:

- contributors cannot infer the correct contract from docs alone,
- regressions are more likely because multiple interpretations look legitimate.

### Drift E: Tests largely miss the real round-trip problem

Current state:

- there is action-layer coverage for admin payload flattening,
- there is no meaningful round-trip coverage for grouped document shape across query read/write/load/render/versioning flows,
- there is no evidence of collection/global parity tests for grouped fields.

Impact:

- the current mismatch survived because the suite does not enforce a single runtime contract.

## Current Stopgap

The most recent patch introduced:

- JSON `payload` submission for admin document/global writes,
- schema-aware flattening of nested group values in `admin-actions.ts`,
- tests that verify action-layer flattening.

What this fixes:

- browser form serialization no longer leaks block subfields like `heading` into top-level collection writes,
- grouped admin writes can now be converted to query-layer storage shape.

What this does not fix:

- query read results are still flat,
- loader document shape is still flat,
- hooks/access/projection still operate on flat keys,
- version snapshots still risk storing/returning flat documents,
- first-party app code is still flat.

## Recommended Target Contract

### Canonical external contract

Nested group objects should be the single document contract across:

- schema type inference,
- query API inputs and outputs,
- hooks,
- admin loader data,
- admin editor state,
- globals,
- version snapshots and restores,
- examples and docs.

Example target document:

```ts
{
  title: "Hello",
  seo: {
    metaTitle: "Hello | Site",
    metaDescription: "Description",
  },
  hero: {
    heading: "Welcome",
    subheading: "Start here",
  },
}
```

### Internal contract

Flattened storage keys remain an internal implementation detail:

```ts
{
  seo_metaTitle: "Hello | Site",
  seo_metaDescription: "Description",
  hero_heading: "Welcome",
  hero_subheading: "Start here",
}
```

This shape should exist only inside:

- DB schema generation,
- DB CRUD row writes/reads,
- internal query translation helpers,
- query path-to-column translation.

## Non-Goals

The long-term fix should not:

- expose flat prefixed keys as the public API contract,
- keep separate collection and global shape contracts,
- continue layering ad hoc conversions in each boundary,
- rely on docs alone to explain a hybrid model.

## Design Principles For The Refactor

1. One source of truth for shape translation.
2. One public document shape for both collections and globals.
3. Hooks and access control should observe document shape, not row shape.
4. Storage flattening must be reversible and tested.
5. Group semantics must be recursive and work inside blocks.
6. Query filtering and sorting must expose a stable grouped-field path syntax.

## Proposed Long-Term Refactor Plan

### Phase 0: Contract freeze

Before changing code, define the target behavior explicitly.

Decisions to write down first:

- grouped fields are nested externally,
- collections and globals use the same external shape,
- internal storage remains flattened,
- grouped updates use merge semantics unless explicitly replaced,
- query `where` and `sort` for grouped fields use a public path syntax,
- version snapshots represent document shape, not row shape.

Suggested public query path syntax:

- `seo.metaTitle`
- `hero.heading`

This is cleaner than exposing storage names like `seo_metaTitle`.

### Phase 1: Build one schema-aware translation module

Create shared helpers that can:

- flatten nested document patches to storage keys,
- inflate flat rows to nested documents,
- translate grouped query paths to storage column names,
- compute internal storage keys for access/validation,
- detect collisions where two schema paths flatten to the same storage key.

This module should recurse through:

- `group`,
- `row`,
- `collapsible`,
- groups inside `blocks`.

### Phase 2: Move query write paths onto the translator

Refactor collection and global writes so that external inputs are nested, then translated internally.

Impacted areas:

- `query/enforcement.ts`
- `query/operations.ts`
- `sveltekit/globals.ts`
- `sveltekit/admin-actions.ts`

Desired outcome:

- callers submit nested groups,
- query enforcement validates document shape,
- only the final DB write sees flattened keys.

### Phase 3: Move query read paths onto the translator

Collections and globals should both inflate grouped fields before returning documents.

Desired outcome:

- `find()` and `findOne()` return nested group objects,
- `readGlobalDocument()` returns nested group objects,
- admin loaders no longer need shape-specific workarounds,
- UI receives the same shape it emits.

### Phase 4: Align hooks, projection, and access control

Today these behaviors are tightly coupled to flattened runtime field maps.

The refactor must define:

- what shape `beforeChange`, `afterChange`, `beforeRead`, `afterRead` receive,
- how field-level access rules for grouped child fields are evaluated,
- whether parent-level access wraps child-level access or vice versa,
- whether grouped child removals are represented as missing keys, `undefined`, or `null`.

Recommendation:

- hooks should receive nested document shape,
- field-level access may still compile to internal prefixed rules, but the hook-facing doc should be nested.

### Phase 5: Align versioning and restore

Versioning must stop preserving row-shaped leaks.

Required changes:

- collection snapshots should be stored as nested documents,
- restore should accept both legacy flat snapshots and new nested snapshots,
- global version behavior should match collection version behavior,
- version history UI should not need to know storage naming.

### Phase 6: Migrate first-party consumers

Impacted examples:

- demo app row types,
- demo seed data,
- demo page rendering,
- any host wiring that assumes flattened grouped keys.

Examples to migrate:

From:

```ts
post.seo_metaTitle;
page.hero_heading;
```

To:

```ts
post.seo?.metaTitle;
page.hero?.heading;
```

### Phase 7: Remove temporary boundary-specific flatteners

After the query/global layers own the translation contract:

- admin action payload flattening should be minimized or removed,
- admin should pass nested JSON payloads without compensating for lower-level flat expectations,
- docs and tests should no longer describe flat runtime group keys.

## Critical Decisions The Next Agent Must Make Explicitly

### 1. Group update semantics

Question:

If a caller updates only `seo.metaTitle`, should `seo.metaDescription` remain untouched?

Recommendation:

- yes,
- grouped updates should behave like merge patches,
- internal flattening already makes per-child updates natural.

### 2. Public `where` and `sort` syntax

Question:

How should users query grouped fields?

Recommendation:

- use dot-paths like `seo.metaTitle`,
- translate centrally to `seo_metaTitle` internally.

### 3. Hook data shape

Question:

Should hooks receive nested docs or flat row-like docs?

Recommendation:

- nested docs,
- hook authors should not need to know persistence key conventions.

### 4. Snapshot compatibility strategy

Question:

How should existing flat snapshots be handled?

Recommendation:

- support both legacy flat and new nested snapshots during restore,
- convert legacy snapshots on read/restore rather than mutating historical data in place.

## Hidden Coupling And Risk Areas

### Risk 1: Demo app breakage

The demo app currently depends on flat grouped keys. A package-level contract change without a same-PR demo migration will leave the repo inconsistent.

### Risk 2: Access control regression

Grouped child access checks currently rely on flattened runtime key maps. Refactoring shape without rethinking access evaluation could accidentally widen or block access.

### Risk 3: Hook behavior drift

Any existing hooks written against flat keys could break once nested docs become canonical.

### Risk 4: Snapshot restore regressions

Version restore is especially sensitive because it replays historical data into current logic. This path must support legacy flat records during migration.

### Risk 5: Name collision bugs

Flattening `seo.metaTitle` to `seo_metaTitle` collides with a hypothetical top-level field already named `seo_metaTitle`.

The schema should reject ambiguous storage key generation.

### Risk 6: Groups inside blocks

Blocks already have their own recursive enforcement path. Group refactor work that only handles top-level collections/globals will leave block-contained groups inconsistent.

## Required Test Matrix

The next agent should add or update tests for all of the following before finishing the refactor.

### Query-level tests

1. Create collection document with grouped fields using nested input.
2. Find/findOne returns nested grouped output.
3. Partial update of one group child preserves siblings.
4. Save draft with grouped fields preserves nested shape.
5. Publish/unpublish with grouped fields preserves nested shape.
6. Restore version from legacy flat snapshot.
7. Restore version from new nested snapshot.
8. Group fields inside blocks round-trip correctly.
9. Relationship fields nested inside groups populate correctly at `depth: 1`.
10. `where` on grouped field path translates correctly.
11. `sort` on grouped field path translates correctly.

### Global tests

1. Update global using nested group input.
2. Read global returns nested grouped output.
3. Save draft global preserves nested shape.
4. Restore global version supports both legacy and new snapshot shapes.

### Access control tests

1. Parent group access applies correctly.
2. Child field access applies correctly.
3. Read projection redacts grouped child fields correctly.
4. Mixed allowed/denied grouped child fields produce expected nested output.

### Hook tests

1. `beforeChange` receives nested group input.
2. `afterChange` receives nested document output.
3. `beforeRead` and `afterRead` receive nested docs.
4. Hook-written grouped updates round-trip correctly.

### Admin tests

1. Collection edit loader returns grouped data in the shape `GroupField` expects.
2. Editing existing grouped values does not clear them.
3. Groups inside blocks render existing values correctly.
4. Global edit loader returns grouped data in nested shape.

### First-party app tests or migrations

1. Demo app types updated from flat to nested.
2. Demo app rendering updated from flat to nested.
3. Demo seed data updated to nested writes.

## Suggested Acceptance Criteria

The refactor is complete when all of the following are true:

1. Public query write inputs accept nested grouped values.
2. Public query read outputs return nested grouped values.
3. Collections and globals behave the same way.
4. Hooks receive nested document shape.
5. Field-level access behavior remains correct.
6. Admin editors load and submit grouped values without custom shape compensation.
7. First-party apps no longer use flat runtime grouped keys.
8. Legacy version snapshots remain restorable.
9. Docs describe exactly one external contract.
10. No tests assert flat runtime grouped keys except explicit legacy compatibility tests.

## Work Items For The Next Agent

Recommended order:

1. Add failing contract tests for grouped round-trip behavior.
2. Implement shared flatten/inflate/path-translation helpers.
3. Refactor collection query reads/writes to use them.
4. Refactor globals to use the same helpers.
5. Update hooks/access/projection behavior.
6. Update version snapshot/restore behavior.
7. Migrate demo app types, seed data, and page usage.
8. Remove temporary admin-only flattening if it is no longer necessary.
9. Rewrite docs to describe the final contract only.

## Files Most Likely To Change

Core runtime:

- `packages/sveltekit-runelayer/src/query/enforcement.ts`
- `packages/sveltekit-runelayer/src/query/operations.ts`
- `packages/sveltekit-runelayer/src/sveltekit/globals.ts`
- `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts`
- `packages/sveltekit-runelayer/src/schema/fields.ts`

Admin/UI:

- `packages/sveltekit-runelayer/src/admin/components/fields/GroupField.svelte`
- `packages/sveltekit-runelayer/src/admin/components/fields/BlocksField.svelte`
- `packages/sveltekit-runelayer/src/sveltekit/runtime-loaders.ts`

Tests:

- `packages/sveltekit-runelayer/src/query/__tests__/query.test.ts`
- `packages/sveltekit-runelayer/src/sveltekit/__tests__/admin-actions-guard.test.ts`
- new query/global/admin/e2e tests for grouped fields

Docs/examples:

- `docs/schema.md`
- `docs/query-api.md`
- `docs/admin-ui.md`
- `docs/database.md`
- `apps/demo/src/lib/types.ts`
- `apps/demo/src/lib/server/seed.ts`
- demo route files consuming grouped fields

## Recommended Final Direction

Pick one contract and remove the hybrid model.

Recommendation:

- external contract: nested groups,
- internal storage: flattened groups,
- one shared translation layer,
- explicit compatibility handling only where needed for legacy snapshots or staged migration.

Do not formalize the current mixed model as a permanent architecture. It is the source of the drift.
