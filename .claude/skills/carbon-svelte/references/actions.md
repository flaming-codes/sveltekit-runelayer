# Action Components

## Button / ButtonSet

Import: `import { Button, ButtonSet } from "carbon-components-svelte"`

### Button Props

| Prop               | Type                                                                                                   | Default     |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ----------- |
| `ref` (Reactive)   | `null \| HTMLAnchorElement \| HTMLButtonElement`                                                       | `null`      |
| `kind`             | `"primary" \| "secondary" \| "tertiary" \| "ghost" \| "danger" \| "danger-tertiary" \| "danger-ghost"` | `"primary"` |
| `size`             | `"default" \| "field" \| "small" \| "lg" \| "xl"`                                                      | `"default"` |
| `expressive`       | `boolean`                                                                                              | `false`     |
| `isSelected`       | `boolean`                                                                                              | `false`     |
| `icon`             | `Icon`                                                                                                 | _undefined_ |
| `iconDescription`  | `string`                                                                                               | _undefined_ |
| `tooltipAlignment` | `"start" \| "center" \| "end"`                                                                         | `"center"`  |
| `tooltipPosition`  | `"top" \| "right" \| "bottom" \| "left"`                                                               | `"bottom"`  |
| `hideTooltip`      | `boolean`                                                                                              | `false`     |
| `as`               | `boolean`                                                                                              | `false`     |
| `skeleton`         | `boolean`                                                                                              | `false`     |
| `disabled`         | `boolean`                                                                                              | `false`     |
| `href`             | `string`                                                                                               | _undefined_ |
| `tabindex`         | `string`                                                                                               | `"0"`       |
| `type`             | `string`                                                                                               | `"button"`  |

**Slots:** `default` (with render delegate `props`), `icon` (`{ style }`)
**Forwarded events:** `on:blur`, `on:click`, `on:focus`, `on:mouseenter`, `on:mouseleave`, `on:mouseover`

When `href` is set, renders as `<a>`. Otherwise renders as `<button>`.

### ButtonSet Props

| Prop      | Type      | Default |
| --------- | --------- | ------- |
| `stacked` | `boolean` | `false` |

### Examples

```svelte
<script>
  import { Button, ButtonSet } from "carbon-components-svelte";
  import Add from "carbon-icons-svelte/lib/Add.svelte";
  import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
</script>

<!-- Button kinds -->
<Button kind="primary">Primary</Button>
<Button kind="secondary">Secondary</Button>
<Button kind="tertiary">Tertiary</Button>
<Button kind="ghost">Ghost</Button>
<Button kind="danger">Danger</Button>
<Button kind="danger-tertiary">Danger Tertiary</Button>
<Button kind="danger-ghost">Danger Ghost</Button>

<!-- With icon -->
<Button icon={Add}>Add item</Button>

<!-- Icon-only button -->
<Button icon={TrashCan} iconDescription="Delete" kind="danger" />

<!-- As link -->
<Button href="/docs" kind="ghost">View docs</Button>

<!-- Sizes -->
<Button size="sm">Small</Button>
<Button size="field">Field</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>

<!-- Button set -->
<ButtonSet>
  <Button kind="secondary">Cancel</Button>
  <Button kind="primary">Save</Button>
</ButtonSet>

<!-- Stacked button set -->
<ButtonSet stacked>
  <Button kind="primary">Primary action</Button>
  <Button kind="secondary">Secondary action</Button>
</ButtonSet>

<!-- Disabled -->
<Button disabled>Cannot click</Button>

<!-- Submit form -->
<Button type="submit">Submit</Button>
```

## Link / OutboundLink

Import: `import { Link, OutboundLink } from "carbon-components-svelte"`

### Link Props

| Prop             | Type                        | Default     |
| ---------------- | --------------------------- | ----------- |
| `ref` (Reactive) | `null \| HTMLAnchorElement` | `null`      |
| `size`           | `"sm" \| "lg"`              | _undefined_ |
| `href`           | `string`                    | _undefined_ |
| `inline`         | `boolean`                   | `false`     |
| `icon`           | `Icon`                      | _undefined_ |
| `disabled`       | `boolean`                   | `false`     |
| `visited`        | `boolean`                   | `false`     |

**Slots:** `default`, `icon`

**OutboundLink:** Same as Link but automatically adds `target="_blank"` and `rel="noopener noreferrer"`, plus a launch icon.

```svelte
<Link href="/about">About us</Link>
<Link href="/docs" inline>inline link within text</Link>
<OutboundLink href="https://github.com">GitHub</OutboundLink>
```

## OverflowMenu / OverflowMenuItem

Import: `import { OverflowMenu, OverflowMenuItem } from "carbon-components-svelte"`

### OverflowMenu Props

