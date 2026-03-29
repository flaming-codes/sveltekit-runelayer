# Setup & Configuration

## Installation

```sh
pnpm i carbon-components-svelte
# Optional packages:
pnpm i carbon-icons-svelte           # 2,600+ icons
pnpm i carbon-pictograms-svelte      # 1,500+ pictograms
pnpm i @carbon/charts-svelte          # 25+ charts (d3-powered)
pnpm i -D carbon-preprocess-svelte   # Preprocessors for optimization
```

## Ecosystem Packages

| Package                    | Description                           | GitHub                                                                                                                  |
| -------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `carbon-components-svelte` | 50+ UI components                     | [carbon-design-system/carbon-components-svelte](https://github.com/carbon-design-system/carbon-components-svelte)       |
| `carbon-icons-svelte`      | 2,600+ icons from IBM Design Language | [carbon-design-system/carbon-icons-svelte](https://github.com/carbon-design-system/carbon-icons-svelte)                 |
| `carbon-pictograms-svelte` | 1,500+ pictograms for illustrations   | [carbon-design-system/carbon-pictograms-svelte](https://github.com/carbon-design-system/carbon-pictograms-svelte)       |
| `@carbon/charts-svelte`    | 25+ chart types (d3-powered)          | [carbon-design-system/carbon-charts](https://github.com/carbon-design-system/carbon-charts/tree/master/packages/svelte) |
| `carbon-preprocess-svelte` | Bundle optimization preprocessors     | [carbon-design-system/carbon-preprocess-svelte](https://github.com/carbon-design-system/carbon-preprocess-svelte)       |

## CSS Theme Imports

Import ONE theme CSS file in your root layout (e.g., `+layout.svelte`):

```javascript
import "carbon-components-svelte/css/white.css"; // White theme
import "carbon-components-svelte/css/g10.css"; // Gray 10
import "carbon-components-svelte/css/g80.css"; // Gray 80
import "carbon-components-svelte/css/g90.css"; // Gray 90
import "carbon-components-svelte/css/g100.css"; // Gray 100
import "carbon-components-svelte/css/all.css"; // All themes (CSS variables, for dynamic switching)
```

## Optimization with carbon-preprocess-svelte

### SvelteKit svelte.config.js

```javascript
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { optimizeImports } from "carbon-preprocess-svelte";

export default {
  preprocess: [vitePreprocess(), optimizeImports()],
};
```

### Vite plugin for CSS tree-shaking (vite.config.js)

```javascript
import { sveltekit } from "@sveltejs/kit/vite";
import { optimizeCss } from "carbon-preprocess-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit(), optimizeCss()],
});
```

**What they do:**

- `optimizeImports()` - Rewrites barrel imports to direct component paths, reducing bundle size
- `optimizeCss()` - Tree-shakes unused CSS from the Carbon stylesheet

## Dynamic Theming

Use `all.css` and set the theme attribute on the document element:

```javascript
import "carbon-components-svelte/css/all.css";

// Switch theme at runtime:
document.documentElement.setAttribute("theme", "g90");
// Valid values: "white" | "g10" | "g80" | "g90" | "g100"
```

### Theme Component

```svelte
<script>
  import { Theme } from "carbon-components-svelte";
</script>

<!-- Render a toggle for dark mode -->
<Theme render="toggle" toggle={{ themes: ["white", "g100"], labelText: "Dark mode" }} />

<!-- Or a select dropdown -->
<Theme render="select" />

<!-- Or use programmatically -->
<Theme bind:theme on:update={(e) => console.log(e.detail)} />
```

**Theme props:**

| Prop               | Type                                                        | Default                                                 |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------- |
| `theme` (Reactive) | `"white" \| "g10" \| "g80" \| "g90" \| "g100"`              | `"white"`                                               |
| `tokens`           | `Tokens`                                                    | `{}`                                                    |
| `persist`          | `boolean`                                                   | `false`                                                 |
| `persistKey`       | `string`                                                    | `"theme"`                                               |
| `render`           | `"toggle" \| "select"`                                      | _undefined_                                             |
| `toggle`           | `{ themes: [CarbonTheme, CarbonTheme]; labelText: string }` | `{ themes: ["white", "g100"], labelText: "Dark mode" }` |
| `select`           | `{ themes: CarbonTheme[]; labelText: string }`              | `{ themes: themeKeys, labelText: "Themes" }`            |

**Dispatched events:** `on:update` -> `{ theme: CarbonTheme }`

## LocalStorage / SessionStorage

```svelte
<script>
  import { LocalStorage } from "carbon-components-svelte";
  let value = "default";
</script>

<LocalStorage key="my-key" bind:value />
```

| Prop               | Type         | Default               |
| ------------------ | ------------ | --------------------- |
| `value` (Reactive) | `T`          | `""`                  |
| `key`              | `string`     | `"local-storage-key"` |
| `clearItem`        | `() => void` | _undefined_           |
| `clearAll`         | `() => void` | _undefined_           |

**Dispatched events:** `on:save`, `on:update` -> `{ prevValue, value }`

SessionStorage has the same API but uses `sessionStorage`.

## Important Notes

- Components use `export let` (Svelte 4 style) -- do NOT set `runes: true` globally in svelte.config.js
- If using Rollup with DatePicker, specify `inlineDynamicImports: true`
- All components forward `$$restProps` to their root element
- IDs are auto-generated when not provided
