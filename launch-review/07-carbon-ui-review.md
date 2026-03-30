# Carbon Design System & UI Review

## Synopsis

The admin UI makes disciplined use of Carbon components (Header, SideNav, DataTable, Tile, Grid, Form inputs) and consistently applies `--cds-*` design tokens throughout custom CSS. The architecture is clean and well-suited for a CMS shell. Key gaps are in accessibility (missing ARIA landmarks and labels on custom markup), the ErrorPage component bypassing Carbon Button entirely, and Svelte 5 legacy event syntax (`on:click`) used on Carbon components which will need migration. The demo site layout correctly uses Carbon shell components with reasonable fallback values.

## Grade: 7/10

## Component Inventory

| Component                   | Carbon Usage                                                          | Accessibility                                       | CSS Quality                                | Notes                                    |
| --------------------------- | --------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| AdminLayout.svelte          | Excellent - Header, SideNav, SkipToContent, Theme                     | Good - aria-label on SideNav, SkipToContent present | Excellent - all tokens                     | User panel is custom HTML, needs ARIA    |
| Dashboard.svelte            | Good - Grid, Row, Column, ClickableTile, Tag                          | Fair - no section aria-labels                       | Excellent - tokens + responsive            | Card grid well done                      |
| Login.svelte                | Good - TextInput, PasswordInput, Button, Tile, InlineNotification     | Fair - form lacks aria-describedby for errors       | Good - tokens used, some raw rem values    | Clean login flow                         |
| CollectionList.svelte       | Excellent - DataTable, Pagination, Toolbar, ToolbarSearch, Breadcrumb | Fair - table link text not descriptive              | Good - tokens + responsive                 | Pagination uses window.location.assign   |
| CollectionEdit.svelte       | Good - Grid, Tile, Breadcrumb, Button, Tag                            | Fair - delete confirm is window.confirm             | Good - tokens throughout                   | Two-column layout well executed          |
| GlobalEdit.svelte           | Good - Tile, Breadcrumb, Button                                       | OK - minimal custom markup                          | Good - tokens                              | Simpler variant of CollectionEdit        |
| Profile.svelte              | Good - Grid, Tile, Tag, Button                                        | Fair - avatar image has alt text                    | Good - tokens                              | Clean profile card                       |
| Health.svelte               | Good - Tile, Tag, Breadcrumb                                          | Fair - dl structure is semantic                     | Good - tokens                              | Simple status page                       |
| UsersList.svelte            | Good - DataTable, Pagination, Select, TextInput, Tag, Breadcrumb      | Fair - filter form lacks fieldset/legend            | Good - tokens + responsive                 | Filter form is custom, not Toolbar-based |
| UserEdit.svelte             | Good - Grid, Tile, TextInput, Select, Button                          | Fair - delete confirm is window.confirm             | Good - tokens                              | Mirrors CollectionEdit pattern           |
| ErrorPage.svelte            | Poor - no Carbon components used                                      | Poor - custom buttons lack focus styles             | Fair - tokens used but buttons hand-rolled | Should use Carbon Button                 |
| FieldRenderer.svelte        | N/A - orchestrator only                                               | N/A                                                 | N/A                                        | Clean dispatch pattern                   |
| TextField.svelte            | Good - TextInput                                                      | Good - inherits Carbon a11y                         | Clean                                      | Minimal wrapper                          |
| CheckboxField.svelte        | Good - Checkbox                                                       | Good - inherits Carbon a11y                         | Clean                                      | Minimal wrapper                          |
| NumberField.svelte          | Good - NumberInput                                                    | Good - inherits Carbon a11y                         | Clean                                      | Minimal wrapper                          |
| TextareaField.svelte        | Good - TextArea                                                       | Good - inherits Carbon a11y                         | Clean                                      | Minimal wrapper                          |
| SelectField.svelte          | Good - Select, SelectItem                                             | Good - inherits Carbon a11y                         | Clean                                      | Minimal wrapper                          |
| DateField.svelte            | Acceptable - TextInput with type=date                                 | Fair - no Carbon DatePicker                         | Clean                                      | Carbon DatePicker would be better        |
| JsonField.svelte            | Acceptable - TextArea                                                 | Fair - no JSON validation feedback                  | Clean                                      | Placeholder for richer editor            |
| RelationshipField.svelte    | Acceptable - TextInput                                                | Fair - raw ID input, no lookup                      | Clean                                      | Placeholder for relationship picker      |
| RichTextField.svelte        | Acceptable - TextArea                                                 | Fair - raw JSON textarea                            | Clean                                      | Placeholder for Tiptap                   |
| Demo +layout.svelte (site)  | Good - Header, HeaderNav, SideNav, Content, SkipToContent             | Good - SkipToContent present                        | Fair - fallback hex values in CSS          | Working site shell                       |
| Demo +layout.svelte (admin) | Minimal - just CSS import                                             | N/A                                                 | N/A                                        | Correct Carbon CSS import                |

