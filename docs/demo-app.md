# Demo Application

The demo app at `apps/demo/` is a full-featured SvelteKit application that showcases every Runekit CMS capability with a Carbon Design System frontend.

## Tech Stack

- **Framework**: SvelteKit 2 with Svelte 5 runes
- **UI**: Carbon Components Svelte (`^0.105.0`) + Carbon Icons Svelte (`^13.10.0`)
- **CMS**: `@flaming-codes/sveltekit-runelayer` (workspace dependency)
- **Build**: vite-plus (`vp`)

## Architecture

### Server-Side

```
src/lib/server/
├── schema.ts          # All collection definitions (6 content + 2 singleton)
├── runekit.ts         # Lazy CMS initialization via getRunekit()
├── seed.ts            # Auto-seeds demo data on first request
└── query-helpers.ts   # Shared QueryContext factory + JSON parser
```

### Route Structure

```
src/routes/
├── +layout.svelte          # Carbon UIShell (Header, SideNav, Content)
├── +layout.server.ts       # Loads site settings + navigation
├── +page.svelte            # Home: hero, featured posts, stats
├── blog/
│   ├── +page.svelte        # DataTable listing with search, pagination
│   └── [slug]/+page.svelte # Post detail with author card, breadcrumbs
├── categories/
│   ├── +page.svelte        # Category tiles with post counts
│   └── [slug]/+page.svelte # Filtered posts by category
├── authors/
│   ├── +page.svelte        # Author cards with bios
│   └── [slug]/+page.svelte # Author profile with their posts
├── products/
│   ├── +page.svelte        # Product cards with pricing
│   └── [slug]/+page.svelte # Tabs: description, specs, features
├── gallery/+page.svelte    # Image grid with modal lightbox
├── pages/[slug]/+page.svelte # Dynamic CMS pages (structural fields)
├── about/+page.svelte      # Site info from settings global
└── api/auth/[...all]/      # Better Auth API endpoint
```

## Collections

### Content Collections

| Collection     | Field Types Showcased                                                                     | Access Control                                             |
| -------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Posts**      | text, slug, textarea, richText, relationship, select, date, checkbox, number, json, group | public read, logged-in create, editor update, admin delete |
| **Authors**    | text, slug, email, textarea, select, checkbox, array (social links)                       | public read, logged-in create, editor update, admin delete |
| **Categories** | text, slug, textarea, number, checkbox                                                    | public read                                                |
| **Media**      | text, textarea, multiSelect                                                               | public read                                                |
| **Pages**      | text, slug, select, group, array, collapsible, row, email                                 | public read                                                |
| **Products**   | text, slug, number, richText, multiSelect, json, relationship, checkbox                   | public read                                                |

### Singleton Collections (Global Pattern)

Native `defineGlobal` does not yet generate database tables. The demo uses regular collections with a singleton access pattern: one document per collection, fetched with `find(ctx, { limit: 1 })`.

| Singleton        | Purpose                                      |
| ---------------- | -------------------------------------------- |
| **SiteSettings** | Site name, tagline, description, footer text |
| **Navigation**   | Menu items as JSON array                     |

## CMS Features Demonstrated

- **All 16 field types** distributed across collections
- **Lifecycle hooks**: Auto-slug generation from title, auto-readTime calculation from content (Posts)
- **Access control**: `isAdmin()`, `isLoggedIn()`, `hasRole("editor")`, public `() => true`
- **Query API**: `find()` with pagination, `findOne()`, `create()` for seeding
- **Relationships**: Posts → Authors, Posts → Categories, Products → Categories, Products → Media
- **Structural fields**: Group (SEO, hero), Array (social links, sections), Row (contact), Collapsible (sidebar)
- **Auto-seeding**: 10 posts, 3 authors, 5 categories, 4 media, 3 products, 2 pages, site settings, navigation

## Vite Configuration

The demo requires a Vite alias to fix a zod v4 compatibility issue with better-auth:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: { zod: "zod/v4" },
  },
});
```

See [Integration Decisions](integration-decisions.md) for details on the zod v4 issue.

## Lazy Initialization

The CMS instance is lazily initialized via `getRunekit()` to avoid running database/auth setup during SvelteKit's build-time analysis phase. The hooks.server.ts handle function calls `getRunekit()` on the first request, which triggers initialization and auto-seeding.

## Carbon Components Used

| Component                                     | Usage                                        |
| --------------------------------------------- | -------------------------------------------- |
| Header, SideNav, Content, SkipToContent       | Root app shell layout                        |
| DataTable, Toolbar, ToolbarSearch, Pagination | Blog listing                                 |
| Grid, Row, Column                             | Page layouts throughout                      |
| Tile, ClickableTile                           | Cards for posts, categories, products, stats |
| Tag                                           | Status indicators, categories, features      |
| Breadcrumb, BreadcrumbItem                    | Navigation hierarchy                         |
| Tabs, Tab, TabContent                         | Product detail views                         |
| Modal                                         | Gallery lightbox                             |
| Button, ButtonSet                             | CTAs and actions                             |
| StructuredList                                | Product specifications                       |
| UnorderedList, ListItem                       | Feature lists                                |

## Running

```bash
pnpm dev        # Start dev server (auto-seeds on first request)
pnpm build      # Production build
```

The SQLite database is created at `apps/demo/data/demo.db` (gitignored). Delete it to re-seed.
