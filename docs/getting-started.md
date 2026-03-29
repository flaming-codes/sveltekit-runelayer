# Getting Started

`sveltekit-runelayer` is a CMS-as-a-package for SvelteKit applications. It runs inside your app process with SQLite-compatible libsql connections, Drizzle ORM, Better Auth, and local file storage.

## Prerequisites

- Node.js >= 22.18.0
- pnpm 10+
- SvelteKit 2 + Svelte 5

## Install

```bash
pnpm add @flaming-codes/sveltekit-runelayer
```

The package ships with `drizzle-orm`, `@libsql/client`, and `better-auth`.

## 1. Define collections

```ts
// src/lib/server/schema.ts
import { defineCollection, text, select, slug, richText } from "@flaming-codes/sveltekit-runelayer";

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

## 2. Export drizzle-kit schema and run migrations

```ts
// src/lib/server/drizzle-schema.ts
import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer";
import { Posts } from "./schema.js";

export const runelayerSchema = createDrizzleKitSchema([Posts]);
```

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/server/drizzle-schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/sveltekit-runelayer.db",
  },
});
```

Generate/apply migrations before app startup.

## 3. Initialize sveltekit-runelayer

```ts
// src/lib/server/runelayer.ts
import { defineConfig, createRunekit } from "@flaming-codes/sveltekit-runelayer";
import { Posts } from "./schema.js";

const config = defineConfig({
  collections: [Posts],
  database: {
    url: process.env.DATABASE_URL ?? "file:./data/sveltekit-runelayer.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
  auth: {
    secret: process.env.AUTH_SECRET ?? "dev-secret-change-in-production",
    baseURL: process.env.ORIGIN ?? "http://localhost:5173",
  },
});

export const runelayer = createRunekit(config);
```

## 4. Add SvelteKit handle hook

```ts
// src/hooks.server.ts
import { runelayer } from "$lib/server/runelayer";

export const handle = runelayer.handle;
```

## 5. Add Better Auth route

```ts
// src/routes/api/auth/[...all]/+server.ts
import { createAuthHandler } from "@flaming-codes/sveltekit-runelayer";
import { runelayer } from "$lib/server/runelayer";

const handler = createAuthHandler(runelayer.auth);
export const GET = handler;
export const POST = handler;
```

## 6. Query content

```ts
// src/routes/+page.server.ts
import { find } from "@flaming-codes/sveltekit-runelayer";
import { runelayer } from "$lib/server/runelayer";
import { Posts } from "$lib/server/schema";

export async function load({ request }) {
  const posts = await find(
    { db: runelayer.database, collection: Posts, req: request },
    { limit: 10, sort: "createdAt", sortOrder: "desc" },
  );

  return { posts };
}
```

## Config reference

```ts
interface RunekitConfig {
  collections: CollectionConfig[];
  auth: AuthConfig;
  database?: {
    url: string;
    authToken?: string;
  }; // default: { url: "file:./data/sveltekit-runelayer.db" }
  globals?: GlobalConfig[];
  adminPath?: string;
  storage?: LocalStorageConfig;
}
```

## Startup model

When `createRunekit(config)` is called:

1. A libsql client is created using `database.url`
2. Drizzle table metadata is generated from collection config
3. Better Auth is initialized with the Drizzle adapter
4. Local storage adapter is initialized
5. A SvelteKit `handle` hook is returned

`createRunekit` does not apply database schema migrations at runtime. Use drizzle-kit before startup.

## Next docs

- [Schema](./schema.md)
- [Database](./database.md)
- [Query API](./query-api.md)
- [Authentication](./auth.md)
- [Architecture](./architecture.md)
