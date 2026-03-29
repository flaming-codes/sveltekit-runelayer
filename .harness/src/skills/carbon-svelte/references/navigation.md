# Navigation Components

## UIShell (Header, SideNav, Content)

Import: `import { Header, HeaderNav, HeaderNavItem, HeaderNavMenu, HeaderAction, HeaderActionLink, HeaderSearch, HeaderUtilities, HeaderPanelDivider, HeaderPanelLink, HeaderPanelLinks, SideNav, SideNavItems, SideNavLink, SideNavMenu, SideNavMenuItem, Content, SkipToContent } from "carbon-components-svelte"`

### Header Props

| Prop                       | Type                        | Default     |
| -------------------------- | --------------------------- | ----------- |
| `isSideNavOpen` (Reactive) | `boolean`                   | `false`     |
| `ref` (Reactive)           | `null \| HTMLAnchorElement` | `null`      |
| `expandedByDefault`        | `boolean`                   | `true`      |
| `uiShellAriaLabel`         | `string`                    | _undefined_ |
| `href`                     | `string`                    | _undefined_ |
| `companyName`              | `string`                    | _undefined_ |
| `platformName`             | `string`                    | `""`        |
| `persistentHamburgerMenu`  | `boolean`                   | `false`     |
| `expansionBreakpoint`      | `number`                    | `1056`      |
| `iconMenu`                 | `Icon`                      | `Menu`      |
| `iconClose`                | `Icon`                      | `Close`     |
| `ariaLabelMenu`            | `string`                    | _undefined_ |

**Slots:** `default`, `company`, `platform`, `skipToContent`

### HeaderNav Props

Wraps navigation items in the header.

### HeaderNavItem Props

| Prop             | Type                        | Default     |
| ---------------- | --------------------------- | ----------- |
| `ref` (Reactive) | `null \| HTMLAnchorElement` | `null`      |
| `href`           | `string`                    | _undefined_ |
| `text`           | `string`                    | _undefined_ |
| `isSelected`     | `boolean`                   | `false`     |

### HeaderNavMenu Props

| Prop                  | Type                        | Default     |
| --------------------- | --------------------------- | ----------- |
| `expanded` (Reactive) | `boolean`                   | `false`     |
| `ref` (Reactive)      | `null \| HTMLAnchorElement` | `null`      |
| `href`                | `string`                    | `"/"`       |
| `text`                | `string`                    | _undefined_ |

### HeaderAction Props

| Prop                         | Type                           | Default             |
| ---------------------------- | ------------------------------ | ------------------- |
| `isOpen` (Reactive)          | `boolean`                      | `false`             |
| `ref` (Reactive)             | `null \| HTMLButtonElement`    | `null`              |
| `icon`                       | `Icon`                         | `Switcher`          |
| `closeIcon`                  | `Icon`                         | `Close`             |
| `text`                       | `string`                       | _undefined_         |
| `iconDescription`            | `string`                       | _undefined_         |
| `tooltipAlignment`           | `"start" \| "center" \| "end"` | _undefined_         |
| `transition`                 | `false \| SlideParams`         | `{ duration: 200 }` |
| `preventCloseOnClickOutside` | `boolean`                      | `false`             |

### HeaderSearch Props

| Prop                             | Type                                | Default |
| -------------------------------- | ----------------------------------- | ------- |
| `value` (Reactive)               | `string`                            | `""`    |
| `active` (Reactive)              | `boolean`                           | `false` |
| `ref` (Reactive)                 | `null \| HTMLInputElement`          | `null`  |
| `selectedResultIndex` (Reactive) | `number`                            | `0`     |
| `results`                        | `ReadonlyArray<HeaderSearchResult>` | `[]`    |

```ts
type HeaderSearchResult = { href: string; text: string; description?: string };
```

**Dispatched events:** `on:active`, `on:clear`, `on:inactive`, `on:select` -> `{ value, selectedResultIndex, selectedResult }`

### SideNav Props

| Prop                  | Type      | Default     |
| --------------------- | --------- | ----------- |
| `isOpen` (Reactive)   | `boolean` | `false`     |
| `fixed`               | `boolean` | `false`     |
| `rail`                | `boolean` | `false`     |
| `ariaLabel`           | `string`  | _undefined_ |
| `expansionBreakpoint` | `number`  | `1056`      |

**Dispatched events:** `on:click:overlay`, `on:close`, `on:open`

### SideNavLink Props

