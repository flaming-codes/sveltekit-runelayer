# Architecture

`sveltekit-runelayer` is a CMS-as-a-package for SvelteKit apps. It runs inside the host application's process and exposes schema-driven data APIs, auth integration, file storage, and admin UI primitives.

## Design Principles

- **Single source of truth**: collection definitions drive database tables, query behavior, and admin rendering.
- **Thin adapters**: Drizzle, libsql, Better Auth, and filesystem APIs are wrapped with minimal custom code.
- **Second-use rule**: extract modules/packages only after a second concrete use case exists.
- **Small API surface**: defaults are explicit and runtime responsibilities are clear.

## Module Graph

```
                    ┌──────────┐
                    │  config  │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │  plugin  │  (createRunelayer)
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
                  │  admin   │
                  └──────────┘
```

All runtime modules depend on schema types; schema does not depend on runtime modules.

## Package Layout

```
packages/sveltekit-runelayer/src/
├── index.ts          # Public API
├── config.ts         # RunelayerConfig + defineConfig()
├── plugin.ts         # createRunelayer() composition root
├── schema/           # Collection/global/field definitions
├── db/               # Drizzle + libsql integration, schema generation, CRUD
├── auth/             # Better Auth integration and access helpers
├── storage/          # Local filesystem adapter
├── hooks/            # Lifecycle hook runner
├── query/            # Access-controlled CRUD orchestration
├── admin/            # Admin Svelte components
└── sveltekit/        # High-level app integration surface
```

## Runtime Flow

### Initialization (`createRunelayer`)

1. Create libsql client + Drizzle DB instance
2. Generate table metadata from collection config
3. Initialize Better Auth with Drizzle adapter (`provider: "sqlite"`)
4. Initialize storage adapter
5. Return `RunelayerInstance` with SvelteKit `handle`

Migration application is intentionally external to runtime initialization.

### Request handling

For each request, `handle`:

1. Removes inbound `x-user-*` headers (anti-spoofing)
2. Resolves Better Auth session
3. Injects verified user headers
4. Attaches user/session to `event.locals`
5. Routes auth endpoints to Better Auth handler
6. Delegates non-auth routes to SvelteKit

### Query operations

Each query operation (`find`, `findOne`, `create`, `update`, `remove`) executes:

1. Access check
2. Before hooks
3. Async DB operation
4. After hooks (error-isolated)
5. Return document(s)

## Key Decisions

### Single package + high-level subpath

The project ships as `@flaming-codes/sveltekit-runelayer` with internal boundaries (`db`, `auth`, `query`, etc.) and a high-level SvelteKit integration subpath: `@flaming-codes/sveltekit-runelayer/sveltekit`.

The `sveltekit` subpath provides:

- `createRunelayerApp()` for package-owned integration wiring
- `defineRunelayerDrizzleConfig()` for host drizzle-kit setup
- single admin catch-all runtime (`load`, `actions`, `Page`)

### libsql-first SQLite compatibility

libsql supports local file SQLite URLs and Turso remote URLs with one API:

- local: `file:./data/sveltekit-runelayer.db`
- Turso: `libsql://<db>.turso.io` + auth token

### Host-managed migrations

`sveltekit-runelayer` does not push schema at runtime. Host applications generate/apply migrations with drizzle-kit before startup using exported schema helpers.

### Header-based identity context

Access control receives only `Request` data with verified auth headers, avoiding direct SvelteKit runtime coupling and improving testability.

## Technology Stack

| Concern         | Library        | Why                                             |
| --------------- | -------------- | ----------------------------------------------- |
| ORM             | Drizzle ORM    | Type-safe SQL and sqlite/libsql support         |
| DB client       | @libsql/client | Local SQLite URLs + Turso support in one client |
| Auth            | Better Auth    | SvelteKit integration + Drizzle adapter         |
| UI              | Svelte 5       | Modern component model with runes               |
| Build/Test/Lint | vite-plus      | Unified monorepo workflow                       |
| Package manager | pnpm 10        | Workspace and catalog dependency management     |

## Entry Points

- `@flaming-codes/sveltekit-runelayer`
- `@flaming-codes/sveltekit-runelayer/admin`
- `@flaming-codes/sveltekit-runelayer/sveltekit`

This split keeps low-level APIs, admin components, and high-level host integration independently consumable.
