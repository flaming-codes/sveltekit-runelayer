# Integration Decisions

Validated library decisions for `sveltekit-runelayer`.

## App consumption model

- primary host integration paths: `@flaming-codes/sveltekit-runelayer/sveltekit/server` (server-only) and `@flaming-codes/sveltekit-runelayer/sveltekit/components` (client-safe)
- single admin catch-all mount (`/admin/[...path]`) with package-owned `load/actions` plus `AdminRoutePage`
- default admin access policy: authenticated admin-only
- host query consumption: `withRequest(request)` for route-bound operations, `system` for jobs/seeding

## Core stack

### Drizzle ORM + libsql client

- **Status**: stable for SvelteKit server runtimes
- **Versions**: `drizzle-orm@^0.45.2`, `@libsql/client@^0.17.2`, `drizzle-kit@^0.31.10`
- **Rationale**:
  - one client for local SQLite (`file:` URLs) and Turso (`libsql://`)
  - async API that works across local and remote deployments
  - straightforward integration with Drizzle's `libsql` driver
- **Operational model**: migrations are generated/applied by drizzle-kit before startup

### Better Auth

- **Status**: first-class SvelteKit support with Drizzle adapter (`provider: "sqlite"`)
- **Version**: `better-auth@^1.5.6`
- **Gotcha 1**: `BETTER_AUTH_SECRET` must be available at build time
- **Gotcha 2 (zod v4)**: map `zod` to `zod/v4` in Vite to avoid `.meta()` runtime/build mismatch

```ts
resolve: {
  alias: {
    zod: "zod/v4";
  }
}
```

## UI stack

### Carbon Components Svelte

- **Status**: works in compatibility mode with Svelte 5
- **Constraint**: do not force global `runes: true` in `svelte.config.js`

### TanStack Table

- `@tanstack/svelte-table` v8 is not Svelte 5 compatible
- use `@tanstack/table-core` with a local wrapper

### Superforms

- compatible in Svelte 5 compatibility mode
- still store-oriented internally

### Rich text

- prefer Tiptap core (custom wrapper) or Tipex (Svelte 5-focused wrapper)

### Uploads

- use Uppy 5.x if advanced upload flows are needed
- otherwise evaluate SvelteKit native streaming uploads first

## Install summary

```bash
# Core
pnpm add drizzle-orm @libsql/client better-auth
pnpm add -D drizzle-kit

# UI and extras (as needed)
pnpm add carbon-components-svelte carbon-icons-svelte
pnpm add @tanstack/table-core
pnpm add sveltekit-superforms zod
pnpm add @tiptap/core @tiptap/pm @tiptap/starter-kit # or tipex
pnpm add @uppy/core @uppy/dashboard @uppy/svelte @uppy/tus
```

## Compatibility matrix

| Library             | Svelte 5    | SvelteKit 2 | Notes                    |
| ------------------- | ----------- | ----------- | ------------------------ |
| Drizzle ORM         | N/A server  | Yes         | libsql driver in use     |
| @libsql/client      | N/A server  | Yes         | local SQLite and Turso   |
| Better Auth         | Yes         | Yes         | use `provider: "sqlite"` |
| Carbon Svelte       | Compat mode | Yes         | no global runes mode     |
| TanStack table-core | Yes         | Yes         | custom wrapper required  |
| Superforms          | Compat mode | Yes         | works, not rune-native   |
| Uppy 5.x            | Yes         | Yes         | use only if needed       |
| svelte-dnd-action   | Yes         | Yes         | stable                   |
