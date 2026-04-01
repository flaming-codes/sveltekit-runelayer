# Data Display Components

## DataTable

Import: `import { DataTable } from "carbon-components-svelte"`

### Props

| Prop                        | Type                                         | Default        |
| --------------------------- | -------------------------------------------- | -------------- |
| `sortKey` (Reactive)        | `DataTableKey<Row>`                          | `null`         |
| `sortDirection` (Reactive)  | `"none" \| "ascending" \| "descending"`      | `"none"`       |
| `expandable` (Reactive)     | `boolean`                                    | `false`        |
| `expandedRowIds` (Reactive) | `ReadonlyArray<Row["id"]>`                   | `[]`           |
| `selectable` (Reactive)     | `boolean`                                    | `false`        |
| `selectedRowIds` (Reactive) | `ReadonlyArray<Row["id"]>`                   | `[]`           |
| `headers`                   | `ReadonlyArray<DataTableHeader<Row>>`        | `[]`           |
| `rows`                      | `ReadonlyArray<Row>`                         | `[]`           |
| `size`                      | `"compact" \| "short" \| "medium" \| "tall"` | _undefined_    |
| `title`                     | `string`                                     | `""`           |
| `description`               | `string`                                     | `""`           |
| `rowClass`                  | `string \| ((row) => string)`                | _undefined_    |
| `zebra`                     | `boolean`                                    | `false`        |
| `sortable`                  | `boolean`                                    | `false`        |
| `sortAlways`                | `boolean`                                    | `false`        |
| `batchExpansion`            | `boolean`                                    | `false`        |
| `nonExpandableRowIds`       | `ReadonlyArray<Row["id"]>`                   | `[]`           |
| `radio`                     | `boolean`                                    | `false`        |
| `batchSelection`            | `boolean`                                    | `false`        |
| `nonSelectableRowIds`       | `ReadonlyArray<Row["id"]>`                   | `[]`           |
| `stickyHeader`              | `boolean`                                    | `false`        |
| `useStaticWidth`            | `boolean`                                    | `false`        |
| `pageSize`                  | `number`                                     | `0`            |
| `page`                      | `number`                                     | `0`            |
| `virtualize`                | `undefined \| boolean \| config object`      | _undefined_    |
| `inputName`                 | `string`                                     | auto-generated |

### Typedefs

```ts
type DataTableHeader<Row> = {
  key: DataTableKey<Row>;
  value: DataTableValue;
  display?: (value: any, row: Row) => string;
  sort?: false | ((a: any, b: any) => number);
  sortAlways?: boolean;
  columnMenu?: boolean;
  width?: string;
  minWidth?: string;
};

interface DataTableRow<Id = any> {
  id: Id;
  [key: string]: DataTableValue;
}
```

### Slots

| Slot                  | Props                                                          |
| --------------------- | -------------------------------------------------------------- |
| `default`             | -                                                              |
| `cell`                | `{ row, cell, rowIndex, cellIndex, rowSelected, rowExpanded }` |
| `cellHeader`          | `{ header }`                                                   |
| `descriptionChildren` | -                                                              |
| `expandIcon`          | -                                                              |
| `expandedRow`         | `{ row, rowSelected }`                                         |
| `titleChildren`       | -                                                              |

### Dispatched Events

`on:click`, `on:click:cell`, `on:click:header`, `on:click:header--expand`, `on:click:header--select`, `on:click:row`, `on:click:row--expand`, `on:click:row--select`, `on:mouseenter:row`, `on:mouseleave:row`

### Basic Table

```svelte
<script>
  import { DataTable } from "carbon-components-svelte";

  const headers = [
    { key: "name", value: "Name" },
    { key: "email", value: "Email" },
    { key: "role", value: "Role" },
  ];
  const rows = [
    { id: "1", name: "Alice", email: "alice@example.com", role: "Admin" },
    { id: "2", name: "Bob", email: "bob@example.com", role: "Editor" },
    { id: "3", name: "Carol", email: "carol@example.com", role: "Viewer" },
  ];
</script>

<DataTable {headers} {rows} title="Users" description="Team members" />
```

