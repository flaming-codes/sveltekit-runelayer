# Runelayer Marketing Site Example

`apps/web` is the example SvelteKit marketing site for Runelayer. It keeps the public site and the package-owned admin on the same content model so the example proves the package's core promise: schema, authoring, and rendering stay aligned.

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

All three are required. The app fails on startup if any are missing.

Create the data directory and generate/apply database migrations:

```bash
cd apps/web
mkdir -p data
pnpm db:generate
pnpm db:migrate
```

This creates the SQLite database and sets up all required tables.

On first request after migrations are applied, the app seeds the example marketing content into Runelayer when the site content is missing.

## Development

From the monorepo root:

```bash
pnpm dev:web
```

Visit `/admin` to manage content. The public site routes (`/`, `/platform`, `/pricing`, `/docs`, `/changelog`) render the seeded content model.

## Content model

The site uses these collections:

- `site_chrome` — versioned singleton-style collection for header, footer, announcement, and site metadata
- `pages` — versioned marketing pages rendered by block-based sections

The `pages.layout` block inventory includes hero, editorial, feature grid, proof band, pricing teaser, resource cards, FAQ panel, release strip, and CTA band sections. Repeated section content such as feature lists, pricing plans, FAQ items, and changelog entries is stored inline in those blocks as JSON-backed payloads so the public site and the authoring model stay in one place.

See `src/lib/server/schema.ts` for the full definition.

## Drizzle Schema Export

drizzle-kit only discovers Drizzle table instances from top-level named exports. The `drizzle-schema.ts` file destructures and re-exports each table individually:

```ts
const _schema = createDrizzleKitSchema(allCollections);
export const {
  site_chrome,
  site_chrome_versions,
  pages,
  pages_versions,
  user,
  session,
  account,
  verification,
} = _schema;
```

If you add collections, update the destructured export list to include any new table names. Use `listTableNames(collections)` from `@flaming-codes/sveltekit-runelayer/drizzle` to inspect the generated table keys.
