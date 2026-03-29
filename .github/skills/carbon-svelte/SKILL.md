---
name: carbon-svelte
# IMPORTANT: Keep description on ONE line for Claude Code compatibility
# prettier-ignore
description: Carbon Design System Svelte components. Use for IBM Carbon UI: buttons, forms, data tables, modals, navigation, layout grid, notifications, theming. Covers props, events, slots, and SvelteKit integration.
---

# Carbon Components Svelte

## Quick Start

**Install:** `pnpm i carbon-components-svelte carbon-icons-svelte`
**CSS:** `import "carbon-components-svelte/css/g90.css";`
**Optimize:** `carbon-preprocess-svelte` for tree-shaking

## Example

```svelte
<script>
  import { Button, TextInput, Form } from "carbon-components-svelte";
  import Add from "carbon-icons-svelte/lib/Add.svelte";

  let name = "";
</script>

<Form on:submit={(e) => { e.preventDefault(); console.log(name); }}>
  <TextInput bind:value={name} labelText="Name" placeholder="Enter name" />
  <Button type="submit" icon={Add}>Submit</Button>
</Form>
```

## Reference Files

- [setup.md](references/setup.md) - Installation, themes, optimization, SvelteKit config
- [layout.md](references/layout.md) - Grid, Row, Column, AspectRatio, Breakpoint, Stack
- [forms.md](references/forms.md) - TextInput, Select, Checkbox, RadioButton, DatePicker, etc.
- [navigation.md](references/navigation.md) - Header, SideNav, Breadcrumb, Tabs, Pagination
- [data-display.md](references/data-display.md) - DataTable, Accordion, Tag, Tile, StructuredList
- [feedback.md](references/feedback.md) - Modal, Notification, Loading, ProgressIndicator, Tooltip
- [actions.md](references/actions.md) - Button, Link, OverflowMenu, CopyButton
- [icons.md](references/icons.md) - carbon-icons-svelte, pictograms, and charts

## Notes

- Use `carbon-preprocess-svelte` optimizeImports + optimizeCss for production
- Dynamic theming requires `all.css` + theme attribute on documentElement
- Components use `export let` (Svelte 4 style) - do NOT set `runes: true` globally
- **Last verified:** 2026-03-29