### Sortable Table

```svelte
<DataTable
  sortable
  {headers}
  {rows}
  on:click:header={(e) => console.log("Sort by:", e.detail)}
/>
```

### Selectable Table

```svelte
<script>
  let selectedRowIds = [];
</script>

<DataTable
  selectable
  batchSelection
  bind:selectedRowIds
  {headers}
  {rows}
  on:click:row--select={(e) => console.log("Selected:", e.detail)}
/>
```

### Expandable Table

```svelte
<DataTable expandable {headers} {rows}>
  <svelte:fragment slot="expandedRow" let:row>
    <p>Details for {row.name}: {row.email}</p>
  </svelte:fragment>
</DataTable>
```

### Custom Cell Rendering

```svelte
<DataTable {headers} {rows}>
  <svelte:fragment slot="cell" let:row let:cell>
    {#if cell.key === "role"}
      <Tag type={cell.value === "Admin" ? "red" : "blue"}>{cell.value}</Tag>
    {:else}
      {cell.value}
    {/if}
  </svelte:fragment>
</DataTable>
```

### With Toolbar and Search

```svelte
<script>
  import { DataTable, Toolbar, ToolbarContent, ToolbarSearch, Button } from "carbon-components-svelte";
  import Add from "carbon-icons-svelte/lib/Add.svelte";
</script>

<DataTable {headers} {rows}>
  <Toolbar>
    <ToolbarContent>
      <ToolbarSearch shouldFilterRows />
      <Button icon={Add}>Add new</Button>
    </ToolbarContent>
  </Toolbar>
</DataTable>
```

### Toolbar Components

**Toolbar props:** `size` (`"sm" | "default"`, `"default"`)

**ToolbarSearch props:**

| Prop                        | Type                       | Default |
| --------------------------- | -------------------------- | ------- |
| `value` (Reactive)          | `string`                   | `""`    |
| `expanded` (Reactive)       | `boolean`                  | `false` |
| `filteredRowIds` (Reactive) | `ReadonlyArray`            | `[]`    |
| `ref` (Reactive)            | `null \| HTMLInputElement` | `null`  |
| `persistent`                | `boolean`                  | `false` |
| `disabled`                  | `boolean`                  | `false` |
| `shouldFilterRows`          | `boolean \| function`      | `false` |
| `tabindex`                  | `string`                   | `"0"`   |

**ToolbarBatchActions props:** `active` (Reactive), `formatTotalSelected` (function), `selectedIds` ([])
**ToolbarBatchActions dispatched events:** `on:cancel`

## Accordion / AccordionItem

Import: `import { Accordion, AccordionItem } from "carbon-components-svelte"`

**Accordion props:** `align` (`"start" | "end"`, `"end"`), `size` (`"sm" | "xl"`), `disabled` (false), `skeleton` (false)

**AccordionItem props:**

| Prop                  | Type      | Default             |
| --------------------- | --------- | ------------------- |
| `open` (Reactive)     | `boolean` | `false`             |
| `disabled` (Reactive) | `boolean` | `false`             |
| `title`               | `string`  | `"title"`           |
| `iconDescription`     | `string`  | `"Expand/Collapse"` |

**AccordionItem slots:** `default`, `title`

```svelte
<Accordion>
  <AccordionItem title="Section 1">
    <p>Content for section 1</p>
  </AccordionItem>
  <AccordionItem title="Section 2">
    <p>Content for section 2</p>
  </AccordionItem>
  <AccordionItem title="Section 3" disabled>
    <p>Disabled section</p>
  </AccordionItem>
</Accordion>
```

## Tag / SelectableTag

Import: `import { Tag, SelectableTag } from "carbon-components-svelte"`

### Tag Props

