# Demo Application

The demo app in `apps/demo/` showcases the high-level SvelteKit integration API.

## Stack

- SvelteKit 2 + Svelte 5
- Carbon Components Svelte
- `@flaming-codes/sveltekit-runelayer` (workspace)
- vite-plus tooling

## Server layout

```
src/lib/server/
├── schema.ts
├── drizzle-schema.ts
├── runelayer.ts
├── seed.ts
└── query-helpers.ts
```

`runelayer.ts` creates the app integration via `createRunelayerApp`.

## Route isolation model

The demo uses route groups to air-gap admin from the public site:

- `src/routes/(site)` → public frontend layouts/pages
- `src/routes/(admin)/admin/[...path]` → CMS admin mount

Admin is mounted with one catch-all route that re-exports:

- `app.admin.load`
- `app.admin.actions`
- `app.admin.Page`

## Query model in demo pages

Site routes call `query(request).find(...)`, which delegates to `app.withRequest(request)`.

Seeding uses `app.system` for explicit server-context writes.

## Migration model in demo

- schema is exported for drizzle-kit
- `drizzle.config.ts` uses `defineRunelayerDrizzleConfig`
- migrations are applied before runtime startup
- runtime does not mutate schema

## Running

```bash
pnpm dev
pnpm build
```

Demo DB file path is `apps/demo/data/demo.db`.
