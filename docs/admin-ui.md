# Admin UI

The recommended integration path uses the split entry points: `@flaming-codes/sveltekit-runelayer/sveltekit/server` for server-side runtime and `@flaming-codes/sveltekit-runelayer/sveltekit/components` for client-safe Svelte components.

## Mounting model

Use one catch-all admin route:

- `src/routes/(admin)/admin/[...path]/+page.server.ts`
- `src/routes/(admin)/admin/[...path]/+page.svelte`

```ts
import { getRunelayerApp } from "$lib/server/runelayer.js";

const app = getRunelayerApp();

export const load = app.admin.load;
export const actions = app.admin.actions;
```

```svelte
<script lang="ts">
  import { AdminPage } from "@flaming-codes/sveltekit-runelayer/sveltekit/components";
  let { data, form } = $props();
</script>

<AdminPage {data} {form} />
```

Add a thin route-group layout to load Carbon styles for admin pages:

```svelte
<!-- src/routes/(admin)/+layout.svelte -->
<script lang="ts">
  import "carbon-components-svelte/css/all.css";
  let { children } = $props();
</script>

{@render children()}
```

Add a thin admin error route so package-owned error UI is used:

```svelte
<!-- src/routes/(admin)/admin/[...path]/+error.svelte -->
<script lang="ts">
  import { AdminErrorPage } from "@flaming-codes/sveltekit-runelayer/sveltekit/components";
  let { status, error } = $props();
</script>

<AdminErrorPage {status} {error} />
```

## Admin route contract

Supported views under the admin mount:

- `/admin` → dashboard
- `/admin/login` → login form
- `/admin/create-first-user` → first admin setup form (only when no admin user exists)
- `/admin/users` → auth user list
- `/admin/users/create` → auth user create form
- `/admin/users/:id` → auth user edit form
- `/admin/collections/:slug` → collection list
- `/admin/collections/:slug/create` → collection create form
- `/admin/collections/:slug/:id` → collection edit form
- `/admin/globals/:slug` → global singleton edit form

`app.admin.load` returns `RunelayerAdminPageData`, a discriminated union keyed by `view`.
Each `view` variant carries only the data needed by that page (for example, `users-list` includes pagination/search fields, while `collection-edit` includes `collection` and `document`).
`AdminPage` uses the same union type, so loader output and UI rendering stay in one typed contract.

Supported actions:

- `?/login`
- `?/createFirstUser` (first admin setup)
- `?/create` (collection create)
- `?/update` (collection update and global update)
- `?/delete` (collection delete)
- `?/createUser` (auth user create)
- `?/updateUser` (auth user update + optional password reset)
- `?/deleteUser` (auth user delete)
- `POST /admin/logout` (default action)

## Access and globals behavior

- if no admin user exists yet, requests redirect to `/admin/create-first-user`
- unauthenticated requests redirect to `/admin/login`
- authenticated non-admin users receive `403`
- admin users can access all admin routes/actions

Global editing is runtime-managed in admin scope:

- persisted per global `slug`
- `read` and `update` access are enforced
- `beforeChange` and `afterChange` hooks run on update
- unknown global slugs return `404`

User management is runtime-managed via Better Auth admin endpoints:

- list and filter users in `/admin/users`
- create users with role + password in `/admin/users/create`
- edit identity and role in `/admin/users/:id`
- rotate password from the user editor
- prevent deleting your own account and prevent removing the final admin account

## Layout hierarchy

All admin pages follow a consistent layout pattern:

1. **Page header** — full-width band with `--cds-ui-background` background and `--cds-border-subtle` bottom border. Contains breadcrumb navigation, an uppercase eyebrow label, the page title (h1), and optional action button or status tag aligned right.
2. **Page body** — max-width `90rem`, centered, with `--cds-spacing-06` horizontal padding. Contains the page-specific content (data tables, editor forms, cards).

Edit pages (CollectionEdit, UserEdit, GlobalEdit) use a two-column Grid inside the page body: 11-column content tile + 5-column sidebar tile with metadata and actions.

List pages (UsersList, CollectionList) render search/filter controls above a Carbon DataTable with toolbar integration.

The Dashboard page uses a taller header variant and card grid sections for collections and globals.

All spacing uses Carbon spacing tokens (`--cds-spacing-02` through `--cds-spacing-09`). No hardcoded pixel or rem values outside the Carbon scale.

Shared page-layout CSS (`.rk-page-header`, `.rk-page-header-inner`, `.rk-page-title-row`, `.rk-eyebrow`, `.rk-page-body`, and the 672px responsive breakpoint) lives in `page-layout.css` and is imported by all page components via `@import "./page-layout.css"`. Shared editor styles (`.rk-form`, `.rk-fields`, `.rk-sidebar-title`, `.rk-meta-list`, `.rk-actions`) live in `editor-layout.css` and are imported by CollectionEdit and UserEdit.

Every page includes breadcrumb navigation back to the Dashboard.

## Accessibility

- Carbon `Button` is used for all interactive buttons, including the ErrorPage navigation. No hand-rolled button elements.
- The user panel dropdown in AdminLayout uses `role="menu"` on its container and `role="menuitem"` on interactive items for screen reader support.
- DataTable action links include descriptive `aria-label` attributes (e.g., `aria-label="Open {name}"`) so screen readers can distinguish between rows.
- Delete confirmation dialogs use Carbon `Modal` (danger variant) instead of `window.confirm()` for consistent theming, keyboard navigation, and screen reader announcements.
- Pagination uses SvelteKit `goto()` for client-side navigation instead of `window.location.assign()`, preserving client state and avoiding full page reloads.
- `$effect` blocks that sync state from document props guard against unnecessary resets by comparing the document ID before overwriting values, preventing loss of unsaved edits.

## UI configuration

Package-owned admin pages render with Carbon-first primitives:

- `AdminShell` uses Carbon UIShell header, menu, side nav, and content regions
- dashboard, collection list, and editor pages use Carbon grid, data table, pagination, and form controls

`createRunelayerApp` accepts package-owned admin UI config:

```ts
admin: {
  path: "/admin",
  ui: {
    appName: "Runelayer",
    productName: "CMS",
    footerText: "Powered by Runelayer",
  },
}
```

Package-owned admin pages render inside a fixed Carbon `g10` theme boundary. UI config customizes labels and footer copy, but not the theme itself.

## `@flaming-codes/sveltekit-runelayer/admin` exports (breaking)

The admin subpath now exposes Carbon-structured primitives:

- `AdminShell`
- `AdminDashboardPage`
- `AdminLoginPage`
- `AdminCollectionListPage`
- `AdminCollectionEditorPage`
- `AdminGlobalEditorPage`
- `AdminUsersListPage`
- `AdminUserEditorPage`
- `AdminProfilePage`
- `AdminHealthPage`
- `AdminErrorPage`
- `AdminFieldRenderer`

Direct handler-factory and route-helper wiring is no longer the primary integration model.