| Prop             | Type                        | Default     |
| ---------------- | --------------------------- | ----------- |
| `ref` (Reactive) | `null \| HTMLAnchorElement` | `null`      |
| `isSelected`     | `boolean`                   | `false`     |
| `href`           | `string`                    | _undefined_ |
| `text`           | `string`                    | _undefined_ |
| `icon`           | `Icon`                      | _undefined_ |

### SideNavMenu / SideNavMenuItem Props

**SideNavMenu:** `expanded` (Reactive, false), `ref` (Reactive), `text`, `icon` (Icon)
**SideNavMenuItem:** `ref` (Reactive), `isSelected` (boolean, false), `href`, `text`

### Content / SkipToContent Props

**Content:** `id` (string, `"main-content"`)
**SkipToContent:** `href` (string, `"#main-content"`), `tabindex` (string, `"0"`)

### Full Shell Example

```svelte
<script>
  import {
    Header, HeaderNav, HeaderNavItem, HeaderUtilities, HeaderAction,
    HeaderPanelLinks, HeaderPanelLink, HeaderPanelDivider,
    SideNav, SideNavItems, SideNavLink, SideNavMenu, SideNavMenuItem,
    Content, SkipToContent
  } from "carbon-components-svelte";
  import Dashboard from "carbon-icons-svelte/lib/Dashboard.svelte";
  import UserAvatar from "carbon-icons-svelte/lib/UserAvatar.svelte";

  let isSideNavOpen = false;
</script>

<Header companyName="Acme" platformName="Dashboard" bind:isSideNavOpen>
  <svelte:fragment slot="skipToContent">
    <SkipToContent />
  </svelte:fragment>
  <HeaderNav>
    <HeaderNavItem href="/dashboard" text="Dashboard" />
    <HeaderNavItem href="/reports" text="Reports" />
  </HeaderNav>
  <HeaderUtilities>
    <HeaderAction icon={UserAvatar}>
      <HeaderPanelLinks>
        <HeaderPanelDivider>Account</HeaderPanelDivider>
        <HeaderPanelLink href="/profile">Profile</HeaderPanelLink>
        <HeaderPanelLink href="/logout">Logout</HeaderPanelLink>
      </HeaderPanelLinks>
    </HeaderAction>
  </HeaderUtilities>
</Header>

<SideNav bind:isOpen={isSideNavOpen}>
  <SideNavItems>
    <SideNavLink icon={Dashboard} text="Dashboard" href="/dashboard" />
    <SideNavMenu text="Settings" icon={Dashboard}>
      <SideNavMenuItem text="General" href="/settings/general" />
      <SideNavMenuItem text="Security" href="/settings/security" />
    </SideNavMenu>
  </SideNavItems>
</SideNav>

<Content>
  <slot />
</Content>
```

## Breadcrumb

Import: `import { Breadcrumb, BreadcrumbItem } from "carbon-components-svelte"`

**Breadcrumb props:** `noTrailingSlash` (boolean, false), `skeleton` (boolean, false)
**BreadcrumbItem props:** `href` (string), `isCurrentPage` (boolean, false)

```svelte
<Breadcrumb noTrailingSlash>
  <BreadcrumbItem href="/">Home</BreadcrumbItem>
  <BreadcrumbItem href="/products">Products</BreadcrumbItem>
  <BreadcrumbItem isCurrentPage>Widget</BreadcrumbItem>
</Breadcrumb>
```

## Tabs / Tab / TabContent

Import: `import { Tabs, Tab, TabContent } from "carbon-components-svelte"`

### Tabs Props

| Prop                  | Type                       | Default               |
| --------------------- | -------------------------- | --------------------- |
| `selected` (Reactive) | `number`                   | `0`                   |
| `type`                | `"default" \| "container"` | `"default"`           |
| `autoWidth`           | `boolean`                  | `false`               |
| `fullWidth`           | `boolean`                  | `false`               |
| `iconDescription`     | `string`                   | `"Show menu options"` |
| `triggerHref`         | `string`                   | `"#"`                 |

### Tab Props

| Prop             | Type                        | Default        |
| ---------------- | --------------------------- | -------------- |
| `ref` (Reactive) | `null \| HTMLAnchorElement` | `null`         |
| `label`          | `string`                    | `""`           |
| `href`           | `string`                    | `"#"`          |
| `disabled`       | `boolean`                   | `false`        |
| `tabindex`       | `string`                    | `"0"`          |
| `id`             | `string`                    | auto-generated |
| `secondaryLabel` | `string`                    | `""`           |
| `icon`           | `Icon`                      | _undefined_    |

**Slots:** `default`, `secondaryChildren`

**Dispatched events (Tabs):** `on:change` -> `number`