| Prop               | Type                        | Default                            |
| ------------------ | --------------------------- | ---------------------------------- |
| `open` (Reactive)  | `boolean`                   | `false`                            |
| `ref` (Reactive)   | `null \| HTMLButtonElement` | `null`                             |
| `size`             | `"sm" \| "xl"`              | _undefined_                        |
| `direction`        | `"top" \| "bottom"`         | `"bottom"`                         |
| `light`            | `boolean`                   | `false`                            |
| `flipped`          | `boolean`                   | `false`                            |
| `menuOptionsClass` | `string`                    | _undefined_                        |
| `iconClass`        | `string`                    | _undefined_                        |
| `iconDescription`  | `string`                    | `"Open and close list of options"` |
| `id`               | `string`                    | auto-generated                     |
| `portalMenu`       | `boolean \| undefined`      | _undefined_                        |

**Slots:** `default`, `menu`
**Dispatched events:** `on:close` -> `{ index?, text? }`

### OverflowMenuItem Props

| Prop                      | Type                                             | Default          |
| ------------------------- | ------------------------------------------------ | ---------------- |
| `primaryFocus` (Reactive) | `boolean`                                        | `false`          |
| `ref` (Reactive)          | `null \| HTMLAnchorElement \| HTMLButtonElement` | `null`           |
| `text`                    | `string`                                         | `"Provide text"` |
| `href`                    | `string`                                         | `""`             |
| `target`                  | `string`                                         | _undefined_      |
| `rel`                     | `string`                                         | _undefined_      |
| `disabled`                | `boolean`                                        | `false`          |
| `hasDivider`              | `boolean`                                        | `false`          |
| `danger`                  | `boolean`                                        | `false`          |
| `requireTitle`            | `boolean`                                        | `true`           |
| `id`                      | `string`                                         | auto-generated   |

```svelte
<OverflowMenu>
  <OverflowMenuItem text="Edit" on:click={handleEdit} />
  <OverflowMenuItem text="Duplicate" on:click={handleDuplicate} />
  <OverflowMenuItem hasDivider danger text="Delete" on:click={handleDelete} />
</OverflowMenu>
```

## ContextMenu

Import: `import { ContextMenu, ContextMenuGroup, ContextMenuRadioGroup, ContextMenuOption } from "carbon-components-svelte"`

### ContextMenu Props

| Prop              | Type                                         | Default     |
| ----------------- | -------------------------------------------- | ----------- |
| `open` (Reactive) | `boolean`                                    | `false`     |
| `x` (Reactive)    | `number`                                     | `0`         |
| `y` (Reactive)    | `number`                                     | `0`         |
| `ref` (Reactive)  | `null \| HTMLUListElement`                   | `null`      |
| `target`          | `null \| ReadonlyArray<null \| HTMLElement>` | _undefined_ |

### ContextMenuGroup Props

| Prop                     | Type                    | Default     |
| ------------------------ | ----------------------- | ----------- |
| `selectedIds` (Reactive) | `ReadonlyArray<string>` | `[]`        |
| `labelText`              | `string`                | _undefined_ |

### ContextMenuRadioGroup Props

| Prop                    | Type     | Default     |
| ----------------------- | -------- | ----------- |
| `selectedId` (Reactive) | `string` | `""`        |
| `labelText`             | `string` | _undefined_ |

### ContextMenuOption Props

| Prop                    | Type                    | Default     |
| ----------------------- | ----------------------- | ----------- |
| `indented` (Reactive)   | `boolean`               | `false`     |
| `icon` (Reactive)       | `Icon`                  | _undefined_ |
| `selected` (Reactive)   | `boolean`               | `false`     |
| `selectable` (Reactive) | `boolean`               | `false`     |
| `ref` (Reactive)        | `null \| HTMLLIElement` | `null`      |
| `kind`                  | `"default" \| "danger"` | `"default"` |
| `disabled`              | `boolean`               | `false`     |
| `labelText`             | `string`                | `""`        |
| `shortcutText`          | `string`                | `""`        |

```svelte
<script>
  import { ContextMenu, ContextMenuOption, ContextMenuGroup, ContextMenuRadioGroup } from "carbon-components-svelte";
  let target;
</script>

<div bind:this={target}>Right-click me</div>

<ContextMenu {target}>
  <ContextMenuOption labelText="Cut" shortcutText="Cmd+X" />
  <ContextMenuOption labelText="Copy" shortcutText="Cmd+C" />
  <ContextMenuOption labelText="Paste" shortcutText="Cmd+V" />
  <ContextMenuOption kind="danger" labelText="Delete" />
</ContextMenu>
```

## CopyButton

Import: `import { CopyButton } from "carbon-components-svelte"`

| Prop              | Type                     | Default               |
| ----------------- | ------------------------ | --------------------- |
| `feedback`        | `string`                 | `"Copied!"`           |
| `feedbackTimeout` | `number`                 | `2000`                |
| `iconDescription` | `string`                 | `"Copy to clipboard"` |
| `text`            | `string`                 | _undefined_           |
| `copy`            | `(text: string) => void` | _undefined_           |
| `portalTooltip`   | `boolean \| undefined`   | _undefined_           |

**Dispatched events:** `on:copy`

```svelte
<CopyButton text="npm install carbon-components-svelte" />

<!-- Custom copy handler -->
<CopyButton
  text={apiKey}
  copy={(text) => navigator.clipboard.writeText(text)}
  feedback="API key copied!"
/>
```