## Detailed Analysis

### Carbon Component Usage

**Strengths:**

- The shell (AdminLayout) correctly uses `Header`, `SideNav`, `SideNavMenu`, `SideNavMenuItem`, `SideNavLink`, `SideNavDivider`, `HeaderUtilities`, `HeaderAction`, and `SkipToContent`. This is textbook Carbon UI Shell composition.
- `Theme` wrapper at line 83 of AdminLayout.svelte correctly sets the `g10` theme.
- `DataTable` in CollectionList.svelte and UsersList.svelte uses `sortable`, `Toolbar`, `ToolbarSearch`, `Pagination`, and the `cell` slot pattern correctly.
- `Grid`/`Row`/`Column` breakpoint props (`sm`, `md`, `lg`) are used consistently and with sensible values across Dashboard, CollectionEdit, UserEdit, and Profile.
- Form components (`TextInput`, `PasswordInput`, `NumberInput`, `TextArea`, `Select`, `Checkbox`) are used correctly with `id`, `name`, `labelText`, and `required` props.
- `InlineNotification` in Login.svelte properly sets `kind`, `title`, `subtitle`, `lowContrast`, and `hideCloseButton`.
- `Tag` component is used correctly for status indicators with appropriate `type` values.
- `Breadcrumb`/`BreadcrumbItem` is used on every sub-page with proper `isCurrentPage` and `noTrailingSlash`.

**Issues:**

1. `/packages/sveltekit-runelayer/src/admin/components/ErrorPage.svelte` (lines 146-178): Hand-rolled `<a>` and `<button>` elements styled to look like Carbon buttons. These miss focus ring styles, Carbon motion tokens, and Carbon's built-in disabled/loading states. Should use `Button` and `Button kind="secondary"` from Carbon.

2. `/packages/sveltekit-runelayer/src/admin/components/fields/DateField.svelte`: Uses `TextInput` with `type="date"` / `type="datetime-local"` instead of Carbon's `DatePicker` + `DatePickerInput`. The native browser date picker does not match the Carbon visual language and provides inconsistent UX across browsers.

3. `/packages/sveltekit-runelayer/src/admin/components/AdminLayout.svelte` (lines 103-139): The user panel dropdown content is entirely custom HTML. Carbon's `HeaderPanel` or `SwitcherDivider` could provide better structure, but more importantly the custom panel lacks `role="menu"` or `role="dialog"` and `aria-label` attributes for the navigation within it.

4. `/packages/sveltekit-runelayer/src/admin/components/CollectionList.svelte` (line 13): Imports `DataTableHeader` from `carbon-components-svelte/src/DataTable/DataTable.svelte` -- this is a deep internal import path. If the library restructures internals this breaks. The type should ideally be imported from the package root or re-declared locally.

5. `/packages/sveltekit-runelayer/src/admin/components/UsersList.svelte` (line 15): Same deep internal import for `DataTableHeader`.

6. **Svelte 5 event syntax**: Multiple components use `on:click`, `on:input`, `on:change` (the Svelte 4 legacy syntax). Carbon Components Svelte currently still emits Svelte 4-style events, so this works, but should be tracked for migration when carbon-components-svelte releases a Svelte 5 native version. Files affected: CollectionEdit.svelte:101, UserEdit.svelte:130, CollectionList.svelte:156/184, UsersList.svelte:160, JsonField.svelte:26, RichTextField.svelte:26.

### CSS Custom Properties & Theming

**Strengths:**

