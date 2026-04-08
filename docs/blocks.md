# Blocks Field

The `blocks` field stores an ordered array of typed content blocks — each block type has its own field schema — as a JSON column. Blocks replace the `array` field entirely. Relationship fields are fully supported inside blocks via a sentinel-object pattern with opt-in population at query time.

---

## Motivation and Scope

### Blocks replace `array`

The existing `array` field is removed. Blocks are strictly more capable: a single-block-type blocks field is identical in behavior to the old array, while multi-block-type blocks add the polymorphism that array never had. The `array` field's separate-table infrastructure existed in `db/schema.ts` but was never wired through the write or read pipelines — removal has no behavioral regression.

### Why not normalized tables (one per block type)

Payload CMS's default approach creates one SQL table per block type per parent collection, requiring N+1 queries or UNION statements to reassemble a document. Adding a new block type requires a migration. Payload shipped a `blocksAsJSON` mode in v3.60.0 after community pressure confirmed the tradeoff is almost always acceptable. The only thing lost is SQL-side filtering on values inside a block — a rare requirement for CMS content modeling.

Blocks in runelayer are stored as a `text({ mode: "json" })` Drizzle column, identical to how `richText`, `json`, and `multiSelect` fields are already stored. Zero new tables per block type. Zero migrations when adding or removing a block type from a config.

### Relationships inside blocks

Relationship fields inside blocks are supported in v1. References are stored as sentinel objects (`{ _ref, _collection }`) inside the JSON blob and populated at query time via a batched post-fetch pass controlled by a `depth` parameter.

---

## Field Config

### `defineBlock()`

Defines a reusable block type. The function is a typed identity — it exists purely for TypeScript inference and can be shared across collections.

```ts
import {
  defineBlock,
  text,
  textarea,
  select,
  relationship,
} from "@flaming-codes/sveltekit-runelayer";

const HeroBlock = defineBlock({
  slug: "hero",
  label: "Hero Section",
  fields: [
    { name: "heading", ...text({ required: true }) },
    { name: "subheading", ...textarea() },
    {
      name: "align",
      ...select({
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
        ],
        defaultValue: "left",
      }),
    },
    { name: "author", ...relationship({ relationTo: "users" }) },
    { name: "tags", ...relationship({ relationTo: "tags", hasMany: true }) },
  ],
});

const CTABlock = defineBlock({
  slug: "cta",
  label: "Call to Action",
  fields: [
    { name: "label", ...text({ required: true }) },
    { name: "url", ...text({ required: true }) },
  ],
});
```

### `blocks()` field builder

```ts
import { defineCollection, text, blocks } from "@flaming-codes/sveltekit-runelayer";

const Pages = defineCollection({
  slug: "pages",
  fields: [
    { name: "title", ...text({ required: true }) },
    {
      name: "layout",
      ...blocks({
        blocks: [HeroBlock, CTABlock],
        minBlocks: 0,
        maxBlocks: 50,
      }),
    },
  ],
});
```

### TypeScript interfaces

```ts
export interface BlockConfig {
  slug: string; // Stored as the blockType discriminator
  label: string; // Display name in the admin block palette
  fields: NamedField[]; // Sub-fields — any field type except blocks (no nesting)
}

export type BlocksField = BaseField<"blocks"> & {
  blocks: BlockConfig[];
  minBlocks?: number;
  maxBlocks?: number;
  validate?: ValidationFn<unknown[]>;
};

export function defineBlock<T extends BlockConfig>(config: T): T {
  return config;
}
```

`BlocksField` is added to the `Field` discriminated union alongside the other field types. `blocks` and `defineBlock` are exported from the main `index.ts`.

---

## Storage

### Blocks column

The blocks field maps to a single `text({ mode: "json" })` Drizzle column in the parent collection's table. The `mapField()` switch in `db/schema.ts` adds one case:

```ts
case "blocks":
  return { [col]: text(col, { mode: "json" }) };
```

No auxiliary tables are created for blocks.

### Block instance shape

