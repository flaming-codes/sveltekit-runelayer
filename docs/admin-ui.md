# Admin UI

The recommended integration path is package-owned admin runtime from `@flaming-codes/sveltekit-runelayer/sveltekit`.

## Mounting model

Use one catch-all admin route:

- `src/routes/(admin)/admin/[...path]/+page.server.ts`
- `src/routes/(admin)/admin/[...path]/+page.svelte`

```ts
import { runelayer } from "$lib/server/runelayer";

export const load = runelayer.admin.load;
export const actions = runelayer.admin.actions;
```

```svelte
<script lang="ts">
  import { runelayer } from "$lib/server/runelayer";
  const Page = runelayer.admin.Page;
  let { data, form } = $props();
</script>

<Page {data} {form} />
```

All route parsing, CRUD dispatch, and payload serialization are handled by the package.

## Admin route contract

Supported views under the admin mount:

- `/admin` → dashboard
- `/admin/login` → login form
- `/admin/collections/:slug` → collection list
- `/admin/collections/:slug/create` → create form
- `/admin/collections/:slug/:id` → edit form

Supported actions:

- `?/login`
- `?/create`
- `?/update`
- `?/delete`
- `POST /admin/logout` (default action)

## Access policy

`admin.strictAccess` defaults to `true`.

When enabled:

- unauthenticated requests redirect to `/admin/login`
- authenticated non-admin users receive `403`
- admin users can access all admin routes/actions

Set `admin.strictAccess: false` only for explicit non-authenticated integration scenarios (for example, local demo setups).

## Components

The `@flaming-codes/sveltekit-runelayer/admin` export still exposes presentational components:

- `AdminLayout`
- `Dashboard`
- `Login`
- `CollectionList`
- `CollectionEdit`
- `FieldRenderer`

Direct handler-factory and route-helper wiring is no longer the primary integration model.