- Zero hardcoded hex colors in the admin package. Every color reference uses `--cds-*` tokens: `--cds-text-primary`, `--cds-text-secondary`, `--cds-text-on-color`, `--cds-layer-01`, `--cds-layer-02`, `--cds-layer-hover`, `--cds-border-subtle`, `--cds-link-primary`, `--cds-icon-secondary`, `--cds-support-error`, `--cds-support-warning`, `--cds-button-primary`, `--cds-button-primary-hover`, `--cds-button-secondary`, `--cds-ui-background`, `--cds-background`.
- Spacing uses `--cds-spacing-*` tokens consistently (02 through 09).
- Zero `!important` declarations across all admin components.
- The `rk-` prefix namespace prevents class collisions with host applications.

**Issues:**

1. `/packages/sveltekit-runelayer/src/admin/components/Login.svelte` (lines 98-99, 107-108, 138, 143): Uses raw `rem` values (`2rem`, `0.25rem`, `1.5rem`, `0.5rem`) for padding/gap/margin instead of `--cds-spacing-*` tokens. Inconsistent with the rest of the admin UI that uses spacing tokens.

2. `/packages/sveltekit-runelayer/src/admin/components/ErrorPage.svelte` (lines 58-59, 104-105, 143-144): Similarly uses raw `rem` values (`2rem`, `1rem`, `0.5rem`, `0.75rem`, `1.5rem`) instead of spacing tokens.

3. `/packages/sveltekit-runelayer/src/admin/components/AdminLayout.svelte` (line 201, 257): Uses raw `0.125rem`, `0.25rem`, etc. for the user panel instead of spacing tokens. The user panel is the one area with the most raw values.

4. **Global style selectors**: Several components use `:global(.bx--*)` selectors (AdminLayout lines 279-289, Dashboard lines 149-155, Profile lines 131-137) to override Carbon internals. While sometimes necessary, these are fragile -- the `bx--` prefix is Carbon v10. Carbon v11 uses `cds--` prefixes. If the library upgrades, all these selectors break.

5. The demo site layout (`apps/demo/src/routes/(site)/+layout.svelte`) provides hex fallback values in CSS custom properties (e.g., `var(--cds-text-secondary, #525252)`). This is acceptable practice for fallbacks, but the admin components never provide fallbacks. The inconsistency is minor since admin always loads within the Theme wrapper.

### Accessibility

**Strengths:**

- `SkipToContent` is present in AdminLayout.svelte, the primary a11y requirement for shell components.
- `SideNav` has `aria-label="Admin navigation"`.
- `Header` has `uiShellAriaLabel` set.
- Semantic HTML is used appropriately: `<section>`, `<nav>`, `<dl>`, `<h1>`/`<h2>` hierarchy.
- All form inputs have `labelText` props set.
- The `Content` component gets `id="main-content"` allowing skip-to-content to work.

**Issues:**

1. `/packages/sveltekit-runelayer/src/admin/components/AdminLayout.svelte` (lines 103-139): The user panel dropdown renders as a plain `<div>` with a `<nav>` inside. The panel should have `role="menu"` or be wrapped in a dialog-like pattern. The logout `<button>` and profile `<a>` inside it lack `role="menuitem"`.

2. `/packages/sveltekit-runelayer/src/admin/components/ErrorPage.svelte` (lines 46-48): The "Go back" button uses `onclick={() => history.back()}` which is fine for mouse users, but the button has no visible focus indicator in the CSS. Lines 167-178 define styles but omit `:focus` / `:focus-visible` rules for both buttons.

3. `/packages/sveltekit-runelayer/src/admin/components/CollectionList.svelte` (line 167): Table link text "Open" is generic. For screen readers, each "Open" link in the actions column is indistinguishable. Should include visually-hidden text like "Open {row.name}" or use `aria-label`.

4. `/packages/sveltekit-runelayer/src/admin/components/UsersList.svelte` (line 147): Same issue -- generic "Open" link text in actions column.

5. `/packages/sveltekit-runelayer/src/admin/components/CollectionEdit.svelte` (line 100) and `/packages/sveltekit-runelayer/src/admin/components/UserEdit.svelte` (line 129): Delete confirmation uses `window.confirm()` which blocks the main thread and provides no customization for assistive technology. A Carbon `Modal` with `danger` variant would be more accessible and consistent.

6. `/packages/sveltekit-runelayer/src/admin/components/Login.svelte`: When the `error` prop is set, the `InlineNotification` displays but the form fields lack `aria-describedby` linking them to the error message. Users relying on screen readers may not discover the error context.