```json
[
  {
    "blockType": "hero",
    "_key": "a1b2c3d4",
    "heading": "Welcome to Runelayer",
    "subheading": "Build faster.",
    "align": "center",
    "author": { "_ref": "user-abc", "_collection": "users" },
    "tags": [
      { "_ref": "tag-1", "_collection": "tags" },
      { "_ref": "tag-2", "_collection": "tags" }
    ]
  },
  {
    "blockType": "cta",
    "_key": "e5f6g7h8",
    "label": "Get Started",
    "url": "/docs"
  }
]
```

- `blockType` — the block's `slug`. Set by the enforcement layer on write; never editable via the data payload.
- `_key` — a stable UUID generated on first write. Preserved across updates. Used by Svelte as a stable list key during reordering. Never sent by the user; generated if absent.
- Relationship fields store sentinel objects (see below). All other field values are stored directly.

---

## Relationship Sentinel Pattern

### Sentinel shape

All relationship values — whether inside a block or at the top level of a collection — are stored as sentinel objects:

```ts
type RefSentinel = {
  _ref: string; // The referenced document's ID
  _collection: string; // The collection slug (e.g. "users", "tags")
};
```

For `hasMany: true`, the value is an array of sentinels:

```ts
type RefSentinelArray = RefSentinel[];
```

**Why sentinel objects over bare ID strings:**

- Self-describing: a generic tree walker can collect all refs without consulting the schema, enabling future tooling (e.g., reference integrity checks, bulk reference updates after a document move).
- Polymorphic fields (`relationTo: ["posts", "pages"]`) require the collection name to know which table to query. Sentinel objects handle mono- and polymorphic fields uniformly.
- Unambiguous: `value._ref !== undefined` is a reliable discriminator in TypeScript.

### Top-level relationships use the same sentinel

The existing behavior of storing a bare ID string for top-level `relationship` fields is replaced by the sentinel pattern. This is a **breaking change**. After this change, all relationship fields — whether on a collection, inside a group, or inside a block — use the same storage format.

---

## Population via `depth`

By default, relationship fields are returned as their raw sentinel objects. Opt into population by passing `depth: 1` to any query operation.

```ts
// depth 0 (default) — raw sentinels
const page = await findOne(ctx, "page-1");
// page.layout[0].author → { _ref: "user-abc", _collection: "users" }

// depth 1 — populated
const page = await findOne(ctx, "page-1", { depth: 1 });
// page.layout[0].author → { id: "user-abc", name: "Alice", email: "..." }
// page.layout[0].tags → [{ id: "tag-1", name: "Design" }, ...]
// Missing refs return null: page.layout[0].author → null (if "user-abc" was deleted)
```

### Population algorithm

1. Fetch the document row(s) from the DB as usual.
2. Walk the document using the collection's field config as a schema guide — no need to traverse arbitrary JSON; the schema tells you exactly which fields are relationship type and where they appear (top-level, inside groups, inside blocks).
3. Collect all sentinels, grouped by `_collection`: `Map<collectionSlug, Set<id>>`.
4. For each distinct `_collection`, run one `SELECT * FROM {collection} WHERE id IN (...)`.
5. Build a lookup map `Map<collectionSlug, Map<id, document>>`.
6. Walk again, replacing each sentinel with the corresponding document from the map, or `null` if not found.

Total extra queries: one per distinct referenced collection, regardless of how many blocks or fields reference it. No N+1 problem.

**Depth > 1 is deferred to v2.** For almost all CMS content modeling, depth 1 (populate direct references) is sufficient. Recursive population of references inside already-populated documents adds complexity and query cost that is rarely needed.

### FindArgs update

```ts
export interface FindArgs {
  limit?: number;
  offset?: number;
  sort?: string;
  draft?: boolean;
  depth?: 0 | 1; // default 0
}
```

`findOne` receives the same `depth` option.

---

## TypeScript Types

Types are inferred from block and field configs at definition time. No CLI generation step.

### Inference utilities

