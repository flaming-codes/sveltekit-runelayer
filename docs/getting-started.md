# Getting Started

Runekit is a CMS-as-a-package for SvelteKit applications. It runs inside your app's process with SQLite, providing a complete content management system without external services.

## Prerequisites

- Node.js >= 22.12.0
- pnpm 10+
- A SvelteKit 2 application with Svelte 5

## Installation

```bash
pnpm add @flaming-codes/sveltekit-runelayer
```

Runekit bundles `drizzle-orm`, `better-sqlite3`, and `better-auth` as dependencies.

## Basic Setup

### 1. Define Your Schema

```ts
// src/lib/schema.ts
import {
  defineCollection,
  text,
  number,
  select,
  slug,
  richText,
  relationship,
} from "@flaming-codes/sveltekit-runelayer";

export const Posts = defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "slug", label: "Slug", ...slug({ from: "title" }) },
    { name: "content", label: "Content", ...richText() },
    {
      name: "status",
      label: "Status",
      ...select({
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
        ],
        defaultValue: "draft",
      }),
    },
  ],
  admin: { useAsTitle: "title" },
  timestamps: true,
});

export const Users = defineCollection({
  slug: "users",
  fields: [
    { name: "name", label: "Name", ...text({ required: true }) },
    { name: "email", label: "Email", ...text({ required: true }) },
  ],
  auth: true,
});
```

### 2. Initialize Runekit

```ts
// src/lib/runekit.ts
import { defineConfig, createRunekit } from "@flaming-codes/sveltekit-runelayer";
import { Posts, Users } from "./schema.js";

const config = defineConfig({
  collections: [Posts, Users],
  auth: {
    secret: process.env.AUTH_SECRET || "dev-secret-change-in-production",
    baseURL: process.env.ORIGIN || "http://localhost:5173",
  },
  dbPath: "./data/runekit.db",
});

export const runekit = createRunekit(config);
```

### 3. Add the SvelteKit Handle Hook

```ts
// src/hooks.server.ts
import { runekit } from "$lib/runekit";

export const handle = runekit.handle;
```

### 4. Add Auth API Routes

```ts
// src/routes/api/auth/[...all]/+server.ts
import { createAuthHandler } from "@flaming-codes/sveltekit-runelayer";
import { runekit } from "$lib/runekit";

const handler = createAuthHandler(runekit.auth);
export const GET = handler;
export const POST = handler;
```

### 5. Use the Query API

```ts
// src/routes/+page.server.ts
import { runekit } from "$lib/runekit";
import { find } from "@flaming-codes/sveltekit-runelayer";
import { Posts } from "$lib/schema";

export async function load({ request }) {
  const posts = await find(
    { db: runekit.database, collection: Posts, req: request },
    { limit: 10, sort: "createdAt", sortOrder: "desc" },
  );

  return { posts };
}
```

## Configuration Reference

```ts
interface RunekitConfig {
  collections: CollectionConfig[]; // Required
  auth: AuthConfig; // Required
  globals?: GlobalConfig[]; // Default: []
  adminPath?: string; // Default: '/admin'
  dbPath?: string; // Default: './data/runekit.db'
  storage?: LocalStorageConfig; // Default: { directory: './uploads', urlPrefix: '/uploads' }
}
```

## Environment Variables

```env
# .env
AUTH_SECRET=your-secret-key-here-minimum-32-chars
ORIGIN=http://localhost:5173
```

## What Happens at Startup

When `createRunekit(config)` is called:

1. SQLite database is opened (created if it doesn't exist) with WAL mode
2. Drizzle table definitions are generated from your collection configs
3. Missing tables and columns are created (`pushSchema`)
4. Better Auth is initialized with the Drizzle adapter
5. Local storage adapter is created
6. A combined SvelteKit handle hook is returned

## Next Steps

- [Schema System](./schema.md) — field types, collections, globals
- [Query API](./query-api.md) — CRUD operations with access control
- [Authentication](./auth.md) — auth setup, roles, access control
- [Admin UI](./admin-ui.md) — building the admin panel
- [Architecture](./architecture.md) — system design and module structure
