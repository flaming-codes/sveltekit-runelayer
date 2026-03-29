# Demo Application

The demo app in `apps/demo/` showcases `@flaming-codes/sveltekit-runelayer` inside a full SvelteKit site.

## Stack

- SvelteKit 2 + Svelte 5
- Carbon Components Svelte
- `@flaming-codes/sveltekit-runelayer` (workspace)
- vite-plus tooling

## Server layout

```
src/lib/server/
├── schema.ts
├── runekit.ts
├── seed.ts
└── query-helpers.ts
```

`runekit.ts` uses:

- `database.url` (`file:./data/demo.db`)
- optional `database.authToken`
- Better Auth config (`secret`, `baseURL`)

## Routes

Demo routes cover blog, categories, authors, products, gallery, pages, and Better Auth API endpoints.

## Features demonstrated

- schema-driven collections
- lifecycle hooks
- role-based access helpers
- query API pagination/sorting
- local media storage
- seeded demo content

## Migration model in demo

The demo follows the same migration contract as the package:

- schema is exported for drizzle-kit
- migrations are applied before runtime startup
- `createRunekit()` does not mutate schema

## Running

```bash
pnpm dev
pnpm build
```

Demo DB file path is `apps/demo/data/demo.db`.
