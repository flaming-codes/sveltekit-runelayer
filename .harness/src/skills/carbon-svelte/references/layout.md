# Layout Components

## Carbon 2x Grid System

The Carbon 2x Grid is built on a base unit ("mini unit") of **8px**. All spacing, columns, margins, and gutters derive from multiples of this unit.

### Breakpoints

| Breakpoint | Min Width | Columns | Margin | Gutter (wide) |
| ---------- | --------- | ------- | ------ | ------------- |
| `sm`       | 320px     | 4       | 0      | 32px          |
| `md`       | 672px     | 8       | 16px   | 32px          |
| `lg`       | 1056px    | 16      | 16px   | 32px          |
| `xlg`      | 1312px    | 16      | 16px   | 32px          |
| `max`      | 1584px    | 16      | 24px   | 32px          |

Key points:

- `sm` and `md` have fewer columns (4 and 8) — column spans must account for this
- A full-width column requires `sm={4} md={8} lg={16}`
- Columns at `lg`/`xlg`/`max` share the same 16-column grid

### Grid Modes

Three gutter modes control spacing between columns:

| Mode          | Gutter Size | Use Case                                     |
| ------------- | ----------- | -------------------------------------------- |
| **Wide**      | 32px        | Default. 16px padding on each side of column |
| **Narrow**    | 16px        | Drops the leading 16px margin                |
| **Condensed** | 1px         | Tight layouts like data tables, cards        |

CSS custom properties:

- `--cds-grid-gutter`: Overall gutter (32px wide, 1px condensed)
- `--cds-grid-gutter-start` / `--cds-grid-gutter-end`: Per-side gutter
- `--cds-grid-columns`: Column count
- `--cds-grid-margin`: Grid margin

### Subgrid

A `Grid` nested inside a `Column` becomes a subgrid, inheriting column definitions from the parent. Subgrids can have their own gutter mode.

```svelte
<Grid>
  <Row>
    <Column lg={8}>
      <Grid narrow>
        <Row>
          <Column lg={4}>Nested narrow</Column>
          <Column lg={4}>Nested narrow</Column>
        </Row>
      </Grid>
    </Column>
  </Row>
</Grid>
```

## Grid / Row / Column

Import: `import { Grid, Row, Column } from "carbon-components-svelte"`

### Grid Props

| Prop            | Type      | Default | Description                                  |
| --------------- | --------- | ------- | -------------------------------------------- |
| `as`            | `boolean` | `false` | Render a custom HTML element via slot        |
| `condensed`     | `boolean` | `false` | 1px gutter between columns                   |
| `narrow`        | `boolean` | `false` | 16px gutter (drops leading margin)           |
| `fullWidth`     | `boolean` | `false` | Remove default max-width, span full viewport |
| `noGutter`      | `boolean` | `false` | Remove all gutters                           |
| `noGutterLeft`  | `boolean` | `false` | Remove left gutter only                      |
| `noGutterRight` | `boolean` | `false` | Remove right gutter only                     |
| `padding`       | `boolean` | `false` | Add top/bottom padding to all columns        |

### Row Props

Same as Grid minus `fullWidth`:

| Prop            | Type      | Default |
| --------------- | --------- | ------- |
| `as`            | `boolean` | `false` |
| `condensed`     | `boolean` | `false` |
| `narrow`        | `boolean` | `false` |
| `noGutter`      | `boolean` | `false` |
| `noGutterLeft`  | `boolean` | `false` |
| `noGutterRight` | `boolean` | `false` |
| `padding`       | `boolean` | `false` |

Row-level `condensed`/`narrow` override the Grid-level mode for that row only.

### Column Props

| Prop            | Type                                                            | Default     |
| --------------- | --------------------------------------------------------------- | ----------- |
| `as`            | `boolean`                                                       | `false`     |
| `noGutter`      | `boolean`                                                       | `false`     |
| `noGutterLeft`  | `boolean`                                                       | `false`     |
| `noGutterRight` | `boolean`                                                       | `false`     |
| `padding`       | `boolean`                                                       | `false`     |
| `aspectRatio`   | `"2x1" \| "16x9" \| "9x16" \| "1x2" \| "4x3" \| "3x4" \| "1x1"` | _undefined_ |
| `sm`            | `ColumnBreakpoint`                                              | _undefined_ |
| `md`            | `ColumnBreakpoint`                                              | _undefined_ |
| `lg`            | `ColumnBreakpoint`                                              | _undefined_ |
| `xlg`           | `ColumnBreakpoint`                                              | _undefined_ |
| `max`           | `ColumnBreakpoint`                                              | _undefined_ |

