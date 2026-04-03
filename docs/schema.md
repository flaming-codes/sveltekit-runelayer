# Schema System

The schema system is the single source of truth in sveltekit-runelayer. Every collection, global, and field is defined once and drives the database layer, validation, query API, and admin UI rendering.

## Defining Collections

```ts
import {
  defineCollection,
  text,
  number,
  select,
  relationship,
  slug,
} from "@flaming-codes/sveltekit-runelayer";

const Posts = defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", ...text({ required: true, maxLength: 200 }) },
    { name: "slug", ...slug({ from: "title" }) },
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
    { name: "author", ...relationship({ relationTo: "users" }) },
    { name: "readTime", ...number({ min: 1 }) },
  ],
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "status", "author"],
  },
  timestamps: true,
  versions: { drafts: true, maxPerDoc: 10 },
});
```

## Collection Config

```ts
interface CollectionConfig {
  slug: string; // URL-safe identifier, also the DB table name
  fields: NamedField[]; // Array of field definitions
  labels?: { singular: string; plural: string }; // Display names
  admin?: {
    useAsTitle?: string; // Field to use as document title in admin
    defaultColumns?: string[]; // Columns shown in list view
  };
  access?: AccessControl; // Per-operation access functions
  hooks?: Hooks; // Lifecycle hooks
  auth?: boolean | CollectionAuthConfig; // Marks as auth-enabled collection
  upload?: boolean | UploadConfig; // Marks as upload collection
  versions?: boolean | { drafts?: boolean; maxPerDoc?: number };
  timestamps?: boolean; // Auto createdAt/updatedAt
}
```

## Defining Globals

Globals are single-document types (e.g., site settings, navigation).

```ts
import { defineGlobal, text, json } from "@flaming-codes/sveltekit-runelayer";

const SiteSettings = defineGlobal({
  slug: "site-settings",
  label: "Site Settings",
  fields: [
    { name: "siteName", ...text({ required: true }) },
    { name: "metadata", ...json() },
  ],
  access: {
    read: () => true,
    update: isAdmin(),
  },
});
```

Globals support `read` and `update` access (no `create` or `delete`), and `beforeChange`/`afterChange` hooks only.

## Schema Config

Combine collections and globals into a full schema:

```ts
import { defineSchema } from "@flaming-codes/sveltekit-runelayer";

const schema = defineSchema({
  collections: [Posts, Users, Media],
  globals: [SiteSettings, Navigation],
});
```

## Field Types

### Data Fields

| Builder          | Type String    | SQLite Column       | Options                                  |
| ---------------- | -------------- | ------------------- | ---------------------------------------- |
| `text()`         | `text`         | `text`              | `minLength`, `maxLength`, `defaultValue` |
| `textarea()`     | `textarea`     | `text`              | `minLength`, `maxLength`, `defaultValue` |
| `email()`        | `email`        | `text`              | `defaultValue`                           |
| `number()`       | `number`       | `real`              | `min`, `max`, `defaultValue`             |
| `checkbox()`     | `checkbox`     | `integer` (boolean) | `defaultValue`                           |
| `date()`         | `date`         | `text` (ISO string) | `includeTime`, `defaultValue`            |
| `select()`       | `select`       | `text`              | `options` (required), `defaultValue`     |
| `multiSelect()`  | `multiSelect`  | `text` (JSON)       | `options` (required), `defaultValue`     |
| `richText()`     | `richText`     | `text` (JSON)       | `defaultValue`                           |
| `json()`         | `json`         | `text` (JSON)       | `defaultValue`                           |
| `slug()`         | `slug`         | `text`              | `from` (required) — source field name    |
| `relationship()` | `relationship` | `text` (JSON)       | `relationTo`, `hasMany`                  |
| `upload()`       | `upload`       | `text` (file ref)   | `relationTo` (required)                  |

### Structural Fields

| Builder         | Type String   | DB Impact             | Purpose                                                      |
| --------------- | ------------- | --------------------- | ------------------------------------------------------------ |
| `group()`       | `group`       | Flattened with prefix | Nests fields under a namespace (e.g., `address_street`)      |
| `blocks()`      | `blocks`      | JSON column           | Polymorphic repeating blocks, each with its own field schema |
| `row()`         | `row`         | None (layout only)    | Horizontal field layout in admin UI                          |
| `collapsible()` | `collapsible` | None (layout only)    | Collapsible section in admin UI                              |

### defineBlock

Blocks are defined with `defineBlock()` and composed into a `blocks()` field:

