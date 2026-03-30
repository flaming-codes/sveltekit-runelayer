# Carbon Design System & UI Review

## Synopsis

The admin UI is genuinely Carbon-first now: the shell, dashboard, lists, editors, login, profile, health, and error states all use Carbon components and `--cds-*` tokens consistently, and the shared `page-layout.css` / `editor-layout.css` split keeps the repeated layout CSS under control. The remaining issues are mostly structural and product-level rather than visual bugs: `AdminPage.svelte` still acts as a manual router over an untyped `Record<string, any>` payload, `FieldRenderer.svelte` is a growing dispatch chain, and a few field widgets are still placeholders instead of first-class editors. This is a solid beta-quality admin surface, but it still needs a typed view contract and a cleaner field composition model before it feels mature.

## Grade: 8/10

## Main Content

### What is working well

- Carbon shell composition is strong in `packages/sveltekit-runelayer/src/admin/components/AdminLayout.svelte`, with `Header`, `SideNav`, `SkipToContent`, and `Theme` used in a way that matches the rest of the Carbon design language.
- The shared layout CSS in `packages/sveltekit-runelayer/src/admin/components/page-layout.css` and `packages/sveltekit-runelayer/src/admin/components/editor-layout.css` does real work. The old page-level duplication has been replaced with a cleaner shared foundation.
- `Dashboard.svelte`, `CollectionList.svelte`, `UsersList.svelte`, `CollectionEdit.svelte`, `GlobalEdit.svelte`, `Profile.svelte`, `Health.svelte`, `Login.svelte`, and `ErrorPage.svelte` all stay close to Carbon primitives instead of rebuilding common controls by hand.
- Token usage is mostly disciplined. The custom CSS relies heavily on `--cds-*` spacing, color, and typography tokens rather than hardcoded theme values.
- The user-facing interaction patterns are reasonable: `goto()` is used for pagination, destructive actions use Carbon `Modal`, breadcrumbs are present throughout, and the `ErrorPage` now uses Carbon `Button` instead of hand-rolled controls.
- Accessibility is better than the old report assumed. `SkipToContent`, descriptive action links, `role="menu"`/`role="menuitem"` on the user panel, and Carbon form controls all help keep the surface usable.

### What Still Hurts

- `packages/sveltekit-runelayer/src/sveltekit/AdminPage.svelte` remains the biggest maintainability hotspot in the UI layer. It manually switches on `data.view` and threads a wide, untyped payload into many child components.
- `packages/sveltekit-runelayer/src/admin/components/fields/FieldRenderer.svelte` still uses a long `if/else` chain to dispatch field types. That is fine for the current field set, but it does not scale cleanly as more field types are added.
- The admin form-state types are still loose. `CollectionEdit.svelte`, `GlobalEdit.svelte`, `CollectionList.svelte`, and `AdminPage.svelte` all lean on `Record<string, any>` in places where a narrower shape or a discriminated union would be safer.
- A few field widgets are still product placeholders rather than finished Carbon-native editors. `DateField.svelte` uses a native date/datetime input, `RelationshipField.svelte` is raw ID entry, and `JsonField.svelte` / `RichTextField.svelte` are textarea-based JSON editors.
- Some style overrides still reach into Carbon internals via `.bx--*` selectors and fixed measurements. That is acceptable in moderation, but it is more brittle than token-only styling or wrapper-class styling.
- `on:` event syntax still appears in the Carbon-bound controls that depend on `carbon-components-svelte`. That is understandable compatibility debt, but it is still legacy syntax in a Svelte 5 codebase.
- The custom user-panel menu in `AdminLayout.svelte` has the right ARIA labels, but it is still hand-built HTML rather than a Carbon menu primitive, so its keyboard behavior is easier to drift from the design system over time.

## Action Items

### Critical

- None.

### Medium

- Introduce a typed admin view contract for `packages/sveltekit-runelayer/src/sveltekit/AdminPage.svelte` and the corresponding load data. A discriminated union would remove the `Record<string, any>` escape hatch and make view changes safer.
- Replace the `FieldRenderer.svelte` `if/else` chain with a field-to-component map. The current pattern is correct, but it will become harder to reason about as new field types are added.
- Turn the date, relationship, and rich-text widgets into first-class UI decisions. Right now they are the least polished parts of the admin surface, and users will feel that gap first.

### Low

- Narrow `Record<string, any>` to `unknown` or a more specific state shape where practical, especially in `CollectionEdit.svelte` and `GlobalEdit.svelte`.
- Reduce the remaining `.bx--*` selector overrides in `Dashboard.svelte`, `Profile.svelte`, and `AdminLayout.svelte` if you want the UI layer to depend less on Carbon's internal DOM class names.
- Consider moving the custom user-panel markup in `AdminLayout.svelte` to a Carbon shell/menu primitive so keyboard behavior and styling stay aligned with the rest of the system.
- Keep tightening hardcoded dimensions and spacing toward Carbon tokens where the component API allows it. The current usage is good, but it is not yet fully token-complete.

### Recommendation

- Add component-level tests for the view router and field renderer. Those are the two places most likely to regress when the admin surface grows.
- Treat the remaining `on:` usage as compatibility debt and remove it once the Carbon wrapper layer exposes Svelte 5-native events consistently.
- Keep the placeholder field widgets explicit in the docs until they become real controls, so the UI stays honest about what is fully implemented and what is not.