### Column Typedefs

```ts
type ColumnSize = boolean | number;
type ColumnSizeDescriptor = { span?: ColumnSize; offset: number };
type ColumnBreakpoint = ColumnSize | ColumnSizeDescriptor;
```

- **number**: Column spans that many grid columns (e.g., `sm={4}` = full width on mobile)
- **boolean**: `true` means column takes up remaining available space
- **object**: `{ span, offset }` for span + column offset (e.g., `lg={{ span: 8, offset: 4 }}`)

### Grid Examples

```svelte
<script>
  import { Grid, Row, Column } from "carbon-components-svelte";
</script>

<!-- Responsive sidebar + main layout -->
<Grid>
  <Row>
    <Column sm={4} md={2} lg={4} xlg={3}>
      Sidebar (full on mobile, narrow on desktop)
    </Column>
    <Column sm={4} md={6} lg={12} xlg={13}>
      Main content
    </Column>
  </Row>
</Grid>

<!-- Centered content with offset -->
<Grid>
  <Row>
    <Column sm={4} md={{ span: 6, offset: 1 }} lg={{ span: 8, offset: 4 }}>
      Centered content block
    </Column>
  </Row>
</Grid>

<!-- Three equal columns (responsive) -->
<Grid>
  <Row>
    <Column sm={4} md={4} lg={5}>Card 1</Column>
    <Column sm={4} md={4} lg={5}>Card 2</Column>
    <Column sm={4} md={8} lg={6}>Card 3</Column>
  </Row>
</Grid>

<!-- Condensed grid for data-dense layouts -->
<Grid condensed>
  <Row>
    <Column lg={4}>Tight card</Column>
    <Column lg={4}>Tight card</Column>
    <Column lg={4}>Tight card</Column>
    <Column lg={4}>Tight card</Column>
  </Row>
</Grid>

<!-- Narrow grid (content-heavy) -->
<Grid narrow>
  <Row>
    <Column lg={8}>Article text</Column>
    <Column lg={8}>Related content</Column>
  </Row>
</Grid>

<!-- Full width (edge to edge, no max-width) -->
<Grid fullWidth>
  <Row>
    <Column>Full viewport width content</Column>
  </Row>
</Grid>

<!-- Mixed grid modes per row -->
<Grid>
  <Row>
    <Column lg={16}>Wide row (default 32px gutter)</Column>
  </Row>
  <Row condensed>
    <Column lg={8}>Condensed row (1px gutter)</Column>
    <Column lg={8}>Condensed row</Column>
  </Row>
  <Row narrow>
    <Column lg={16}>Narrow row (16px gutter)</Column>
  </Row>
</Grid>

<!-- Aspect ratio columns -->
<Grid>
  <Row>
    <Column lg={4} aspectRatio="1x1">Square</Column>
    <Column lg={4} aspectRatio="16x9">Widescreen</Column>
    <Column lg={4} aspectRatio="4x3">Standard</Column>
    <Column lg={4} aspectRatio="2x1">Wide</Column>
  </Row>
</Grid>
```

### Common Layout Patterns

**App shell (header + sidebar + content):**

```svelte
<script>
  import { Grid, Row, Column, Content } from "carbon-components-svelte";
</script>

<Content>
  <Grid>
    <Row>
      <Column sm={4} md={8} lg={16}>
        <h1>Page Title</h1>
      </Column>
    </Row>
    <Row>
      <Column sm={4} md={2} lg={4}>
        <!-- Side navigation or filters -->
      </Column>
      <Column sm={4} md={6} lg={12}>
        <!-- Main page content -->
      </Column>
    </Row>
  </Grid>
</Content>
```

**Dashboard cards:**

```svelte
<Grid condensed>
  <Row>
    {#each metrics as metric}
      <Column sm={4} md={4} lg={4}>
        <Tile>{metric.label}: {metric.value}</Tile>
      </Column>
    {/each}
  </Row>
</Grid>
```

## AspectRatio

Import: `import { AspectRatio } from "carbon-components-svelte"`

| Prop    | Type                                                                              | Default |
| ------- | --------------------------------------------------------------------------------- | ------- |
| `ratio` | `"2x1" \| "2x3" \| "16x9" \| "4x3" \| "1x1" \| "3x4" \| "3x2" \| "9x16" \| "1x2"` | `"2x1"` |

