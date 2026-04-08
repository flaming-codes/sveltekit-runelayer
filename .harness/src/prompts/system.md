# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Autonomy

You have full autonomy. Proceed without asking for confirmation — read, write, execute, and search freely. Prefer action over discussion.

## Project Overview

sveltekit-runelayer is a CMS-as-a-package for SvelteKit apps. It runs inside the host application's Node process with libsql (Drizzle ORM), Better Auth, and local filesystem storage. The admin UI is built with Svelte 5 runes.

## Commands

### Development

```bash
pnpm dev:web                      # Start web app dev server
pnpm build                        # Build all packages recursively
pnpm check                        # Lint + type check (vp check)
pnpm ready                        # Full quality gate: fmt → lint → test → build
```

### Testing

```bash
npx vitest run                    # Run all tests (unit + E2E)
npx vitest run src/__e2e__        # Run only E2E journey tests
npx vitest run src/db             # Run tests in a specific module
npx vitest run -t "blog"          # Run tests matching a name pattern
npx vitest --watch                # Watch mode
```

### Package-level (from packages/sveltekit-runelayer/)

```bash
pnpm test                         # vp test
pnpm build                        # vp pack
pnpm check                        # vp check
```

### Formatting & Linting

```bash
npx vp fmt                        # Format all files (oxfmt)
npx vp lint --fix                 # Lint + autofix (oxlint, type-aware)
npx vp check --fix                # Combined format + lint + typecheck
```

### Toolchain

- **Build/Dev/Test/Lint**: vite-plus (`vp`) — wraps Vite, Vitest, Oxlint, Oxfmt
- **Package manager**: pnpm 10 with workspace catalog for shared dependency versions
- **Node**: >= 22.18.0 required (native TS strip-types for vp config loading). Pinned to v24.14.1 via `.nvmrc`

## Architecture

### Monorepo Structure

```
packages/sveltekit-runelayer/   → Core CMS library
docs/               → Internal design documentation
```

### Module Structure (packages/sveltekit-runelayer/src/)

```
index.ts            → Public API surface (re-exports from all modules)
config.ts           → RunelayerConfig type + defineConfig()
plugin.ts           → createRunelayer() — wires all modules, returns SvelteKit handle hook
schema/             → Single source of truth: 16 field types, collection/global definitions
db/                 → Drizzle ORM + libsql: schema→table generation, async CRUD, drizzle-kit schema helper
auth/               → Better Auth: session management, role-based access (isAdmin/isLoggedIn/hasRole)
storage/            → Local FS adapter with path traversal protection, upload/serve handlers
hooks/              → Sequential lifecycle runner (beforeChange/afterChange/beforeDelete/afterDelete/beforeRead/afterRead)
query/              → High-level CRUD: find/findOne/create/update/remove with access control + hooks
admin/              → Svelte 5 components (layout, dashboard, login, collection CRUD, 10 field renderers)
```

### Key Design Decisions

- **Schema is single source of truth**: Collection configs drive DB table generation, validation, query layer, and admin rendering. Defined once in TypeScript at build time.
- **Single package**: Despite PLAN.md mentioning separate packages, v1 keeps everything in `@flaming-codes/sveltekit-runelayer` with internal module boundaries. Extract when the second adapter materializes.
- **Header-based auth context**: The auth handle hook injects `x-user-id`/`x-user-role`/`x-user-email` headers after session resolution. Access functions read these headers. Headers are stripped from incoming requests to prevent spoofing.
- **Deny-by-default access**: When an access function is defined but no `Request` is provided, access is denied (403). This prevents accidental server-side bypass.
- **Host-managed migrations**: schema migrations are generated/applied by drizzle-kit before app startup.

### Entry Points

- `@flaming-codes/sveltekit-runelayer` → `packages/sveltekit-runelayer/src/index.ts` (main API)
- `@flaming-codes/sveltekit-runelayer/admin` → `packages/sveltekit-runelayer/src/admin/index.ts` (Svelte components, separate for tree-shaking)

### Test Structure

- `src/**/__tests__/*.test.ts` — Unit tests (54 tests, 6 files)
- `src/__e2e__/*.e2e.test.ts` — User journey E2E tests (96 tests, 7 files)
- Container-based tests use `describe.skipIf(!isDockerRunning())` from `__e2e__/docker-check.ts`

## Critical Constraints

- **Do NOT set `runes: true` globally** in svelte.config.js. Carbon Svelte and Superforms use `export let` internally. Svelte 5 auto-detects runes per-file.
- **vitest is aliased** to `@voidzero-dev/vite-plus-test` via pnpm overrides. It must also be a direct devDependency for TypeScript type resolution.
- **libsql/turso connection config**: use `database.url` and optional `database.authToken` in `defineConfig()`
- **zod v4 + better-auth build fix**: better-auth@1.5.6 uses zod v4 native API (`.meta()`) but imports from `"zod"` which resolves to the v3-compat layer. Any app using better-auth must add `resolve: { alias: { zod: "zod/v4" } }` to `vite.config.ts` to fix production builds.
- All `.ts` imports in source code use `.js` extensions (ESM convention).
- `pnpm-workspace.yaml` catalog manages shared dependency versions. Use `"catalog:"` in package.json.

## Quality Gates

Before signing off any work, run all quality gates in order:

```bash
npx vp fmt                        # 1. Format
npx vp check --fix                # 2. Lint + typecheck (fixes what it can)
npx vitest run                    # 3. All tests (unit + E2E)
pnpm build                        # 4. Build
```

Or use the combined command: `pnpm ready`

All gates must pass. Do not use `--no-verify` to skip pre-commit hooks.

## Design Documentation

Before starting a new task, list files in `/docs` and read those relevant to the task at hand. The docs cover architecture, schema, database, auth, storage, hooks, query API, admin UI, integration decisions, security, testing, Payload CMS parity, monorepo setup, and getting started.

After completing work and all quality gates pass, list files in `/docs` again, then create, update, or delete documentation files as needed so `/docs` always reflects the current state of the project accurately. Documentation should be timeless — no dates, no "currently" or "in progress", just the factual state.
