# Getting Started

`sveltekit-runelayer` ships a high-level SvelteKit integration surface split into server and client entry points:

- `@flaming-codes/sveltekit-runelayer/sveltekit/server` — server-only runtime (`createRunelayerApp`)
- `@flaming-codes/sveltekit-runelayer/sveltekit/drizzle` — drizzle-kit config helper (`defineRunelayerDrizzleConfig`)
- `@flaming-codes/sveltekit-runelayer/sveltekit/components` — client-safe Svelte components (`AdminPage`, `AdminErrorPage`)

Use these paths when integrating the CMS into an app.

## Prerequisites

- Node.js >= 22.18.0
- pnpm 10+
- SvelteKit 2 + Svelte 5

## Integration checklist

- Define collections/globals in TypeScript and export a drizzle-kit schema.
- Configure drizzle-kit with `defineRunelayerDrizzleConfig()`.
- Create one `createRunelayerApp()` instance and pass SvelteKit `redirect`, `error`, and `fail`.
- Wire `runelayer.handle` in `hooks.server.ts`.
- Mount admin load/actions in one catch-all route.
- Run migrations before startup.
- Decide whether uploaded files should be public (`storage.publicRead: true`) or auth-protected (default).

## Install

```bash
pnpm add @flaming-codes/sveltekit-runelayer
pnpm add -D drizzle-kit drizzle-orm
```

`drizzle-orm` must be a direct devDependency so drizzle-kit can resolve it (pnpm strict mode does not hoist transitive dependencies).

## 1. Add Vite alias required by Better Auth + zod v4

In the host app `vite.config.ts`, add:

```ts
resolve: {
  alias: {
    zod: "zod/v4",
  },
}
```

## 2. Define collections

```ts
// src/lib/server/schema.ts
import { defineCollection, text, slug, richText, select } from "@flaming-codes/sveltekit-runelayer";

export const Posts = defineCollection({
  slug: "posts",
  fields: [
    { name: "title", ...text({ required: true }) },
    { name: "slug", ...slug({ from: "title" }) },
    { name: "content", ...richText() },
    {
      name: "status",
      ...select({
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
        ],
        defaultValue: "draft",
      }),
    },
  ],
});
```

## 3. Export schema for drizzle-kit

drizzle-kit discovers Drizzle table instances from **top-level named exports** only.
You must destructure and re-export each table individually. Use `listTableNames()`
to see which table keys your collections/globals produce.

```ts
// src/lib/server/drizzle-schema.ts
import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer/drizzle";
import { Posts } from "./schema.js";

const _schema = createDrizzleKitSchema([Posts]);
export const { posts, user, session, account, verification } = _schema;
```

If you register globals, pass them as the second argument so migration files include
`__runelayer_globals` (and `__runelayer_global_versions` for versioned globals).

## 4. Use the drizzle helper config

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import { defineRunelayerDrizzleConfig } from "@flaming-codes/sveltekit-runelayer/sveltekit/drizzle";

export default defineConfig(
  defineRunelayerDrizzleConfig({
    schema: "./src/lib/server/drizzle-schema.ts",
    out: "./drizzle",
    database: {
      url: "file:./data/sveltekit-runelayer.db",
      // authToken: process.env.DATABASE_AUTH_TOKEN,
    },
  }),
);
```

Create the data directory and generate/apply migrations before startup:

```bash
mkdir -p data
npx drizzle-kit generate
npx drizzle-kit migrate
```

libsql can create the database file but not the parent directory.

## 5. Create the app integration instance

```ts
// src/lib/server/runelayer.ts
import { redirect, error, fail } from "@sveltejs/kit";
import { createRunelayerApp } from "@flaming-codes/sveltekit-runelayer/sveltekit/server";
import { Posts } from "./schema.js";

export const runelayer = createRunelayerApp({
  kit: { redirect, error, fail },
  collections: [Posts],
  auth: {
    secret: process.env.AUTH_SECRET ?? "dev-secret-change-in-production",
    baseURL: process.env.ORIGIN ?? "http://localhost:5173",
  },
  database: {
    url: process.env.DATABASE_URL ?? "file:./data/sveltekit-runelayer.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
  admin: {
    path: "/admin",
  },
});
```

## 6. Wire the global handle hook

```ts
// src/hooks.server.ts
import { runelayer } from "$lib/server/runelayer";

export const handle = runelayer.handle;
```

No extra auth route file is required for the default integration path.

## 7. Mount admin in one catch-all route

Create an isolated admin route group:

```ts
// src/routes/(admin)/admin/[...path]/+page.server.ts
import { runelayer } from "$lib/server/runelayer";

export const load = runelayer.admin.load;
export const actions = runelayer.admin.actions;
```

```svelte
<!-- src/routes/(admin)/admin/[...path]/+page.svelte -->
<script lang="ts">
  import { AdminPage } from "@flaming-codes/sveltekit-runelayer/sveltekit/components";
  let { data, form } = $props();
</script>

<AdminPage {data} {form} />
```

Keep the public site in a separate route group (for example, `src/routes/(site)`), so `/admin` does not inherit frontend layouts/data-loading.

First-time setup is automatic:

- if an admin user already exists, unauthenticated users are sent to `/admin/login`
- if no admin exists yet, users are sent to `/admin/create-first-user` to create the first admin account

Also add thin admin-only layout and error wiring:

```svelte
<!-- src/routes/(admin)/+layout.svelte -->
<script lang="ts">
  import "carbon-components-svelte/css/all.css";
  let { children } = $props();
</script>

{@render children()}
```

```svelte
<!-- src/routes/(admin)/admin/[...path]/+error.svelte -->
<script lang="ts">
  import { AdminErrorPage } from "@flaming-codes/sveltekit-runelayer/sveltekit/components";
  let { status, error } = $props();
</script>

<AdminErrorPage {status} {error} />
```

## 8. Query content with request-bound helpers

```ts
// src/routes/(site)/+page.server.ts
import { runelayer } from "$lib/server/runelayer";
import { Posts } from "$lib/server/schema";

export async function load({ request }) {
  const posts = await runelayer.withRequest(request).find(Posts, {
    limit: 10,
    sort: "createdAt",
    sortOrder: "desc",
  });

  return { posts };
}
```

Use contexts intentionally:

- `runelayer.withRequest(request)` for request-bound access checks.
- `runelayer.system` only for trusted server-side work such as seeds, internal jobs, or migrations.

For trusted internal jobs:

```ts
await runelayer.system.create(Posts, { title: "Seeded" });
```

## Next docs

- [Architecture](./architecture.md)
- [Database](./database.md)
- [Authentication](./auth.md)
- [Admin UI](./admin-ui.md)
- [Query API](./query-api.md)
