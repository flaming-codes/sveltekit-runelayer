# Getting Started

`sveltekit-runelayer` ships a high-level SvelteKit integration surface split into server and client entry points:

- `@flaming-codes/sveltekit-runelayer/sveltekit/server` — server-only runtime (`createRunelayerApp`, `defineRunelayerDrizzleConfig`)
- `@flaming-codes/sveltekit-runelayer/sveltekit/components` — client-safe Svelte components (`AdminPage`, `AdminErrorPage`)

Use these paths when integrating the CMS into an app.

## Prerequisites

- Node.js >= 22.18.0
- pnpm 10+
- SvelteKit 2 + Svelte 5

## Install

```bash
pnpm add @flaming-codes/sveltekit-runelayer
pnpm add -D drizzle-kit
```

## 1. Define collections

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

## 2. Export schema for drizzle-kit

```ts
// src/lib/server/drizzle-schema.ts
import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer";
import { Posts } from "./schema.js";

export const runelayerSchema = createDrizzleKitSchema([Posts]);
```

## 3. Use the drizzle helper config

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import { defineRunelayerDrizzleConfig } from "@flaming-codes/sveltekit-runelayer/sveltekit/server";

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

Generate and apply migrations before startup.

## 4. Create the app integration instance

```ts
// src/lib/server/runelayer.ts
import { createRunelayerApp } from "@flaming-codes/sveltekit-runelayer/sveltekit/server";
import { Posts } from "./schema.js";

export const runelayer = createRunelayerApp({
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
    // strictAccess: true (default)
  },
});
```

## 5. Wire the global handle hook

```ts
// src/hooks.server.ts
import { runelayer } from "$lib/server/runelayer";

export const handle = runelayer.handle;
```

No extra auth route file is required for the default integration path.

## 6. Mount admin in one catch-all route

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

## 7. Query content with request-bound helpers

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

For seeding/background jobs, use the explicit server context:

```ts
await runelayer.system.create(Posts, { title: "Seeded" });
```

## Next docs

- [Architecture](./architecture.md)
- [Database](./database.md)
- [Authentication](./auth.md)
- [Admin UI](./admin-ui.md)
- [Query API](./query-api.md)
