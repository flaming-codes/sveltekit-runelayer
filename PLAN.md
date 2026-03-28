# Runekit CMS v1 Plan (Updated With Engineering Directives)

## Summary

- Deliver a Svelte-native CMS mounted at `/admin` with Node runtime, SQLite-first (Drizzle), Better Auth, local FS storage, and in-process querying.
- Keep v1 scope at core CMS parity (collections, globals, auth, access, uploads, versions/drafts, localization, hooks, admin UI).
- Make these non-negotiable directives first-class: **DRY**, **reusability**, **long-term maintainability**, **continuous testing**, **simplicity**, and **low LOC**.

## Primary Engineering Directives

- Single source of truth per concern: schema metadata defined once and reused for DB mapping, validation, query layer, and admin rendering.
- No duplicate logic across packages: shared core utilities in `runekit-core`; adapters only implement contracts.
- “Second-use rule” for abstractions: do not introduce abstractions until at least 2 concrete usages exist.
- Low-LOC preference: smallest correct implementation, short functions, minimal public API surface, explicit deletion of dead code each milestone.
- Maintainability-first boundaries: stable package contracts, internal extension hooks in v1, unstable APIs clearly marked internal.

## Implementation Changes

- Keep package split, but enforce lean boundaries:
- `runekit-core` owns domain model, access, hooks, query API, shared types.
- `runekit-db-drizzle-sqlite`, `runekit-auth-better`, and storage packages are thin adapters.
- `runekit-admin-carbon` is route-isolated and lazy-loaded to prevent public-site bloat.
- Add architecture guardrails:
- ADRs for only high-impact decisions.
- API review checklist for every new export.
- Complexity budget (no cross-package cyclic dependencies, no feature-specific logic in shared base).
- Add reuse-first library strategy:
- Better Auth, Drizzle, Carbon Svelte, Superforms, TanStack Table, Tiptap, Uppy, `svelte-dnd-action`.
- Build custom code only where CMS-specific domain behavior is not covered by existing libraries.

## Continuous Testing (Mandatory)

- Testing is continuous, not phase-end:
- On every commit: unit + contract tests for changed packages.
- On every PR: full integration + E2E suite.
- Nightly: full regression including migration and performance smoke checks.
- E2E must use **Testcontainers**:
- Spin ephemeral dependency stack with `testcontainers` (Mailpit for auth email flows, MinIO-compatible storage adapter tests, and PostgreSQL container for forward-compat adapter contract checks).
- Run SvelteKit app against containerized dependencies and execute browser E2E (admin login, CRUD, drafts/publish, localization, uploads, role restrictions).
- Keep runs hermetic and disposable; no shared external test services.
- Quality gates:
- No merge with failing tests.
- Critical-path E2E required for auth, upload, and content publishing flows.
- Bundle-size and route-isolation checks required in CI.

## Assumptions and Defaults

- Node runtime is authoritative for v1 to support local FS and SQLite.
- SQLite is first adapter; Postgres is next without breaking core contracts.
- Svelte-first DSL remains primary.
- Internal hooks are available in v1; stable plugin API deferred to v2.
