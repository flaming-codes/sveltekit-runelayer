# Database Layer

The database layer uses Drizzle ORM with SQLite (via better-sqlite3). It converts schema definitions into Drizzle table objects and provides low-level CRUD operations.

## Initialization

```ts
import { createDatabase, pushSchema } from "@flaming-codes/sveltekit-runelayer";

const database = createDatabase({
  filename: "./data/runekit.db", // or ':memory:' for tests
  collections: [Posts, Users],
});

// Create/update tables to match schema
pushSchema(database);
```

`createDatabase` returns a `RunekitDatabase`:

```ts
interface RunekitDatabase {
  db: BetterSQLite3Database; // Drizzle instance
  tables: GeneratedTables; // Map of slug -> Drizzle table definition
  sqlite: Database.Database; // Raw better-sqlite3 connection
}
```

SQLite is configured with:

- **WAL mode** (`journal_mode = WAL`) for concurrent read/write performance
- **Foreign keys** enabled (`foreign_keys = ON`)

## Schema-to-Table Generation

`generateTables(collections)` reads `CollectionConfig[]` and returns a `Record<string, SQLiteTable>`.

### Column Type Mapping

| Field Type                                        | Drizzle Column                 | Notes                                   |
| ------------------------------------------------- | ------------------------------ | --------------------------------------- |
| text, textarea, email, slug, select, date, upload | `text()`                       | Strings stored as-is                    |
| number                                            | `real()`                       | Floating point                          |
| checkbox                                          | `integer({ mode: 'boolean' })` | 0/1                                     |
| richText, json, multiSelect                       | `text({ mode: 'json' })`       | JSON serialized                         |
| relationship (single)                             | `text()`                       | Stores the related document ID          |
| relationship (hasMany)                            | —                              | Creates a join table instead            |
| group                                             | —                              | Flattened into parent table with prefix |
| array                                             | —                              | Creates a separate child table          |
| row, collapsible                                  | —                              | Layout-only; children added to parent   |

### Auto-Generated Columns

Every table includes:

- `id` — `text().primaryKey()`, auto-populated with `crypto.randomUUID()`
- `createdAt` — `text().notNull()`, auto-set to ISO timestamp on insert
- `updatedAt` — `text().notNull()`, auto-set on insert and update

### Version Columns

When `versions: true` or `versions: { drafts: true }`:

- `_status` — `text()`, defaults to `'draft'`
- `_version` — `integer()`, defaults to `1`

### Auth Columns

When `auth: true`:

- `hash` — `text()`, password hash
- `salt` — `text()`, password salt
- `token` — `text()`, verification/reset token
- `tokenExpiry` — `text()`, token expiration timestamp

## CRUD Operations

Low-level operations work with any Drizzle table:

```ts
import {
  findMany,
  findById,
  insertOne,
  updateOne,
  deleteOne,
} from "@flaming-codes/sveltekit-runelayer";

// Insert — auto-generates ID and timestamps
const doc = insertOne(db, table, { title: "Hello" });
// { id: 'uuid...', title: 'Hello', createdAt: '2026-...', updatedAt: '2026-...' }

// Find by ID
const found = findById(db, table, doc.id);

// Find many with options
const docs = findMany(db, table, {
  where: eq(table.status, "published"), // Drizzle SQL expression
  limit: 10,
  offset: 0,
  sort: { column: "createdAt", order: "desc" },
});

// Update — auto-refreshes updatedAt
const updated = updateOne(db, table, doc.id, { title: "Updated" });

// Delete
const deleted = deleteOne(db, table, doc.id);
```

All mutation operations use `.returning()` to return the affected row.

## Migrations

`pushSchema(database)` performs push-based migration:

1. For each generated table, check if it exists in SQLite
2. If not, `CREATE TABLE` with all columns
3. If it exists, compare columns and `ALTER TABLE ADD COLUMN` for any missing ones

Limitations:

- Columns are never removed (prevents accidental data loss)
- Column type changes are not detected
- If a field changes type, the old column persists with the wrong type

For production use with complex migrations, use `drizzle-kit` directly against the generated schema.

## Auxiliary Tables

### Array Tables

For a collection `posts` with an `array` field named `tags`:

- Table: `posts_tags`
- Columns: `id`, `_parentId` (FK to posts), `_order` (sort index), plus columns from the array's sub-fields

### Join Tables

For a collection `posts` with a `hasMany` relationship field named `categories`:

- Table: `posts_rels_categories`
- Columns: `id`, `parentId` (FK to posts), `relatedId` (FK to categories)

## Testing

Use `:memory:` for in-memory SQLite in tests:

```ts
const rdb = createDatabase({ filename: ":memory:", collections });
pushSchema(rdb);
// ... run operations ...
// Database is automatically discarded when the connection is garbage collected
```
