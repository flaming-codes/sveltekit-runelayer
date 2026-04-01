# Carbon Icons Svelte

GitHub: [carbon-design-system/carbon-icons-svelte](https://github.com/carbon-design-system/carbon-icons-svelte)

## Installation

```sh
pnpm i carbon-icons-svelte
```

The package contains 2,600+ icons from the IBM Design Language.

## Import Patterns

### Direct Import (recommended)

```svelte
<script>
  import Add from "carbon-icons-svelte/lib/Add.svelte";
  import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
  import Edit from "carbon-icons-svelte/lib/Edit.svelte";
  import Close from "carbon-icons-svelte/lib/Close.svelte";
  import Menu from "carbon-icons-svelte/lib/Menu.svelte";
  import Search from "carbon-icons-svelte/lib/Search.svelte";
  import ChevronDown from "carbon-icons-svelte/lib/ChevronDown.svelte";
  import ChevronRight from "carbon-icons-svelte/lib/ChevronRight.svelte";
  import Information from "carbon-icons-svelte/lib/Information.svelte";
  import Warning from "carbon-icons-svelte/lib/Warning.svelte";
  import Checkmark from "carbon-icons-svelte/lib/Checkmark.svelte";
  import Download from "carbon-icons-svelte/lib/Download.svelte";
  import Upload from "carbon-icons-svelte/lib/Upload.svelte";
  import Settings from "carbon-icons-svelte/lib/Settings.svelte";
  import UserAvatar from "carbon-icons-svelte/lib/UserAvatar.svelte";
  import Dashboard from "carbon-icons-svelte/lib/Dashboard.svelte";
  import Document from "carbon-icons-svelte/lib/Document.svelte";
  import Folder from "carbon-icons-svelte/lib/Folder.svelte";
  import Copy from "carbon-icons-svelte/lib/Copy.svelte";
  import Filter from "carbon-icons-svelte/lib/Filter.svelte";
  import ArrowRight from "carbon-icons-svelte/lib/ArrowRight.svelte";
  import Launch from "carbon-icons-svelte/lib/Launch.svelte";
  import Notification from "carbon-icons-svelte/lib/Notification.svelte";
  import OverflowMenuVertical from "carbon-icons-svelte/lib/OverflowMenuVertical.svelte";
</script>
```

### Sized Variants

Icons come in 16, 20, 24, and 32px variants. Default is 16.

```svelte
<script>
  // Default size (16px) - no suffix
  import Add from "carbon-icons-svelte/lib/Add.svelte";

  // Specific sizes - append size number
  import Add20 from "carbon-icons-svelte/lib/Add20.svelte";
  import Add24 from "carbon-icons-svelte/lib/Add24.svelte";
  import Add32 from "carbon-icons-svelte/lib/Add32.svelte";
</script>
```

## Usage

### Standalone Icon

```svelte
<script>
  import Information from "carbon-icons-svelte/lib/Information.svelte";
</script>

<Information />
```

### Custom Size via Style

```svelte
<Information style="width: 2rem; height: 2rem;" />
```

### Custom Color

Icons inherit `currentColor` by default. Override with CSS:

```svelte
<!-- Inherits parent text color -->
<span style="color: red;">
  <Warning />
</span>

<!-- Direct fill override -->
<Warning style="fill: orange;" />
```

### With Buttons

```svelte
<script>
  import { Button } from "carbon-components-svelte";
  import Add from "carbon-icons-svelte/lib/Add.svelte";
  import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
</script>

<!-- Button with icon and text -->
<Button icon={Add}>Add item</Button>

<!-- Icon-only button (requires iconDescription for accessibility) -->
<Button icon={TrashCan} iconDescription="Delete item" kind="danger-ghost" />
```

### With Navigation

```svelte
<script>
  import { SideNavLink, SideNavMenu } from "carbon-components-svelte";
  import Dashboard from "carbon-icons-svelte/lib/Dashboard.svelte";
  import Settings from "carbon-icons-svelte/lib/Settings.svelte";
</script>

<SideNavLink icon={Dashboard} text="Dashboard" href="/dashboard" />
<SideNavMenu icon={Settings} text="Settings">
  <!-- menu items -->
</SideNavMenu>
```

### With Tags

```svelte
<script>
  import { Tag } from "carbon-components-svelte";
  import Checkmark from "carbon-icons-svelte/lib/Checkmark.svelte";
</script>

<Tag icon={Checkmark} type="green">Verified</Tag>
```

### With Tabs

```svelte
<script>
  import { Tabs, Tab } from "carbon-components-svelte";
  import Dashboard from "carbon-icons-svelte/lib/Dashboard.svelte";
  import Settings from "carbon-icons-svelte/lib/Settings.svelte";
</script>

<Tabs>
  <Tab label="Dashboard" icon={Dashboard} />
  <Tab label="Settings" icon={Settings} />
</Tabs>
```

## Accessibility

- Icons are decorative by default (`aria-hidden="true"`)
- Add `aria-label` for standalone meaningful icons
- For icon-only buttons, always set `iconDescription` on the Button component

```svelte
<!-- Decorative (default) - no extra attributes needed -->
<Add />

<!-- Meaningful standalone icon -->
<Warning aria-label="Warning: action required" />
```

## Pictograms

GitHub: [carbon-design-system/carbon-pictograms-svelte](https://github.com/carbon-design-system/carbon-pictograms-svelte)

For larger illustrative icons, use `carbon-pictograms-svelte`:

```sh
pnpm i carbon-pictograms-svelte
```

```svelte
<script>
  import Globe from "carbon-pictograms-svelte/lib/Globe.svelte";
</script>

<Globe />
```

Pictograms are larger (typically 48x48 or 64x64) and meant for decorative/illustration purposes, not interactive UI elements.

## Charts

GitHub: [carbon-design-system/carbon-charts (Svelte)](https://github.com/carbon-design-system/carbon-charts/tree/master/packages/svelte)

For data visualization, use `carbon-charts-svelte` (d3-powered):

```sh
pnpm i @carbon/charts-svelte
```

```svelte
<script>
  import { BarChartSimple } from "@carbon/charts-svelte";
  import "@carbon/charts/styles.css";

  const data = [
    { group: "Qty", value: 65000 },
    { group: "More", value: 29123 },
    { group: "Sold", value: 35213 },
  ];
  const options = {
    title: "Simple bar chart",
    axes: { left: { mapsTo: "value" }, bottom: { mapsTo: "group", scaleType: "labels" } },
    height: "400px",
  };
</script>

<BarChartSimple {data} {options} />
```

Supports 25+ chart types including bar, line, area, pie, donut, scatter, radar, treemap, and more.

## Common Icon Names Reference

| Category   | Icons                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Actions    | `Add`, `Edit`, `TrashCan`, `Save`, `Copy`, `Download`, `Upload`, `Close`, `Undo`, `Redo`                               |
| Navigation | `Menu`, `ChevronDown`, `ChevronRight`, `ChevronLeft`, `ChevronUp`, `ArrowRight`, `ArrowLeft`, `Launch`, `Home`         |
| Status     | `Checkmark`, `CheckmarkFilled`, `Warning`, `WarningFilled`, `Error`, `ErrorFilled`, `Information`, `InformationFilled` |
| Objects    | `Document`, `Folder`, `Image`, `Video`, `Calendar`, `Email`, `Phone`, `Location`                                       |
| User       | `UserAvatar`, `UserProfile`, `Group`, `Login`, `Logout`                                                                |
| Data       | `Dashboard`, `Analytics`, `ChartBar`, `DataTable`, `Filter`, `Search`, `Sort`                                          |
| UI         | `Settings`, `Notification`, `OverflowMenuVertical`, `OverflowMenuHorizontal`, `Draggable`, `View`, `ViewOff`           |