```svelte
<script>
  import { AspectRatio } from "carbon-components-svelte";
</script>

<AspectRatio ratio="16x9">
  <img src="hero.jpg" alt="Hero" style="width: 100%; height: 100%; object-fit: cover;" />
</AspectRatio>
```

## Breakpoint

Import: `import { Breakpoint } from "carbon-components-svelte"`

Reactive component that reports the current viewport breakpoint.

| Prop               | Type                              | Default                                                       |
| ------------------ | --------------------------------- | ------------------------------------------------------------- |
| `size` (Reactive)  | `BreakpointSize`                  | _undefined_                                                   |
| `sizes` (Reactive) | `Record<BreakpointSize, boolean>` | `{ sm: false, md: false, lg: false, xlg: false, max: false }` |

### Typedefs

```ts
type BreakpointSize = "sm" | "md" | "lg" | "xlg" | "max";
type BreakpointValue = 320 | 672 | 1056 | 1312 | 1584;
```

**Dispatched events:** `on:change` -> `{ size: BreakpointSize; breakpointValue: BreakpointValue }`

```svelte
<script>
  import { Breakpoint } from "carbon-components-svelte";
  let size;
</script>

<Breakpoint bind:size on:change={(e) => console.log(e.detail.size)} />

{#if size === "sm"}
  <p>Mobile layout</p>
{:else if size === "md"}
  <p>Tablet layout</p>
{:else}
  <p>Desktop layout</p>
{/if}
```

### breakpointObserver

Programmatic alternative (no component needed):

```svelte
<script>
  import { breakpointObserver } from "carbon-components-svelte";

  const breakpoint = breakpointObserver();
  // $breakpoint.size -> "sm" | "md" | "lg" | "xlg" | "max"
</script>
```

## Stack

Import: `import { Stack } from "carbon-components-svelte"`

Flexbox-based layout component for spacing children.

| Prop          | Type                                                                                  | Default      |
| ------------- | ------------------------------------------------------------------------------------- | ------------ |
| `gap`         | `StackScale \| string`                                                                | `1`          |
| `orientation` | `"vertical" \| "horizontal"`                                                          | `"vertical"` |
| `align`       | `"start" \| "center" \| "end" \| "stretch" \| "baseline"`                             | `"stretch"`  |
| `justify`     | `"start" \| "center" \| "end" \| "space-between" \| "space-around" \| "space-evenly"` | `"start"`    |
| `inline`      | `boolean`                                                                             | `false`      |
| `tag`         | `keyof HTMLElementTagNameMap`                                                         | `"div"`      |

```ts
type StackScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
```

Gap values map to Carbon spacing tokens (multiples of the 8px mini unit):

| Scale | Size | Scale | Size  |
| ----- | ---- | ----- | ----- |
| 0     | 0    | 7     | 32px  |
| 1     | 2px  | 8     | 40px  |
| 2     | 4px  | 9     | 48px  |
| 3     | 8px  | 10    | 64px  |
| 4     | 12px | 11    | 80px  |
| 5     | 16px | 12    | 96px  |
| 6     | 24px | 13    | 160px |

```svelte
<script>
  import { Stack, Button } from "carbon-components-svelte";
</script>

<!-- Horizontal button group -->
<Stack gap={5} orientation="horizontal">
  <Button kind="secondary">Cancel</Button>
  <Button kind="primary">Save</Button>
</Stack>

<!-- Vertical form fields -->
<Stack gap={6}>
  <TextInput labelText="Name" />
  <TextInput labelText="Email" />
  <Button>Submit</Button>
</Stack>
```

## Heading / Section

Import: `import { Heading, Section } from "carbon-components-svelte"`

Provides semantic heading level management. Section increments heading levels automatically.

**Section props:**

| Prop    | Type                          | Default     |
| ------- | ----------------------------- | ----------- |
| `level` | `1 \| 2 \| 3 \| 4 \| 5 \| 6`  | `1`         |
| `tag`   | `keyof HTMLElementTagNameMap` | `"section"` |

```svelte
<script>
  import { Heading, Section } from "carbon-components-svelte";
</script>

<Section>
  <Heading>H1 heading</Heading>
  <Section>
    <Heading>H2 heading</Heading>
    <Section>
      <Heading>H3 heading</Heading>
    </Section>
  </Section>
</Section>
```
