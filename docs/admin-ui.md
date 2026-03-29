# Admin UI

The recommended integration path is package-owned admin runtime from `@flaming-codes/sveltekit-runelayer/sveltekit`.

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
  import { AdminPage } from "@flaming-codes/sveltekit-runelayer/sveltekit";
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
  import { AdminErrorPage } from "@flaming-codes/sveltekit-runelayer/sveltekit";
  let { status, error } = $props();
</script>

<AdminErrorPage {status} {error} />
```

## Admin route contract

Supported views under the admin mount:

- `/admin` → dashboard
- `/admin/login` → login form
- `/admin/collections/:slug` → collection list
- `/admin/collections/:slug/create` → collection create form
- `/admin/collections/:slug/:id` → collection edit form
- `/admin/globals/:slug` → global singleton edit form

Supported actions:

- `?/login`
- `?/create` (collection create)
- `?/update` (collection update and global update)
- `?/delete` (collection delete)
- `POST /admin/logout` (default action)

## Access and globals behavior

`admin.strictAccess` defaults to `true`.

When enabled:

- unauthenticated requests redirect to `/admin/login`
- authenticated non-admin users receive `403`
- admin users can access all admin routes/actions

When disabled, admin runtime uses system-context requests for admin data operations (useful for local/demo wiring).

Global editing is runtime-managed in admin scope:

- persisted per global `slug`
- `read` and `update` access are enforced
- `beforeChange` and `afterChange` hooks run on update
- unknown global slugs return `404`

## UI configuration

`createRunelayerApp` accepts package-owned admin UI config:

```ts
admin: {
  path: "/admin",
  strictAccess: true,
  ui: {
    theme: "g100", // "white" | "g10" | "g80" | "g90" | "g100"
    appName: "Runelayer",
    productName: "CMS",
    footerText: "Powered by Runelayer",
  },
}
```

## `@flaming-codes/sveltekit-runelayer/admin` exports (breaking)

The admin subpath now exposes Carbon-structured primitives:

- `AdminShell`
- `AdminDashboardPage`
- `AdminLoginPage`
- `AdminCollectionListPage`
- `AdminCollectionEditorPage`
- `AdminGlobalEditorPage`
- `AdminErrorPage`
- `AdminFieldRenderer`

Direct handler-factory and route-helper wiring is no longer the primary integration model.