```svelte
<Tabs bind:selected={tabIndex}>
  <Tab label="Overview" />
  <Tab label="Settings" />
  <Tab label="Advanced" />
  <svelte:fragment slot="content">
    <TabContent>Overview content</TabContent>
    <TabContent>Settings content</TabContent>
    <TabContent>Advanced content</TabContent>
  </svelte:fragment>
</Tabs>
```

## ContentSwitcher / Switch

Import: `import { ContentSwitcher, Switch } from "carbon-components-svelte"`

**ContentSwitcher props:** `selectedIndex` (Reactive, 0), `size` (`"sm" | "xl"`), `selectionMode` (`"automatic" | "manual"`, `"automatic"`)
**Switch props:** `selected` (Reactive, false), `ref` (Reactive), `text` (`"Provide text"`), `disabled` (false), `id`

```svelte
<ContentSwitcher bind:selectedIndex>
  <Switch text="Table" />
  <Switch text="Chart" />
  <Switch text="Map" />
</ContentSwitcher>
```

## Pagination

Import: `import { Pagination, PaginationNav } from "carbon-components-svelte"`

### Pagination Props

| Prop                    | Type                    | Default             |
| ----------------------- | ----------------------- | ------------------- |
| `page` (Reactive)       | `number`                | `1`                 |
| `pageSize` (Reactive)   | `number`                | `10`                |
| `totalItems`            | `number`                | `0`                 |
| `pageWindow`            | `number`                | `1000`              |
| `disabled`              | `boolean`               | `false`             |
| `forwardText`           | `string`                | `"Next page"`       |
| `backwardText`          | `string`                | `"Previous page"`   |
| `itemsPerPageText`      | `string`                | `"Items per page:"` |
| `pageInputDisabled`     | `boolean`               | `false`             |
| `pageSizeInputDisabled` | `boolean`               | `false`             |
| `pageSizes`             | `ReadonlyArray<number>` | `[10]`              |
| `dynamicPageSizes`      | `boolean`               | `false`             |
| `pagesUnknown`          | `boolean`               | `false`             |

**Dispatched events:** `on:change` -> `{ page?, pageSize? }`, `on:click:button--next` -> `{ page }`, `on:click:button--previous` -> `{ page }`, `on:update` -> `{ pageSize, page }`

**PaginationNav props:** `page` (Reactive, 1), `total` (10), `shown` (10), `loop` (false), `forwardText`, `backwardText`, `tooltipPosition`

```svelte
<Pagination
  bind:page
  bind:pageSize
  totalItems={100}
  pageSizes={[10, 25, 50]}
/>
```

## TreeView

Import: `import { TreeView } from "carbon-components-svelte"`

| Prop                     | Type                        | Default     |
| ------------------------ | --------------------------- | ----------- |
| `activeId` (Reactive)    | `Node["id"]`                | `""`        |
| `selectedIds` (Reactive) | `ReadonlyArray<Node["id"]>` | `[]`        |
| `expandedIds` (Reactive) | `ReadonlyArray<Node["id"]>` | `[]`        |
| `nodes`                  | `ReadonlyArray<Node>`       | `[]`        |
| `size`                   | `"default" \| "compact"`    | `"default"` |
| `labelText`              | `string`                    | `""`        |
| `hideLabel`              | `boolean`                   | `false`     |
| `autoCollapse`           | `boolean`                   | `false`     |
| `expandAll`              | `() => void`                | _undefined_ |
| `collapseAll`            | `() => void`                | _undefined_ |
| `expandNodes`            | `(filterNode?) => void`     | _undefined_ |
| `collapseNodes`          | `(filterNode?) => void`     | _undefined_ |
| `showNode`               | `(id, options?) => void`    | _undefined_ |

```ts
type TreeNode<Id = string | number> = {
  id: Id;
  text: any;
  icon?: any;
  disabled?: boolean;
  nodes?: TreeNode<Id>[];
};
type ShowNodeOptions = { expand?: boolean; select?: boolean; focus?: boolean };
```

**Dispatched events:** `on:focus`, `on:select`, `on:toggle` -- all with `Node & { expanded, leaf, selected }`

```svelte
<TreeView
  bind:activeId
  bind:selectedIds
  nodes={[
    { id: "1", text: "Documents", nodes: [
      { id: "1-1", text: "Report.pdf" },
      { id: "1-2", text: "Notes.md" },
    ]},
    { id: "2", text: "Images", nodes: [
      { id: "2-1", text: "Photo.jpg" },
    ]},
  ]}
  labelText="File browser"
/>
```
