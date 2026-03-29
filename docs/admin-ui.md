# Admin UI

The admin UI provides a set of Svelte 5 components and SvelteKit handler factories for building a CMS admin panel. It is exported from `runekit/admin` and is route-isolated to prevent bloating the public site.

## Components

### AdminLayout

Shell layout with sidebar navigation and top bar.

```svelte
<script lang="ts">
  import { AdminLayout } from 'runekit/admin';
</script>

<AdminLayout
  collections={schema.collections}
  globals={schema.globals}
  user={{ email: 'admin@example.com' }}
  basePath="/admin"
>
  <slot />
</AdminLayout>
```

Props:
- `collections` — `CollectionConfig[]` for sidebar nav
- `globals` — `GlobalConfig[]` for sidebar nav
- `user` — current user (null = not logged in)
- `basePath` — admin route prefix (default: `/admin`)
- `children` — Svelte 5 snippet for the content area

### Dashboard

Overview with collection cards showing document counts.

```svelte
<Dashboard
  collections={[
    { slug: 'posts', label: 'Posts', count: 42 },
    { slug: 'users', label: 'Users', count: 5 },
  ]}
  basePath="/admin"
/>
```

### CollectionList

Sortable table with pagination for listing documents.

```svelte
<CollectionList
  collection={postsConfig}
  documents={docs}
  page={1}
  totalPages={5}
  basePath="/admin"
/>
```

Features:
- Columns from `collection.admin.defaultColumns` (or first 3 fields)
- Client-side column sorting (click column headers)
- Pagination controls (Prev/Next)
- "Create New" button
- Edit links per row

### CollectionEdit

Form for creating and editing documents.

```svelte
<CollectionEdit
  collection={postsConfig}
  document={existingDoc}  {/* null for create */}
  basePath="/admin"
/>
```

Features:
- Renders fields via FieldRenderer based on field type
- Hidden `id` field for updates
- Save/Create button
- Delete button (for existing documents)
- Cancel link back to list view
- Uses native form actions (`?/create`, `?/update`, `?/delete`)

### Login

Email/password login form.

```svelte
<Login action="?/login" error={form?.error} />
```

### FieldRenderer

Dispatches to the correct field component based on field type:

```svelte
<FieldRenderer field={namedField} bind:values={formValues} />
```

## Field Components

Each field type has a corresponding Svelte component in `src/admin/components/fields/`:

| Component | Field Types | Input Type |
|-----------|------------|------------|
| `TextField` | text, email, slug | `<input type="text">` |
| `NumberField` | number | `<input type="number">` |
| `CheckboxField` | checkbox | `<input type="checkbox">` |
| `SelectField` | select | `<select>` |
| `TextareaField` | textarea | `<textarea>` |
| `DateField` | date | `<input type="date">` or `datetime-local` |
| `RichTextField` | richText | `<textarea>` (Tiptap placeholder) |
| `JsonField` | json | `<textarea>` with JSON |
| `RelationshipField` | relationship | `<input type="text">` (search placeholder) |

All field components use Svelte 5 runes (`$props()`, `$bindable`).

## Server Handlers

Handler factories create SvelteKit-compatible load functions and actions:

```ts
import {
  handleCollectionList,
  handleCollectionGet,
  handleCollectionCreate,
  handleCollectionUpdate,
  handleCollectionDelete,
} from 'runekit/admin';
```

### QueryAdapter Interface

Handlers require a `QueryAdapter` that bridges to the database:

```ts
interface QueryAdapter {
  find(collection: string, opts: {
    page?: number;
    limit?: number;
    sort?: string;
    where?: Record<string, unknown>;
  }): Promise<{ docs: Record<string, unknown>[]; totalDocs: number; totalPages: number; page: number }>;

  findById(collection: string, id: string): Promise<Record<string, unknown> | null>;
  create(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(collection: string, id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteDoc(collection: string, id: string): Promise<void>;
  count(collection: string): Promise<number>;
}
```

### Usage in SvelteKit Routes

```ts
// src/routes/admin/collections/[slug]/+page.server.ts
import { handleCollectionList } from 'runekit/admin';

export const load = handleCollectionList(postsCollection, queryAdapter);
```

```ts
// src/routes/admin/collections/[slug]/[id]/+page.server.ts
import { handleCollectionGet, handleCollectionUpdate, handleCollectionDelete } from 'runekit/admin';

export const load = handleCollectionGet(postsCollection, queryAdapter);

export const actions = {
  update: handleCollectionUpdate(postsCollection, queryAdapter),
  delete: handleCollectionDelete(postsCollection, queryAdapter),
};
```

## Route Helper

The `getAdminRoutes` helper tells the host app what components and routes the admin UI needs:

```ts
import { getAdminRoutes } from 'runekit/admin';

const routes = getAdminRoutes({
  collections: [Posts, Users, Media],
  globals: [SiteSettings],
});

// routes.layout     -> AdminLayout component
// routes.dashboard  -> Dashboard component
// routes.login      -> Login component
// routes.collections -> [{ slug, list: CollectionList, edit: CollectionEdit }, ...]
```

## Styling

The admin UI uses minimal inline CSS with `.rk-` prefixed class names. No external CSS framework is required. The components are functional but intentionally minimal — they are designed to be restyled or replaced with a component library (e.g., Carbon Svelte) in a future iteration.

## Svelte 5 Patterns Used

- `$props()` with destructuring for component props
- `$state()` for local reactive state
- `$derived` and `$derived.by()` for computed values
- `$bindable` for two-way binding on field values
- `{@render children()}` for Svelte 5 snippets (replaces slots)
- No stores — all state is runes-based
