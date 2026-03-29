# Architecture

Runekit is a CMS-as-a-package for SvelteKit apps. It provides a complete content management system that runs inside the host application's process rather than as a separate service.

## Design Principles

- **Single source of truth**: Schema definitions drive the database layer, validation, query API, and admin UI rendering. Define once, reuse everywhere.
- **Thin adapters**: Core logic lives in shared modules. Database, auth, and storage are thin wrappers over battle-tested libraries (Drizzle, Better Auth, Node fs).
- **Second-use rule**: No abstraction is introduced until at least two concrete usages exist. Premature abstraction is treated as technical debt.
- **Low LOC**: The smallest correct implementation wins. Short functions, minimal public API surface, and explicit deletion of dead code at each milestone.
- **Build-time schemas**: Collections and globals are defined in TypeScript config files at build time (like Payload CMS), not created through the admin UI at runtime.

## Module Dependency Graph

```
                    ┌──────────┐
                    │  config  │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  plugin  │  (createRunekit)
                    └────┬─────┘
           ┌─────────┬──┼──┬─────────┐
           │         │  │  │         │
      ┌────▼──┐ ┌───▼──▼──▼──┐ ┌───▼────┐
      │ auth  │ │     db      │ │storage │
      └───────┘ └──────┬──────┘ └────────┘
                       │
                  ┌────▼─────┐
                  │  query   │ ← uses hooks + access control
                  └────┬─────┘
                       │
                  ┌────▼─────┐
                  │  admin   │ ← Svelte components + handlers
                  └──────────┘
```

All modules depend on `schema` for type definitions. The dependency is one-directional: schema has no runtime dependencies on other modules.

## Package Structure

```
packages/sveltekit-runelayer/src/
├── index.ts          # Public API surface
├── config.ts         # RunekitConfig type + defineConfig()
├── plugin.ts         # createRunekit() — wires all modules together
├── schema/           # Field types, collection/global definitions
├── db/               # Drizzle ORM + SQLite, schema-to-table generation
├── auth/             # Better Auth integration, access control helpers
├── storage/          # Local FS adapter, upload/serve handlers
├── hooks/            # Lifecycle hook types and sequential runner
├── query/            # High-level CRUD with access control + hooks
└── admin/            # Svelte 5 components + SvelteKit handler factories
```

## Runtime Flow

### Initialization (`createRunekit`)

1. Open SQLite database (better-sqlite3 with WAL mode)
2. Generate Drizzle table definitions from collection configs
3. Run push-based migration (create missing tables/columns)
4. Initialize Better Auth with Drizzle adapter
5. Initialize local storage adapter
6. Return `RunekitInstance` with a combined SvelteKit `handle` hook

### Request Handling

For every incoming request, the `handle` hook:

1. Strips any externally-provided `x-user-*` headers (anti-spoofing)
2. Resolves the session from Better Auth cookies
3. Injects `x-user-id`, `x-user-role`, `x-user-email` headers from the session
4. Sets `event.locals.user` and `event.locals.session`
5. Routes to Better Auth API handler if path matches `/api/auth/*`
6. Otherwise passes through to SvelteKit's resolver

### Query Operations

Every query operation (find, create, update, remove) follows the same pattern:

1. **Access check** — evaluate the collection's access function against the request
2. **Before hooks** — run sequentially, each can modify the context/data
3. **Database operation** — execute the Drizzle query
4. **After hooks** — run sequentially with error isolation (failures are logged, not thrown)
5. **Return** — the document(s)

## Key Architectural Decisions

### Single Package (Not Multi-Package)

Despite the PLAN.md mentioning separate packages (`runekit-core`, `runekit-db-drizzle-sqlite`, etc.), v1 uses a single `@flaming-codes/sveltekit-runelayer` package with internal module boundaries. This follows the second-use rule: the Postgres adapter that would motivate extraction does not exist yet. Internal modules (`src/db/`, `src/auth/`, etc.) maintain clean boundaries that enable future extraction.

### SQLite-First with WAL Mode

SQLite with WAL (Write-Ahead Logging) mode provides:

- Single-file deployment (no database server)
- Concurrent reads during writes
- Crash-safe durability
- Better-sqlite3 gives synchronous access (no async overhead in Node)

### Push-Based Migrations

Instead of generating migration SQL files, Runekit uses push-based migration:

- On startup, `pushSchema()` compares the schema definition against the existing database
- Missing tables are created with `CREATE TABLE`
- Missing columns are added with `ALTER TABLE ADD COLUMN`
- Columns are never removed automatically (to prevent data loss)

This is appropriate for development and single-developer CMS use cases. Production deployments with data migration requirements should use explicit migration tooling.

### Header-Based User Context

The auth system injects user identity into request headers rather than using a shared context object. This means:

- Access control functions receive a standard `Request` object
- No dependency on SvelteKit's `event.locals` in the core library
- Access functions are testable with plain `new Request()` objects
- Headers are stripped and re-injected on every request to prevent spoofing

## Technology Stack

| Concern         | Library        | Why                                                    |
| --------------- | -------------- | ------------------------------------------------------ |
| Database ORM    | Drizzle ORM    | Type-safe, lightweight, SQLite-first support           |
| SQLite Driver   | better-sqlite3 | Synchronous, fast, stable, WAL support                 |
| Authentication  | Better Auth    | SvelteKit-native, Drizzle adapter, email/password      |
| UI Framework    | Svelte 5       | Runes-based reactivity, SvelteKit integration          |
| Build Tool      | vite-plus      | Unified Vite + Vitest + Oxlint monorepo toolchain      |
| Package Manager | pnpm 10        | Workspace support, catalog-based dependency management |

## Entry Points

The package exposes two entry points:

- `@flaming-codes/sveltekit-runelayer` — main API: config, plugin, schema builders, auth, storage, DB, hooks, query
- `@flaming-codes/sveltekit-runelayer/admin` — Svelte components and route handlers for the admin UI

This separation allows tree-shaking: apps that only use the data API do not bundle admin UI code.