```ts
// Sentinel types
export type RefSentinel<C extends string = string> = {
  _ref: string;
  _collection: C;
};

// Infer the value type of a single field, parameterized over population depth
type InferFieldValue<F extends Field, D extends 0 | 1> = F extends
  | TextField
  | TextareaField
  | EmailField
  | SlugField
  ? string
  : F extends NumberField
    ? number
    : F extends CheckboxField
      ? boolean
      : F extends SelectField
        ? string
        : F extends MultiSelectField
          ? string[]
          : F extends DateField
            ? string
            : F extends RichTextField | JsonField
              ? unknown
              : F extends RelationshipField
                ? F["hasMany"] extends true
                  ? D extends 0
                    ? RefSentinel[]
                    : (Record<string, unknown> | null)[]
                  : D extends 0
                    ? RefSentinel
                    : Record<string, unknown> | null
                : F extends GroupField
                  ? InferFieldsData<F["fields"], D>
                  : F extends BlocksField
                    ? BlocksValue<F["blocks"], D>
                    : never;

// Infer object shape from a named field array
type InferFieldsData<Fields extends NamedField[], D extends 0 | 1> = {
  [F in Fields[number] as F["name"]]: InferFieldValue<F, D>;
};

// Infer a single block instance
type InferBlockData<B extends BlockConfig, D extends 0 | 1 = 0> = {
  blockType: B["slug"];
  _key: string;
} & InferFieldsData<B["fields"], D>;

// Infer the full blocks field value (discriminated union array)
export type BlocksValue<Blocks extends BlockConfig[], D extends 0 | 1 = 0> = InferBlockData<
  Blocks[number],
  D
>[];
```

### Consumer usage

```ts
// Narrowing via blockType discriminator — no CLI step needed
for (const block of page.layout) {
  if (block.blockType === "hero") {
    // depth 0: block.author is RefSentinel
    // depth 1: block.author is UserDocument | null
    block.heading; // string ✓
    block.tags; // RefSentinel[] | (TagDocument | null)[] depending on depth
  }
  if (block.blockType === "cta") {
    block.label; // string ✓
    block.url; // string ✓
  }
}
```

---

## Validation (Write Enforcement)

Block validation runs through `enforceWritePayload()` in `query/enforcement.ts`.

### Rules

1. **Array shape**: value must be an array. Non-array values are rejected.
2. **Row count**: `minBlocks` and `maxBlocks` enforced (mirrors removed `array` minRows/maxRows).
3. **Block type allowlisting**: Each item's `blockType` must match one of the configured `blocks[].slug` values. Unknown block types are rejected.
4. **`blockType` immutability**: `blockType` cannot be set by the user payload on updates — it is set at creation and preserved. (An update that changes `blockType` is an illegal operation; delete the block and add a new one.)
5. **`_key` lifecycle**: If an incoming block has no `_key`, one is generated (UUID). Existing `_key` values are preserved. `_key` cannot be set to an empty string.
6. **Sub-field enforcement**: For each block, the matching `BlockConfig.fields` are used to enforce sub-field values — required checks, type coercion, min/max, select option membership, custom `validate` functions — using the same `enforceField()` logic as top-level fields.
7. **Relationship sentinels**: Relationship fields inside blocks (and at top level) are normalized to sentinel objects. A bare ID string is accepted and automatically wrapped: `"user-abc"` → `{ _ref: "user-abc", _collection: "users" }`. A sentinel with an unknown `_collection` (not a configured collection slug in the schema) is rejected. For polymorphic relationships (`relationTo: string[]`), the sentinel's `_collection` value is validated against the `relationTo` allowlist. The referenced document's existence is **not** checked at write time — this follows Keystone's approach. Missing references return `null` at population time.
8. **`required` enforcement**: When `required: true` is set on a `BlocksField`, the field must contain a non-empty array on `create` operations. This is enforced alongside other required-field checks.
9. **Field-level `validate`**: The `BlocksField.validate` function, if present, runs after sub-field enforcement completes. It receives the fully enforced blocks array and the document data context, matching the pattern used by all other field types.

### Sub-field constraint: no nested blocks

Blocks cannot contain other blocks. If a `BlockConfig.fields` array contains a field of type `blocks`, `generateTables()` throws a schema-time error with a descriptive message. This constraint is enforced at startup, not at runtime.

---

## Admin UI

### Block Palette

The "Add Block" button opens a dropdown (Carbon `OverflowMenu`) listing available block types by `label`. Selecting a type appends a new block instance: `{ blockType: slug, _key: crypto.randomUUID(), ...fieldDefaults }`.

### Block Instance Rendering

Each block renders as a Carbon `Tile`:

- **Header**: block type label, up/down reorder buttons, delete button.
- **Body**: `FieldRenderer` loop over the matching `BlockConfig.fields`. All existing field renderers work unchanged inside a block.
- `blockType` and `_key` are never rendered as form inputs — they are managed programmatically.

