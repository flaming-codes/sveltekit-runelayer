# Package & App Architecture Review

## Synopsis

sveltekit-runelayer has a strong architectural core: schema is the leaf, db/auth/storage are peers, query composes them, and the SvelteKit integration sits above that stack instead of bleeding downward. The split `sveltekit/server` and `sveltekit/components` entry points are the right shape for a SvelteKit package, and the host-app glue in the demo is intentionally small. The main architectural debt is boundary ambiguity rather than layering failure: the package exposes two overlapping public integration paths, ships a deprecated combined entry point, keeps `any`/`unknown` in public runtime types, and initializes storage without a complete runtime contract for how uploads/serving are mounted.

## Grade: 7/10

## Architecture Snapshot

```
schema (leaf)
  |
  +--> db/       (Drizzle table generation + CRUD)
  +--> auth/     (Better Auth wrapper + access helpers)
  +--> storage/  (filesystem adapter)
  +--> hooks/    (generic lifecycle runner)
  +--> query/    (access + hooks + db orchestration)
  +--> plugin/   (low-level composition root)
  +--> sveltekit/ (runtime, loaders, actions, admin integration)
  +--> admin/    (Carbon Svelte UI primitives)
```

That dependency direction is healthy. I did not find cycles between the core modules, and the schema module correctly stays free of runtime concerns.

## Main Analysis

### Composition Root

The low-level root in [`packages/sveltekit-runelayer/src/plugin.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/plugin.ts) is straightforward: it creates the database, auth, and storage instances, then returns a combined SvelteKit `handle`. That is a good thin-adapter pattern.

The higher-level root in [`packages/sveltekit-runelayer/src/sveltekit/runtime.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime.ts) is where the architecture becomes more opinionated. It owns admin route parsing, guard logic, loader dispatch, user lookup, health handling, and action factory wiring. That is still coherent, but it is doing more than a single composition root should ideally do. The module is the package's real orchestration center, so its size is understandable; the tradeoff is that it now encodes a lot of cross-module policy in one file.

The result is a package that is easy to boot, but not yet easy to extend by substitution. Future adapters or alternate admin surfaces will need to thread through this runtime layer carefully.

### Public Surface

The strongest and weakest architectural choice are the same thing: the package offers both a low-level API and a high-level API.

- [`packages/sveltekit-runelayer/src/index.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/index.ts) exports `createRunelayer`, raw DB/query helpers, auth helpers, storage helpers, hooks, and schema builders.
- [`packages/sveltekit-runelayer/src/sveltekit/app.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/app.ts) and [`packages/sveltekit-runelayer/src/sveltekit/types.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/types.ts) define the higher-level `createRunelayerApp()` integration with `handle`, `admin`, `withRequest()`, and `system`.

In practice, the demo app uses the high-level path, while the low-level path remains public but under-specified. That creates two mental models for the same product. For a package that wants to feel like a single CMS primitive, this is too much surface area.

The split `sveltekit/server` and `sveltekit/components` entry points are correct. [`packages/sveltekit-runelayer/src/sveltekit/server.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/server.ts) and [`packages/sveltekit-runelayer/src/sveltekit/components.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/components.ts) isolate server-only and browser-safe code cleanly. The deprecated combined entry in [`packages/sveltekit-runelayer/src/sveltekit/index.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/index.ts) is acceptable as a transition aid, but it should stop being a first-class integration story.

### Module Boundaries

The package boundary layout is disciplined:

- `schema/` is a leaf and defines the content model only.
- `db/` turns schema into tables and CRUD helpers.
- `auth/` wraps Better Auth and exposes the access helpers.
- `query/` composes access, hooks, and DB operations.
- `storage/` is intentionally separate from the database layer.
- `admin/` is UI-only and consumes serialized data.

That separation is mostly consistent with the docs in `docs/architecture.md` and `docs/integration-decisions.md`. The part that is still incomplete is the runtime contract around storage: [`packages/sveltekit-runelayer/src/storage/index.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/storage/index.ts) exports upload/serve handlers, but [`packages/sveltekit-runelayer/src/plugin.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/plugin.ts) only initializes the adapter. The architecture says storage is a first-class concern, but the composition root does not finish that story.