| Prop          | Type                                                                                                                                              | Default          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `type`        | `"red" \| "magenta" \| "purple" \| "blue" \| "cyan" \| "teal" \| "green" \| "gray" \| "cool-gray" \| "warm-gray" \| "high-contrast" \| "outline"` | _undefined_      |
| `size`        | `"sm" \| "default"`                                                                                                                               | `"default"`      |
| `filter`      | `boolean`                                                                                                                                         | `false`          |
| `disabled`    | `boolean`                                                                                                                                         | `false`          |
| `interactive` | `boolean`                                                                                                                                         | `false`          |
| `skeleton`    | `boolean`                                                                                                                                         | `false`          |
| `title`       | `string`                                                                                                                                          | `"Clear filter"` |
| `icon`        | `Icon`                                                                                                                                            | _undefined_      |

### SelectableTag

Same as Tag plus `selected` (Reactive, false).
**Dispatched events:** `on:change` -> `{ selected: boolean }`

```svelte
<Tag type="blue">Active</Tag>
<Tag type="red" filter on:close>Error</Tag>
<SelectableTag bind:selected={isSelected}>Optional</SelectableTag>
```

## Tile Variants

Import: `import { Tile, ClickableTile, ExpandableTile, RadioTile, SelectableTile, TileGroup, SelectableTileGroup } from "carbon-components-svelte"`

### Tile (basic)

**Props:** `light` (boolean, false)

### ClickableTile

**Props:** `clicked` (Reactive, false), `light` (false), `disabled` (false), `href`

### ExpandableTile

**Props:** `expanded` (Reactive, false), `light` (false), `tileCollapsedIconText`, `tileExpandedIconText`, `hasInteractiveContent` (false)
**Slots:** `above`, `below`

### RadioTile / TileGroup

**RadioTile props:** `checked` (Reactive, false), `light` (false), `disabled` (false), `required` (false), `value`, `tabindex`, `iconDescription`, `id`, `name`
**TileGroup props:** `selected` (Reactive), `disabled` (false), `required`, `name`, `legendText`

### SelectableTile / SelectableTileGroup

**SelectableTile props:** `selected` (Reactive, false), `ref` (Reactive), `light` (false), `disabled` (false), `title`, `value`, `tabindex`, `iconDescription`, `id`, `name`
**SelectableTileGroup props:** `selected` (Reactive, []), `disabled` (false), `name`, `legendText`

```svelte
<!-- Basic tile -->
<Tile>Simple content tile</Tile>

<!-- Clickable tile -->
<ClickableTile href="/details">Click to navigate</ClickableTile>

<!-- Expandable tile -->
<ExpandableTile>
  <div slot="above">Always visible summary</div>
  <div slot="below">Expanded details shown on click</div>
</ExpandableTile>

<!-- Radio tile group -->
<TileGroup bind:selected={plan} legendText="Select a plan">
  <RadioTile value="free">Free</RadioTile>
  <RadioTile value="pro">Pro</RadioTile>
  <RadioTile value="enterprise">Enterprise</RadioTile>
</TileGroup>

<!-- Multi-selectable tiles -->
<SelectableTileGroup bind:selected={features}>
  <SelectableTile value="sso">SSO</SelectableTile>
  <SelectableTile value="mfa">MFA</SelectableTile>
  <SelectableTile value="audit">Audit logs</SelectableTile>
</SelectableTileGroup>
```

## StructuredList

Import: `import { StructuredList, StructuredListBody, StructuredListCell, StructuredListHead, StructuredListInput, StructuredListRow } from "carbon-components-svelte"`

**StructuredList props:** `selected` (Reactive), `condensed` (false), `flush` (false), `selection` (false)
**StructuredListCell props:** `head` (false), `noWrap` (false)
**StructuredListRow props:** `head` (false), `label` (false), `tabindex` ("0")
**StructuredListInput props:** `checked` (Reactive, false), `ref` (Reactive), `title`, `value`, `id`, `name`

