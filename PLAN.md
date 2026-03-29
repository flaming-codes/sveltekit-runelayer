# Runelayer CMS v1 Plan (Updated With Engineering Directives)

## Summary

- Deliver a Svelte-native CMS mounted at `/admin` with Node runtime, SQLite-first (Drizzle), Better Auth, local FS storage, and in-process querying.
- Keep v1 scope at core CMS parity (collections, globals, auth, access, uploads, versions/drafts, localization, hooks, admin UI).
- Make these non-negotiable directives first-class: **DRY**, **reusability**, **long-term maintainability**, **continuous testing**, **simplicity**, and **low LOC**.

## Primary Engineering Directives

- Single source of truth per concern: schema metadata defined once and reused for DB mapping, validation, query layer, and admin rendering.
- No duplicate logic across packages: shared core utilities in `runelayer-core`; adapters only implement contracts.
- "Second-use rule" for abstractions: do not introduce abstractions until at least 2 concrete usages exist.
- Low-LOC preference: smallest correct implementation, short functions, minimal public API surface, explicit deletion of dead code each milestone.
- Maintainability-first boundaries: stable package contracts, internal extension hooks in v1, unstable APIs clearly marked internal.

## Implementation Progress

### Phase 0: Foundation

- [x] Monorepo scaffolding (pnpm workspace, vite-plus, TypeScript)
- [x] Install core dependencies (drizzle-orm, better-sqlite3, better-auth, drizzle-kit)
- [x] Research validation (integration choices, Payload parity, plan review) — in progress

### Phase 1: Core Modules

- [x] **Schema type system** (`src/schema/`) — 16 field types, builder functions, collection/global definitions, 130 LOC
- [x] **Auth system** (`src/auth/`) — Better Auth + Drizzle adapter, access control (isAdmin/isLoggedIn/hasRole), SvelteKit handler, 130 LOC
- [x] **Storage layer** (`src/storage/`) — StorageAdapter contract, local FS impl, upload/serve handlers, 155 LOC
- [x] **Hooks system** (`src/hooks/`) — HookContext types, sequential runner with error isolation, 65 LOC

### Phase 2: Data Layer

- [x] **Database layer** (`src/db/`) — Schema-to-Drizzle table gen, :memory:/file SQLite, push migrations, CRUD ops, 160 LOC
- [x] **Query API** (`src/query/`) — find/findOne/create/update/remove with access control + hooks, 90 LOC

### Phase 3: Admin UI

- [x] **Admin layout** — Sidebar nav, topbar with user/logout, responsive shell
- [x] **Collection views** — CollectionList (sortable table, pagination), CollectionEdit (form with field rendering)
- [x] **Field components** — 10 field renderers (text, number, checkbox, select, textarea, date, richtext, json, relationship, FieldRenderer dispatcher)
- [x] **Auth UI** — Login component with email/password
- [x] **Dashboard** — Collection cards with document counts
- [x] **Server handlers** — Load/action factories for CRUD operations
- [x] **Route helper** — getAdminRoutes() for host app integration

### Phase 4: Integration

- [x] **Plugin wiring** (`src/plugin.ts`) — createRunelayer() initializes DB, auth, storage, push schema, returns handle hook
- [x] **Config system** — defineConfig() with collections, globals, auth, storage, dbPath
- [x] **Main exports** (`src/index.ts`) — Unified public API surface
- [ ] **Demo app** (`apps/demo`) — working example with collections

### Phase 5: Testing & Quality

- [x] **Unit tests** — 53 tests across 6 suites (schema, DB CRUD, auth access, storage, hooks, query API)
- [x] **Code review** — adversarial review completed
- [ ] **Contract tests** — adapter contracts (DB, storage, auth)
- [ ] **E2E tests** — Testcontainers-based browser tests
- [ ] **CI pipeline** — quality gates, bundle-size checks

## Stats

- **Source files**: 47 (.ts + .svelte, excluding tests)
- **Source LOC**: 1,578
- **Test files**: 6
- **Test LOC**: 548
- **Tests**: 53 passing (6 suites)
- **TypeScript**: Clean (0 source errors)
- **Modules**: 7 (schema, db, auth, storage, hooks, query, admin)

## Implementation Changes

- Keep package split, but enforce lean boundaries:
- `runelayer-core` owns domain model, access, hooks, query API, shared types.
- `runelayer-db-drizzle-sqlite`, `runelayer-auth-better`, and storage packages are thin adapters.
- `runelayer-admin-carbon` is route-isolated and lazy-loaded to prevent public-site bloat.
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
