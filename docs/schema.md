# Schema System

The schema system is the single source of truth in Runekit. Every collection, global, and field is defined once and drives the database layer, validation, query API, and admin UI rendering.

## Defining Collections

```ts
import { defineCollection, text, number, select, relationship, slug } from "runekit";

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
import { defineGlobal, text, json } from "runekit";

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
import { defineSchema } from "runekit";

const schema = defineSchema({
  collections: [Posts, Users, Media],
  globals: [SiteSettings, Navigation],
});
```

## Field Types

### Data Fields

| Builder          | Type String    | SQLite Column             | Options                                  |
| ---------------- | -------------- | ------------------------- | ---------------------------------------- |
| `text()`         | `text`         | `text`                    | `minLength`, `maxLength`, `defaultValue` |
| `textarea()`     | `textarea`     | `text`                    | `minLength`, `maxLength`, `defaultValue` |
| `email()`        | `email`        | `text`                    | `defaultValue`                           |
| `number()`       | `number`       | `real`                    | `min`, `max`, `defaultValue`             |
| `checkbox()`     | `checkbox`     | `integer` (boolean)       | `defaultValue`                           |
| `date()`         | `date`         | `text` (ISO string)       | `includeTime`, `defaultValue`            |
| `select()`       | `select`       | `text`                    | `options` (required), `defaultValue`     |
| `multiSelect()`  | `multiSelect`  | `text` (JSON)             | `options` (required), `defaultValue`     |
| `richText()`     | `richText`     | `text` (JSON)             | `defaultValue`                           |
| `json()`         | `json`         | `text` (JSON)             | `defaultValue`                           |
| `slug()`         | `slug`         | `text`                    | `from` (required) — source field name    |
| `relationship()` | `relationship` | `text` (FK) or join table | `relationTo`, `hasMany`                  |
| `upload()`       | `upload`       | `text` (file ref)         | `relationTo` (required)                  |

### Structural Fields

| Builder         | Type String   | DB Impact             | Purpose                                                 |
| --------------- | ------------- | --------------------- | ------------------------------------------------------- |
| `group()`       | `group`       | Flattened with prefix | Nests fields under a namespace (e.g., `address_street`) |
| `array()`       | `array`       | Separate table        | Repeating rows with sub-fields                          |
| `row()`         | `row`         | None (layout only)    | Horizontal field layout in admin UI                     |
| `collapsible()` | `collapsible` | None (layout only)    | Collapsible section in admin UI                         |

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
  | ArrayField
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

Single relationship:

```ts
{ name: 'author', ...relationship({ relationTo: 'users' }) }
// Stored as a text column with the related document's ID
```

Has-many relationship:

```ts
{ name: 'tags', ...relationship({ relationTo: 'tags', hasMany: true }) }
// Stored in a separate join table: posts_rels_tags
```

Polymorphic relationship (multiple collections):

```ts
{ name: 'relatedContent', ...relationship({ relationTo: ['posts', 'pages'] }) }
```

## Database Mapping Summary

The schema-to-database mapping is handled automatically by `generateTables()`:

- Each collection becomes a SQLite table named after its `slug`
- All tables get `id` (text primary key), `createdAt` (text), `updatedAt` (text)
- `versions: true` adds `_status` (text) and `_version` (integer) columns
- `auth: true` adds `hash`, `salt`, `token`, `tokenExpiry` columns
- `group` fields are flattened: `{ name: 'address', fields: [{ name: 'street' }] }` becomes column `address_street`
- `array` fields create a separate table: `{collectionSlug}_{fieldName}` with `_parentId` and `_order`
- `hasMany` relationships create join tables: `{collectionSlug}_rels_{fieldName}`
- `row` and `collapsible` fields pass through their children with no column prefix
