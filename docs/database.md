# Database Layer

The `sveltekit-runelayer` database layer uses Drizzle ORM with the libsql driver (`@libsql/client`). It converts collection definitions into Drizzle tables and provides low-level async CRUD helpers.

## Initialization

```ts
import { createDatabase } from "@flaming-codes/sveltekit-runelayer";

const database = createDatabase({
  url: "file:./data/sveltekit-runelayer.db", // or libsql://... for Turso
  authToken: process.env.DATABASE_AUTH_TOKEN,
  collections: [Posts, Users],
});
```

`createDatabase` returns:

```ts
interface RunekitDatabase {
  db: LibSQLDatabase; // Drizzle instance
  tables: GeneratedTables; // slug -> Drizzle table
  client: Client; // raw @libsql/client handle
}
```

## Schema Generation

`generateTables(collections)` maps `CollectionConfig[]` to SQLite table definitions.

### Column Mapping

| Field Type                                        | Drizzle Column                 | Notes                                  |
| ------------------------------------------------- | ------------------------------ | -------------------------------------- |
| text, textarea, email, slug, select, date, upload | `text()`                       | Stored as string                       |
| number                                            | `real()`                       | Floating point                         |
| checkbox                                          | `integer({ mode: 'boolean' })` | 0/1                                    |
| richText, json, multiSelect                       | `text({ mode: 'json' })`       | JSON payload                           |
| relationship (single)                             | `text()`                       | Related document ID                    |
| relationship (hasMany)                            | —                              | Join table generated                   |
| group                                             | —                              | Flattened with prefixed columns        |
| array                                             | —                              | Separate child table                   |
| row, collapsible                                  | —                              | Structural; children mapped to columns |

### Auto Columns

Every collection table includes:

- `id` (`text().primaryKey()`)
- `createdAt` (`text().notNull()`)
- `updatedAt` (`text().notNull()`)

### Optional Columns

- `versions` enabled: `_status`, `_version`
- `auth` enabled: `hash`, `salt`, `token`, `tokenExpiry`

## CRUD Operations (Async)

```ts
import {
  findMany,
  findById,
  insertOne,
  updateOne,
  deleteOne,
} from "@flaming-codes/sveltekit-runelayer";

const created = await insertOne(db, table, { title: "Hello" });
const one = await findById(db, table, created.id);
const list = await findMany(db, table, { limit: 10, sort: { column: "createdAt", order: "desc" } });
const updated = await updateOne(db, table, created.id, { title: "Updated" });
const removed = await deleteOne(db, table, created.id);
```

All write operations use `.returning()`.

## Migrations (Host-Managed)

Runtime schema push is not part of `sveltekit-runelayer` startup. Hosts must generate and apply migrations before app startup.

The package exports `createDrizzleKitSchema(collections)` to help hosts expose schema objects to drizzle-kit.

Example host schema export:

```ts
// src/lib/server/drizzle-schema.ts
import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer";
import { allCollections } from "./schema.js";

export const runelayerSchema = createDrizzleKitSchema(allCollections);
```

Example drizzle-kit config:

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

Apply migrations before starting your app.

## Auxiliary Tables

### Array fields

For `posts.tags` (`array`):

- table `posts_tags`
- columns: `id`, `_parentId`, `_order`, plus mapped sub-field columns

### hasMany relationships

For `posts.categories` (`relationship` with `hasMany: true`):

- table `posts_rels_categories`
- columns: `id`, `parentId`, `relatedId`