```ts
import { defineBlock, blocks, text, number } from "@flaming-codes/sveltekit-runelayer";

const HeroBlock = defineBlock({
  slug: "hero",
  label: "Hero",
  fields: [
    { name: "heading", ...text({ required: true }) },
    { name: "subheading", ...text() },
  ],
});

const CalloutBlock = defineBlock({
  slug: "callout",
  label: "Callout",
  fields: [
    { name: "message", ...text({ required: true }) },
    { name: "level", ...number({ min: 1, max: 3 }) },
  ],
});

// Use in a collection field:
{ name: "content", ...blocks({ blocks: [HeroBlock, CalloutBlock], minBlocks: 1, maxBlocks: 10 }) }
```

Each block instance stored in the database includes a `blockType` (matching the block's `slug`) and a `_key` (unique identifier for the block within the list), followed by the block's own field values.

`blocks()` field options beyond the base options:

- `blocks` (required): array of `BlockConfig` definitions
- `minBlocks?: number` — minimum number of blocks required
- `maxBlocks?: number` — maximum number of blocks allowed
- `validate?: ValidationFn<unknown[]>` — custom validator for the full blocks array

### Common Field Options

Every field (via `BaseField`) supports:

```ts
{
  required?: boolean;           // Validation: field must have a value
  localized?: boolean;          // Enable per-locale values (i18n)
  access?: FieldAccess;         // Per-field create/read/update access
  admin?: {
    condition?: (data) => boolean; // Show/hide field based on other field values
  };
}
```

Fields also accept a `validate` function specific to their value type:

```ts
{ name: 'age', ...number({
  validate: (value, { data }) => value >= 18 || 'Must be 18 or older',
}) }
```

The validator returns `true` on success or a string error message on failure.

## Runtime Enforcement

The query layer enforces schema constraints at write/read time:

- Writes are allowlisted to declared schema fields (plus system-managed columns handled internally)
- Unknown or reserved/system keys are rejected
- `required` fields are enforced on create
- Built-in field constraints are enforced where applicable (`min`, `max`, `minLength`, `maxLength`, select option membership, array row limits)
- Field `validate` callbacks run during create/update
- Field `access` rules are enforced for create/update/read
- For `auth: true` collections, auth-internal fields are redacted from query read results

Group field access is inherited by nested persisted fields, and child field access is applied on top.

## Named Fields

All fields in a collection must have a `name` and optional `label`:

```ts
{ name: 'firstName', label: 'First Name', ...text({ required: true }) }
```

The `name` becomes the database column name and the key in document objects. The `label` is used in the admin UI (defaults to `name` if omitted).

## Type System

The schema uses TypeScript discriminated unions for type safety:

```ts
type Field =
  | TextField
  | TextareaField
  | NumberField
  | RichTextField
  | SelectField
  | MultiSelectField
  | CheckboxField
  | DateField
  | RelationshipField
  | UploadField
  | JsonField
  | SlugField
  | EmailField
  | GroupField
  | BlocksField
  | RowField
  | CollapsibleField;

type NamedField = Field & { name: string; label?: string };
```

Builder functions return properly typed field objects:

```ts
const f = text({ required: true, maxLength: 100 });
// f is typed as TextField with type: 'text'
```

## Relationship Fields

Relationship values are stored as sentinel objects rather than bare ID strings. This allows the query layer to track both the referenced document ID and the collection it belongs to, which is required for polymorphic relationships and depth-based population.

A single relationship sentinel:

```ts
{ _ref: "abc123", _collection: "users" }
```

A hasMany relationship stores an array of sentinels:

```ts
[
  { _ref: "abc123", _collection: "tags" },
  { _ref: "def456", _collection: "tags" },
];
```

Both single and hasMany relationships are stored as a JSON column in the main table — no join tables are used.

Single relationship:

```ts
{ name: 'author', ...relationship({ relationTo: 'users' }) }
// Stored as a JSON column: { _ref: "...", _collection: "users" }
```

Has-many relationship:

```ts
{ name: 'tags', ...relationship({ relationTo: 'tags', hasMany: true }) }
// Stored as a JSON column: [{ _ref: "...", _collection: "tags" }, ...]
```

Polymorphic relationship (multiple collections):

```ts
{ name: 'relatedContent', ...relationship({ relationTo: ['posts', 'pages'] }) }
// Stored as { _ref: "...", _collection: "posts" } or { _ref: "...", _collection: "pages" }
```

## Database Mapping Summary

The schema-to-database mapping is handled automatically by `generateTables()`:

- Each collection becomes a SQLite table named after its `slug`
- All tables get `id` (text primary key), `createdAt` (text), `updatedAt` (text)
- `versions: true` adds `_status` (text) and `_version` (integer) columns
- `auth: true` adds `hash`, `salt`, `token`, `tokenExpiry` columns
- `group` fields are flattened: `{ name: 'address', fields: [{ name: 'street' }] }` becomes column `address_street`
- `relationship` fields (single and hasMany) → JSON column in the main table; no join tables
- `blocks` fields → JSON column in the main table; no auxiliary table
- `row` and `collapsible` fields pass through their children with no column prefix