### Relationship field inside blocks

A `relationship` sub-field inside a block renders a **combobox/select** component (replacing the current bare TextInput in `RelationshipField.svelte`):

1. On mount, fetches `GET /runelayer/api/{collection}?limit=100` to build options. The `useAsTitle` field from the referenced collection's admin config is used as the option label; `id` is the value.
2. For `hasMany: true`, renders a multi-select.
3. Selected value is written to form state as a sentinel object `{ _ref: id, _collection: slug }`.
4. On load, if the current value is already a sentinel, reverse-looks up the label from the fetched option list (or displays "Unknown" if the referenced doc was deleted).

The new `RelationshipField.svelte` is used both inside blocks and as a standalone top-level field — the sentinel storage format is consistent.

### Component map

```
BlocksField.svelte        (new)
├── BlockPalette.svelte   (new — block type selector dropdown)
└── For each block in value[]
    ├── Block header tile (label, reorder, delete)
    └── FieldRenderer.svelte (existing, unchanged)
        └── RelationshipField.svelte (updated — combobox, not TextInput)

FieldRenderer.svelte
  + {:else if field.type === "blocks"} → BlocksField
  - {:else if field.type === "array"}  → removed
```

---

## Removal of `array`

The following are removed:

| Item                                       | Location                        |
| ------------------------------------------ | ------------------------------- |
| `ArrayField` type                          | `schema/fields.ts`              |
| `array()` builder function                 | `schema/fields.ts`              |
| `ArrayField` from `Field` union            | `schema/fields.ts`              |
| Auxiliary table generation for array       | `db/schema.ts` (lines ~108–116) |
| `case "array"` in `mapField()`             | `db/schema.ts`                  |
| `ArrayField.svelte`                        | `admin/components/fields/`      |
| `{:else if field.type === "array"}` branch | `FieldRenderer.svelte`          |
| `array` export                             | `index.ts`                      |

Migration path for consumers: replace any `array({ fields: [...] })` usage with a single-block-type `blocks({ blocks: [defineBlock({ slug: "item", label: "Item", fields: [...] })] })`.

---

## Version Snapshots

Blocks (including all sentinel values) are stored in a single JSON column and are therefore included verbatim in every version snapshot. No extra handling required. Populated documents are never persisted — population happens at read time only.

---

## Implementation Plan

### Phase 1 — Schema layer

**File: `packages/sveltekit-runelayer/src/schema/fields.ts`**

- Remove `ArrayField` type and `array()` builder; remove from `Field` union.
- Add `BlockConfig` interface, `BlocksField` type, `defineBlock()`, `blocks()`.
- Add `RefSentinel` type.
- Add type inference utilities: `InferBlockData`, `BlocksValue`, `InferFieldValue` (depth-parameterized).
- Update `NamedField` / `Field` union to include `BlocksField`, exclude `ArrayField`.

**File: `packages/sveltekit-runelayer/src/index.ts`**

- Remove `array` export.
- Add `blocks`, `defineBlock` exports.
- Add `RefSentinel`, `BlockConfig`, `BlocksValue` type exports.

### Phase 2 — DB layer

**File: `packages/sveltekit-runelayer/src/db/schema.ts`**

- Remove auxiliary table generation for `array` fields (~lines 108–116).
- Remove join table generation for `hasMany` relationships (if not already needed — verify whether top-level hasMany join tables are actually used; if unused, remove; if used, keep but note).
- Add `case "blocks": return { [col]: text(col, { mode: "json" }) }` to `mapField()`.
- Remove `case "array"` from `mapField()`.

### Phase 3 — Query enforcement

**File: `packages/sveltekit-runelayer/src/query/enforcement.ts`**

- Remove `array` field handling (currently excluded from enforcement — remove the exclusion guard entirely).
- Add `case "blocks"` to `normalizeField()`: JSON parse/serialize, validate array shape, enforce minBlocks/maxBlocks, validate blockType allowlist, recursively enforce sub-fields per matching `BlockConfig`, inject/preserve `_key`, normalize relationship sentinels.
- Update `relationship` field handling (both top-level and inside blocks): normalize bare ID string or existing sentinel to `{ _ref, _collection }`, validate `_collection` is a known collection slug.

