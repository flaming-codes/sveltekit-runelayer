# SvelteKit RuneLayer

[![npm version](https://img.shields.io/npm/v/%40flaming-codes%2Fsveltekit-runelayer)](https://www.npmjs.com/package/@flaming-codes/sveltekit-runelayer)
[![npm license](https://img.shields.io/npm/l/%40flaming-codes%2Fsveltekit-runelayer)](./LICENSE)
[![Node >=22.18](https://img.shields.io/badge/node-%3E%3D22.18.0-339933)](./.nvmrc)

SvelteKit RuneLayer is a CMS-as-a-package for SvelteKit apps. It runs inside your existing Node process with schema-driven content, auth, query APIs, hooks, and an admin UI.

## Project status

RuneLayer is shipping as `0.x` (alpha/beta maturity). The APIs are usable and tested, but you should expect iterative changes while the platform hardens toward a v1 line.

## What you get

- SvelteKit-native integration: `handle`, admin loaders/actions, request-scoped query helpers
- Schema as a single source of truth for collections, globals, and generated DB shape
- Better Auth integration with role checks and deny-by-default access behavior
- libsql + Drizzle ORM persistence with host-managed drizzle-kit migrations
- Local filesystem storage adapter with path traversal checks
- Svelte admin UI built with Svelte 5 runes and Carbon components

## Prerequisites

- Node.js `>= 22.18.0` (repo pinned via [`.nvmrc`](./.nvmrc))
- pnpm `10+`
- SvelteKit `2.x`
- Svelte `5.x`

## Install

```bash
pnpm add @flaming-codes/sveltekit-runelayer
pnpm add -D drizzle-kit
```

## Quick start

### 1. Define collections

```ts
// src/lib/server/schema.ts
import { defineCollection, text, slug, richText } from "@flaming-codes/sveltekit-runelayer";

export const Posts = defineCollection({
  slug: "posts",
  fields: [
    { name: "title", ...text({ required: true }) },
    { name: "slug", ...slug({ from: "title" }) },
    { name: "content", ...richText() },
  ],
});
```

### 2. Export schema for drizzle-kit

```ts
// src/lib/server/drizzle-schema.ts
import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer";
import { Posts } from "./schema.js";

export const runelayerSchema = createDrizzleKitSchema([Posts]);
```

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import { defineRunelayerDrizzleConfig } from "@flaming-codes/sveltekit-runelayer/sveltekit/server";

export default defineConfig(
  defineRunelayerDrizzleConfig({
    schema: "./src/lib/server/drizzle-schema.ts",
    out: "./drizzle",
    database: {
      url: process.env.DATABASE_URL ?? "file:./data/sveltekit-runelayer.db",
      authToken: process.env.DATABASE_AUTH_TOKEN,
    },
  }),
);
```

### 3. Create the SvelteKit integration instance

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

### 4. Wire hook and admin route

```ts
// src/hooks.server.ts
import { runelayer } from "$lib/server/runelayer";

export const handle = runelayer.handle;
```

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

### 5. Run migrations before startup

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 6. Query from request context

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

## Host integration rules

- Always pass SvelteKit's `redirect`, `error`, and `fail` into `kit` during `createRunelayerApp`.
- Use `runelayer.withRequest(request)` for request-bound access checks.
- Use `runelayer.system` only for trusted server-side tasks (seeding, internal jobs, migrations).
- Keep admin routes in a dedicated route group so frontend layouts do not bleed into `/admin`.

## Required Vite alias for Better Auth + zod v4

Add this alias in your app `vite.config.ts` so production builds resolve Better Auth against zod v4:

```ts
resolve: {
  alias: {
    zod: "zod/v4",
  },
}
```

## Docs

- [Getting started](./docs/getting-started.md)
- [Architecture](./docs/architecture.md)
- [Auth](./docs/auth.md)
- [Database](./docs/database.md)
- [Query API](./docs/query-api.md)
- [Admin UI](./docs/admin-ui.md)
- [Releasing](./docs/releasing.md)
- [Monorepo](./docs/monorepo.md)

## Contributing and release hygiene

- [Contributing guide](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)
- [License](./LICENSE)
