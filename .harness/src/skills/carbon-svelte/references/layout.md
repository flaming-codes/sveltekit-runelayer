# Layout Components

## Grid / Row / Column

Import: `import { Grid, Row, Column } from "carbon-components-svelte"`

Carbon uses a 16-column grid system with responsive breakpoints.

### Grid Props

| Prop            | Type      | Default |
| --------------- | --------- | ------- |
| `as`            | `boolean` | `false` |
| `condensed`     | `boolean` | `false` |
| `narrow`        | `boolean` | `false` |
| `fullWidth`     | `boolean` | `false` |
| `noGutter`      | `boolean` | `false` |
| `noGutterLeft`  | `boolean` | `false` |
| `noGutterRight` | `boolean` | `false` |
| `padding`       | `boolean` | `false` |

### Row Props

Same as Grid minus `fullWidth`.

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

### Grid Examples

```svelte
<script>
  import { Grid, Row, Column } from "carbon-components-svelte";
</script>

<!-- Basic 3-column layout -->
<Grid>
  <Row>
    <Column sm={4} md={4} lg={5}>Sidebar</Column>
    <Column sm={4} md={4} lg={11}>Main content</Column>
  </Row>
</Grid>

<!-- With offset -->
<Grid>
  <Row>
    <Column lg={{ span: 8, offset: 4 }}>Centered content</Column>
  </Row>
</Grid>

<!-- Condensed grid (1px gutter) -->
<Grid condensed>
  <Row>
    <Column>Tight spacing</Column>
  </Row>
</Grid>

<!-- Narrow grid (16px left gutter) -->
<Grid narrow>
  <Row>
    <Column>Narrow spacing</Column>
  </Row>
</Grid>

<!-- Full width (no max-width) -->
<Grid fullWidth>
  <Row>
    <Column>Edge to edge</Column>
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
{:else}
  <p>Desktop layout</p>
{/if}
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

```svelte
<script>
  import { Stack, Button } from "carbon-components-svelte";
</script>

<Stack gap={5} orientation="horizontal">
  <Button>Cancel</Button>
  <Button kind="primary">Save</Button>
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