### Phase 4 — Population

**File: `packages/sveltekit-runelayer/src/query/operations.ts`**

- Add `depth?: 0 | 1` to `FindArgs` (default `0`).
- After `enforceReadProjection()`, if `depth === 1`: call `populateRefs(doc, collection.fields, schema, db)`.
- `populateRefs()` implementation:
  1. Walk fields, collect all `RefSentinel` values grouped by `_collection`.
  2. For each `_collection`, batch-fetch: `SELECT * FROM {collection} WHERE id IN (...)`.
  3. Walk fields again, replace sentinels with fetched docs or `null`.
- The walker needs the field config (not blind JSON traversal) to know where refs live.

**File: `packages/sveltekit-runelayer/src/query/types.ts`**

- Add `depth?: 0 | 1` to `FindArgs`.

### Phase 5 — Admin UI

**New file: `admin/components/fields/BlocksField.svelte`**

- Block array state with add/remove/reorder.
- Delegates each row's fields to `FieldRenderer`.

**New file: `admin/components/fields/BlockPalette.svelte`**

- Lists `field.blocks` by label; on select, appends new block with UUID key.

**Updated file: `admin/components/fields/RelationshipField.svelte`**

- Replace `TextInput` with `ComboBox` (Carbon).
- Fetch options from `GET /runelayer/api/{collection}?limit=100` on mount.
- Store value as sentinel object; display by `useAsTitle` label.
- Handle `hasMany: true` with `MultiSelect`.

**Updated file: `admin/components/fields/FieldRenderer.svelte`**

- Remove `{:else if field.type === "array"}` branch.
- Add `{:else if field.type === "blocks"}` branch.

**Delete file: `admin/components/fields/ArrayField.svelte`**

### Phase 6 — Tests

- **Unit**: block type allowlisting, `_key` injection/preservation, minBlocks/maxBlocks, required sub-fields, sentinel normalization (bare string → sentinel), unknown `_collection` rejection.
- **Unit**: `populateRefs()` — batch fetching, null for missing refs, depth 0 returns sentinels unchanged.
- **E2E**: create a collection with a blocks field containing relationship sub-fields; create, update, publish, read at depth 0 and depth 1.
- Remove all array-field tests; replace relevant ones with equivalent blocks tests.

### Phase 7 — Documentation

- Update `docs/schema.md`: remove `array` entries, add `blocks`/`defineBlock` entries, document sentinel pattern for relationships.
- Update `docs/database.md`: remove array auxiliary table entry; add blocks JSON column entry; document sentinel storage.
- Update `docs/query-api.md`: add `depth` parameter docs; document population behavior and null-on-missing.
- Update `docs/admin-ui.md`: document BlocksField, BlockPalette, updated RelationshipField.
- Update `docs/payload-parity.md`: mark `array` as removed, `blocks` as implemented.

---

## Explicit Deferrals

| Feature                                          | Reason                                               |
| ------------------------------------------------ | ---------------------------------------------------- |
| `depth > 1` (recursive population)               | Rarely needed; high complexity                       |
| Nested blocks (blocks inside a block's fields)   | Schema-time error until v2                           |
| Block-level access control                       | Blocks are read/written atomically with the document |
| SQL filtering by values inside a block           | Fundamental tradeoff of JSON storage                 |
| Reference integrity enforcement at write time    | Follows Keystone's model; return null at read time   |
| Cascading reference cleanup on document delete   | Requires a system-level reference index              |
| Relationship fields inside blocks at `depth > 1` | Covered by the general depth deferral                |

---

## Blocks vs. Old Array: Migration Reference

```ts
// Before (array)
{ name: "items", ...array({
  fields: [
    { name: "title", ...text() },
    { name: "body", ...textarea() },
  ],
}) }

// After (blocks — functionally identical)
const ItemBlock = defineBlock({
  slug: "item",
  label: "Item",
  fields: [
    { name: "title", ...text() },
    { name: "body", ...textarea() },
  ],
});

{ name: "items", ...blocks({ blocks: [ItemBlock] }) }
```

The stored JSON changes from a separate auxiliary table to an inline JSON column. Documents must be re-saved to migrate existing data (no automatic migration tooling provided in v1).
