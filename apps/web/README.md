# Web Test App

Minimal SvelteKit app for testing the Runelayer CMS package with a block-based page schema.

## Setup

From the monorepo root:

```bash
pnpm install
```

Create a `.env` file in `apps/web/` with the required environment variables:

```env
AUTH_SECRET=<at-least-32-char-secret>
ORIGIN=http://localhost:5173
DATABASE_URL=file:./data/web.db
```

All three are required. The app will fail on startup with a clear error if any are missing.

Create the data directory and generate/apply database migrations:

```bash
cd apps/web
mkdir -p data
pnpm db:generate
pnpm db:migrate
```

This creates the SQLite database and sets up all required tables.

## Development

From the monorepo root:

```bash
pnpm dev:web
```

Visit `/admin` to manage content.

## Schema

The app defines a single `Pages` collection with a block-based content model. Each page has a title, slug, description, published flag, and an array of blocks. Block types: Hero, Rich Text, Call to Action, Image.

See `src/lib/server/schema.ts` for the full definition.

## Drizzle Schema Export

drizzle-kit only discovers Drizzle table instances from top-level named exports. The `drizzle-schema.ts` file destructures and re-exports each table individually:

```ts
const _schema = createDrizzleKitSchema(allCollections);
export const { pages, pages_blocks, user, session, account, verification } = _schema;
```

If you add collections, update the destructured export list to include any new table names. Use `listTableNames(collections)` from `@flaming-codes/sveltekit-runelayer/drizzle` to see the full list.
