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
interface RunelayerDatabase {
  db: LibSQLDatabase; // Drizzle instance
  tables: GeneratedTables; // slug -> Drizzle table
  client: Client; // raw @libsql/client handle
}
```

## Schema Generation

`generateTables(collections)` maps `CollectionConfig[]` to SQLite table definitions.

### Column Mapping

| Field Type                                        | Drizzle Column                 | Notes                                                |
| ------------------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| text, textarea, email, slug, select, date, upload | `text()`                       | Stored as string                                     |
| number                                            | `real()`                       | Floating point                                       |
| checkbox                                          | `integer({ mode: 'boolean' })` | 0/1                                                  |
| richText, json, multiSelect                       | `text({ mode: 'json' })`       | JSON payload                                         |
| relationship (single and hasMany)                 | `text({ mode: 'json' })`       | Sentinel object or array of sentinels; no join table |
| blocks                                            | `text({ mode: 'json' })`       | Array of typed block instances; no auxiliary table   |
| group                                             | —                              | Flattened with prefixed columns                      |
| row, collapsible                                  | —                              | Structural; children mapped to columns               |

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

The package exports `createDrizzleKitSchema(collections)` to help hosts expose schema objects to
drizzle-kit. The generated schema includes:

- collection tables derived from `CollectionConfig[]`
- Better Auth tables (`user`, `session`, `account`, `verification`)

Example host schema export:

drizzle-kit discovers Drizzle table instances from **top-level named exports** only.
Destructure and re-export each table individually:

```ts
// src/lib/server/drizzle-schema.ts
import { createDrizzleKitSchema } from "@flaming-codes/sveltekit-runelayer/drizzle";
import { allCollections } from "./schema.js";

const _schema = createDrizzleKitSchema(allCollections);
// Export each table — drizzle-kit requires top-level named exports.
// Use listTableNames(allCollections) to see the full list of keys.
export const { posts, user, session, account, verification } = _schema;
```

Example drizzle-kit config:

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import { defineRunelayerDrizzleConfig } from "@flaming-codes/sveltekit-runelayer/sveltekit/drizzle";

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

Apply migrations before starting your app.

## Version History Tables

When `versions` is enabled on a collection, `generateTables` also creates a `{slug}_versions` table:

| Column       | Type             | Notes                                      |
| ------------ | ---------------- | ------------------------------------------ |
| `id`         | TEXT PK          | UUID                                       |
| `_parentId`  | TEXT NOT NULL    | FK to main table `id`                      |
| `_version`   | INTEGER NOT NULL | Monotonically increasing per document      |
| `_status`    | TEXT NOT NULL    | "draft" or "published" at time of snapshot |
| `_snapshot`  | TEXT (JSON mode) | Full document field data as JSON           |
| `_createdBy` | TEXT             | User ID who triggered this version         |
| `createdAt`  | TEXT NOT NULL    | ISO timestamp                              |

For globals, a shared `__runelayer_global_versions` table uses `_globalSlug` instead of `_parentId`.

### Version DB Operations

```ts
import {
  createVersionSnapshot,
  findVersions,
  findVersionById,
  getLatestVersionNumber,
  deleteVersionsByParent,
  pruneVersions,
} from "@flaming-codes/sveltekit-runelayer";
```

- `createVersionSnapshot(db, versionsTable, parentId, version, status, snapshot, createdBy?)` — stores a full document snapshot
- `findVersions(db, versionsTable, parentId, opts?)` — ordered by `createdAt DESC`
- `findVersionById(db, versionsTable, versionId)` — fetch single version
- `getLatestVersionNumber(db, versionsTable, parentId)` — returns `MAX(_version)` or 0
- `deleteVersionsByParent(db, versionsTable, parentId)` — cascade cleanup
- `pruneVersions(db, versionsTable, parentId, maxPerDoc)` — deletes oldest versions beyond limit, always protecting the most recent version and the latest published version

## Relationship Sentinel Format

Relationship fields do not use join tables. Both single and hasMany relationships are stored as JSON in the main table.

A single relationship value:

```json
{ "_ref": "abc123", "_collection": "users" }
```

A hasMany relationship value:

```json
[
  { "_ref": "abc123", "_collection": "tags" },
  { "_ref": "def456", "_collection": "tags" }
]
```

The `_collection` field is stored alongside every reference to support polymorphic relationships (where `relationTo` lists multiple collections). The query layer uses this to route population queries at `depth: 1` to the correct table.