```svelte
<StructuredList>
  <StructuredListHead>
    <StructuredListRow head>
      <StructuredListCell head>Feature</StructuredListCell>
      <StructuredListCell head>Status</StructuredListCell>
    </StructuredListRow>
  </StructuredListHead>
  <StructuredListBody>
    <StructuredListRow>
      <StructuredListCell>Dark mode</StructuredListCell>
      <StructuredListCell>Available</StructuredListCell>
    </StructuredListRow>
    <StructuredListRow>
      <StructuredListCell>Export</StructuredListCell>
      <StructuredListCell>Coming soon</StructuredListCell>
    </StructuredListRow>
  </StructuredListBody>
</StructuredList>
```

## CodeSnippet

Import: `import { CodeSnippet } from "carbon-components-svelte"`

| Prop                            | Type                              | Default                       |
| ------------------------------- | --------------------------------- | ----------------------------- |
| `expanded` (Reactive)           | `boolean`                         | `false`                       |
| `showMoreLess` (Reactive)       | `boolean`                         | `true`                        |
| `ref` (Reactive)                | `null \| HTMLPreElement`          | `null`                        |
| `type`                          | `"single" \| "inline" \| "multi"` | `"single"`                    |
| `code`                          | `string`                          | _undefined_                   |
| `copy`                          | `(code: string) => void`          | _undefined_                   |
| `hideCopyButton`                | `boolean`                         | `false`                       |
| `disabled`                      | `boolean`                         | `false`                       |
| `wrapText`                      | `boolean`                         | `false`                       |
| `light`                         | `boolean`                         | `false`                       |
| `skeleton`                      | `boolean`                         | `false`                       |
| `feedback`                      | `string`                          | `"Copied!"`                   |
| `feedbackTimeout`               | `number`                          | `2000`                        |
| `showLessText` / `showMoreText` | `string`                          | `"Show less"` / `"Show more"` |

**Note:** You _must_ use the `code` prop for copy-to-clipboard to work.

```svelte
<!-- Inline -->
<CodeSnippet type="inline" code="npm install" />

<!-- Single line -->
<CodeSnippet type="single" code="pnpm i carbon-components-svelte" />

<!-- Multi-line -->
<CodeSnippet type="multi" code={`import { Button } from "carbon-components-svelte";

<Button>Click me</Button>`} />
```

## OrderedList / UnorderedList / ListItem

Import: `import { OrderedList, UnorderedList, ListItem } from "carbon-components-svelte"`

**OrderedList props:** `nested` (false), `native` (false), `expressive` (false)
**UnorderedList props:** `nested` (false), `expressive` (false)

```svelte
<UnorderedList>
  <ListItem>First item</ListItem>
  <ListItem>Second item</ListItem>
  <ListItem>
    Third item
    <UnorderedList nested>
      <ListItem>Nested item</ListItem>
    </UnorderedList>
  </ListItem>
</UnorderedList>
```

## ContainedList / ContainedListItem

Import: `import { ContainedList, ContainedListItem } from "carbon-components-svelte"`

**ContainedList props:** `kind` (`"on-page" | "disclosed"`, `"on-page"`), `labelText` (""), `size` (`"sm" | "md" | "lg" | "xl"`, "md"), `inset` (false), `id`
**Slots:** `default`, `action`, `labelChildren`
**ContainedListItem props:** `interactive` (false), `disabled` (false), `icon` (Icon)

## RecursiveList

Import: `import { RecursiveList } from "carbon-components-svelte"`

| Prop    | Type                                           | Default       |
| ------- | ---------------------------------------------- | ------------- |
| `nodes` | `ReadonlyArray<Node & { nodes?: Node[] }>`     | `[]`          |
| `type`  | `"unordered" \| "ordered" \| "ordered-native"` | `"unordered"` |

```ts
type RecursiveListNode = {
  text?: string;
  href?: string;
  html?: string;
  nodes?: RecursiveListNode[];
};
```

## Skeleton Components

- **SkeletonText:** `lines` (3), `heading` (false), `paragraph` (false), `width` ("100%")
- **SkeletonPlaceholder:** `size` (number | string), `width` (number | string), `height` (number | string)
- **SkeletonIcon:** `size` (16 | 20 | 24 | 32 | number, default 16)