[`packages/sveltekit-runelayer/src/db/schema.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/db/schema.ts) is mostly clean as a schema compiler, but it currently prefers silent fallback over fail-fast behavior for unknown field types. That is convenient during development and dangerous once the package is used as an integration layer in host apps.

### Host Integration Ergonomics

The host-facing shape is good in concept. [`packages/sveltekit-runelayer/src/sveltekit/types.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/types.ts) documents the need to inject SvelteKit's `redirect`, `error`, and `fail` from the host app, which avoids `instanceof` mismatches. The example glue in `docs/admin-ui.md` is short and realistic.

What still hurts ergonomics is the lack of runtime validation at the boundary. [`packages/sveltekit-runelayer/src/config.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/config.ts) is effectively a defaulting helper, not a validator. For a library that is expected to own routing, auth, migrations, and admin UX inside the host process, missing validation is a structural weakness because bad config fails late and with poor diagnostics.

The `system` vs `withRequest()` split is sensible, but it should be presented more explicitly as an architectural decision. Right now it is technically sound and conceptually easy to misuse if consumers do not understand which path bypasses request-scoped access control.

### Packaging And Extensibility

[`packages/sveltekit-runelayer/package.json`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/package.json) uses source exports directly, which is the right tradeoff for a SvelteKit-first package. The package stays tree-shakeable and avoids a second build pipeline. That said, the public export map is broad. It currently exposes raw DB/auth/query/storage primitives alongside the higher-level SvelteKit runtime, so the package is both a framework and a kit of parts.

That can work, but only if the supported entry points are very clearly differentiated. Right now the codebase is drifting toward "everything is public," which weakens the second-use-rule discipline described in the repo docs. The right long-term shape is probably one recommended path and a small number of explicitly advanced paths, not multiple equivalent ones.

The architecture is also reasonably future-proof for new adapters in principle:

- storage already has an interface abstraction,
- auth is encapsulated behind a wrapper,
- query has a single orchestration layer,
- schema is centralized.

But those seams need stronger contracts. Without typed boundaries and config validation, adding new adapters risks multiplying the same ambiguity in a second backend.

## Action Items

### Critical

- Collapse the overlapping integration story into a single recommended API path. Keep `createRunelayerApp()` as the supported host-app entry point, or make the low-level `createRunelayer()`/raw helper surface explicitly advanced and clearly documented. Right now [`packages/sveltekit-runelayer/src/index.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/index.ts), [`packages/sveltekit-runelayer/src/sveltekit/app.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/app.ts), and [`packages/sveltekit-runelayer/src/sveltekit/index.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/index.ts) present too many equivalent-looking paths for one product.

### Medium

- Add runtime validation at the composition boundary in [`packages/sveltekit-runelayer/src/config.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/config.ts) and [`packages/sveltekit-runelayer/src/sveltekit/runtime.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime.ts). Missing auth secrets, unsafe identifiers, or empty/invalid configs should fail early with a clear message.
- Replace the public `any`/`unknown` leaks in [`packages/sveltekit-runelayer/src/sveltekit/types.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/types.ts), [`packages/sveltekit-runelayer/src/auth/index.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/auth/index.ts), and [`packages/sveltekit-runelayer/src/auth/handler.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/auth/handler.ts) with concrete types. The public API should reflect the schema-driven promise of the package.
- Decide whether storage is host-managed or package-managed, then make the composition root match that decision. [`packages/sveltekit-runelayer/src/storage/index.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/storage/index.ts) currently exposes upload/serve helpers that the runtime does not wire up.
- Split the orchestration pressure in [`packages/sveltekit-runelayer/src/sveltekit/runtime.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime.ts) once the module changes again. It is still understandable, but it is already carrying routing, guards, loader dispatch, and admin policy in one file.

### Low

- Keep the deprecated combined entry point in [`packages/sveltekit-runelayer/src/sveltekit/index.ts`](/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/index.ts) only as long as compatibility requires it, and avoid documenting it as a preferred path.
- Either use or remove `SCHEMA_VERSION` in the schema layer. An exported version constant that is never read creates false architectural intent.
- Deduplicate shared helper logic such as identifier quoting and safe-name checks across modules instead of re-declaring it in multiple places.

### Recommendation

- Add an integration test that exercises the full `createRunelayerApp()` flow, not just the underlying modules. The architecture is defined by the composition root, so that is the seam that deserves the strongest coverage.
- Preserve the second-use rule, but make the rule explicit in code structure: one main integration path, a small number of advanced primitives, and no duplicate "equally supported" surfaces.
- Consider introducing narrower public types for the host runtime, especially around request-scoped access and admin data serialization, so the package can grow adapters without widening the API further.