7. No `lang` attribute is set anywhere in the admin components (this would typically be on the host page's `<html>` element, but worth noting).

### Responsive Design

**Strengths:**

- Most page components include a `@media (max-width: 672px)` breakpoint (Carbon's `sm` breakpoint) that adjusts padding and layout direction.
- CollectionList and UsersList title rows switch from `flex-direction: row` to `column` at mobile.
- UsersList filter fields stack vertically at mobile.
- Dashboard card grid uses Carbon `Column sm={2} md={4} lg={4}` for proper responsive behavior.
- CollectionEdit and UserEdit use `Column sm={4} md={8} lg={11}` + `lg={5}` for two-column layout that collapses on mobile.
- Max-width constraint (`90rem`) prevents ultra-wide stretching.

**Issues:**

1. The `672px` media query breakpoint is hardcoded rather than using a Carbon breakpoint mixin or variable. While Carbon Svelte does not expose breakpoint tokens as CSS custom properties, the value aligns with Carbon's `md` breakpoint, not `sm` (which is 320px). The naming is correct (targeting below `md`), but a comment would help.

2. `/packages/sveltekit-runelayer/src/admin/components/ErrorPage.svelte` uses `480px` as its breakpoint (line 181), which does not match any standard Carbon breakpoint. Carbon breakpoints are 320, 672, 1056, 1312, 1584.

3. The `SideNav` in AdminLayout uses `fixed={false}` which means it overlays content on mobile. This is correct behavior, but there is no explicit handling of the `isSideNavOpen` state on route change -- navigating via a SideNav link on mobile may leave the nav open.

4. No `lg` or `xlg` breakpoint media queries are used. The layout relies on `max-width: 90rem` and Carbon Grid for large screens, which is acceptable but means the page header padding never adjusts upward for very wide screens.

### Component Architecture (Svelte 5)

**Strengths:**

- All components correctly use Svelte 5 runes: `$props()`, `$state()`, `$derived()`, `$derived.by()`, `$effect()`.
- `$bindable()` is used correctly in field components to enable two-way binding from parent to child.
- `Snippet` type is properly imported and used for the `children` prop in AdminLayout.
- Props interfaces are well-typed with inline TypeScript type annotations on destructured props.
- Components follow a consistent pattern: script block with props/derived state, template, scoped styles.
- No unnecessary `$effect()` usage for things that can be `$derived`.

**Issues:**

1. `/packages/sveltekit-runelayer/src/admin/components/CollectionEdit.svelte` (lines 22-24) and `/packages/sveltekit-runelayer/src/admin/components/GlobalEdit.svelte` (lines 17-19): Both use `$effect` to sync `values` state from the `document` prop:

   ```
   let values = $state<Record<string, any>>({});
   $effect(() => { values = document ? { ...document } : {}; });
   ```

   This creates a reactive loop risk if `document` changes frequently. It also means `values` is reset on every `document` change, which could discard unsaved edits if the parent re-renders. A `$derived` would not work here since `values` is mutated by child fields via `bind:values`, but the pattern should guard against unnecessary resets (e.g., check if `document.id` changed).

2. `/packages/sveltekit-runelayer/src/admin/components/UserEdit.svelte` (lines 41-44): Same pattern with `$effect` for `role` state. Less risky since it is a single value, but the same concern applies.

3. `/packages/sveltekit-runelayer/src/admin/components/CollectionList.svelte` (lines 184-188) and `/packages/sveltekit-runelayer/src/admin/components/UsersList.svelte` (lines 160-164): Pagination uses `window.location.assign()` for navigation. In a SvelteKit app this causes a full page reload instead of client-side navigation. Should use `goto()` from `$app/navigation` or `<a>` tags.

4. The `FieldRenderer` component (FieldRenderer.svelte) uses a long `{#if}/{:else if}` chain for field type dispatch. This is functional but does not scale well. A component map pattern (`const fieldComponents = { text: TextField, ... }`) with `<svelte:component>` (or Svelte 5 `{@const Component = fieldComponents[field.type]}` + `<Component />`) would be more maintainable.

5. Type safety: Several components use `Record<string, any>` for document data (CollectionEdit line 17, GlobalEdit line 12, CollectionList line 24). This loses type checking at the component boundary. While unavoidable for a schema-driven CMS, the `any` could be narrowed to `unknown` to force explicit checks.

## Action Items

### Critical

- **ErrorPage.svelte: Replace hand-rolled buttons with Carbon `Button` component.** The custom buttons at lines 146-178 lack focus indicators, Carbon motion, and disabled state handling. This is an accessibility violation (WCAG 2.4.7 Focus Visible). File: `/packages/sveltekit-runelayer/src/admin/components/ErrorPage.svelte`.
- **ErrorPage.svelte: Add focus-visible styles** if keeping custom buttons (not recommended). At minimum add `:focus-visible { outline: 2px solid var(--cds-focus); outline-offset: -2px; }` to both button classes.

### Medium

- **Replace `window.location.assign()` with SvelteKit `goto()` in Pagination handlers.** Full page reloads on pagination are a poor UX -- they reset scroll position, flash the page, and lose any client-side state. Files: `/packages/sveltekit-runelayer/src/admin/components/CollectionList.svelte` line 187, `/packages/sveltekit-runelayer/src/admin/components/UsersList.svelte` line 163.
- **Add `role="menu"` / `role="menuitem"` attributes to the user panel dropdown** in AdminLayout.svelte (lines 103-139). The panel is triggered by `HeaderAction` but its contents lack ARIA menu semantics.
- **Replace `window.confirm()` with Carbon `Modal` (danger variant)** for delete confirmation in CollectionEdit.svelte line 101 and UserEdit.svelte line 130. Native confirm dialogs cannot be styled, are not theme-aware, and provide poor screen reader experience.
- **Use descriptive link text in DataTable action columns.** Change "Open" to include the row identifier via `aria-label={`Open ${row.name || row.id}`}` in CollectionList.svelte line 169 and UsersList.svelte line 147.
- **Guard `$effect` in CollectionEdit/GlobalEdit against unnecessary resets.** Compare `document.id` before overwriting `values` to prevent discarding unsaved user edits on parent re-renders.
- **Use Carbon `DatePicker` + `DatePickerInput`** instead of `TextInput type="date"` in DateField.svelte for consistent Carbon UX across browsers.

### Low

- **Migrate `:global(.bx--*)` selectors to also cover `cds--` prefix** or add a comment noting Carbon v10 dependency. Files: AdminLayout.svelte lines 279-289, Dashboard.svelte lines 149-155, Profile.svelte lines 131-137.
- **Replace raw `rem` values with `--cds-spacing-*` tokens** in Login.svelte and ErrorPage.svelte for full token consistency. Map: `2rem` -> `--cds-spacing-07`, `1.5rem` -> `--cds-spacing-06`, `1rem` -> `--cds-spacing-05`, `0.75rem` -> `--cds-spacing-04`, `0.5rem` -> `--cds-spacing-03`, `0.25rem` -> `--cds-spacing-02`.
- **Avoid deep internal imports** of `DataTableHeader` from `carbon-components-svelte/src/DataTable/DataTable.svelte`. Declare the type locally or import from a stable path. Files: CollectionList.svelte line 13, UsersList.svelte line 15.
- **Use `480px` -> `672px` or a standard Carbon breakpoint** in ErrorPage.svelte line 181 for consistency with the rest of the admin UI.
- **Normalize the Login.svelte spacing** to use `--cds-spacing-*` tokens in the form gap and wrapper padding.

### Recommendations

- **SideNav close on navigation:** Add a `beforeNavigate` or `afterNavigate` hook in AdminLayout to set `isSideNavOpen = false` on mobile route changes.
- **Dark theme toggle:** The admin currently hard-codes `g10` (light). Consider exposing a theme switcher using Carbon's `Theme` component with `g90`/`g100` options. The token-based CSS is already theme-ready.
- **Field component map:** Refactor FieldRenderer.svelte from an if/else chain to a component map for easier extensibility when adding new field types.
- **RelationshipField UX:** The current raw text input for document IDs is not user-friendly. Plan a lookup/search component using Carbon `ComboBox` or `Search` with async suggestions.
- **RichTextField UX:** The raw JSON textarea is a known placeholder. Prioritize Tiptap integration or similar editor for content editing usability.
- **Inline form validation:** Carbon form components support `invalid` and `invalidText` props. Wire these up to display field-level validation errors from server responses.
- **Loading states:** None of the form submissions show loading indicators. Use Carbon `Button`'s `disabled` prop or `InlineLoading` component during form submission.
- **Toast notifications:** After successful create/update/delete operations, show Carbon `ToastNotification` for user feedback rather than relying solely on page redirects.
