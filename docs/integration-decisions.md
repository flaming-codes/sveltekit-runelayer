# Integration Decisions

Research-validated library choices for Runekit CMS v1, with compatibility status, risks, and recommendations.

## Core Stack (Validated)

### Drizzle ORM + better-sqlite3

- **Status**: Fully compatible with SvelteKit 2 + Svelte 5 (server-only, framework-agnostic)
- **Versions**: `drizzle-orm@^0.45.2`, `better-sqlite3@^12.8.0`, `drizzle-kit@^0.31.10`
- **Notes**: `drizzle-kit` does not support Node 22's built-in `node:sqlite`. Stick with `better-sqlite3`. Enable WAL mode manually for concurrent reads.
- **Risk**: None for v1 scope

### Better Auth

- **Status**: First-class SvelteKit support, official Drizzle adapter with SQLite provider
- **Version**: `better-auth@^1.5.6`
- **Gotcha**: `BETTER_AUTH_SECRET` must be available at build time in SvelteKit (not just runtime). Set it in `.env` and CI/CD build environment.
- **Risk**: Low. Well-maintained (600+ commits, frequent releases).

## Admin UI Libraries

### Carbon Components Svelte

- **Status**: Works with Svelte 5 in backwards-compat mode (v0.103.x)
- **Version**: `carbon-components-svelte@^0.103.0`, `carbon-icons-svelte`
- **Critical**: Do NOT set `runes: true` globally in `svelte.config.js`. Carbon components use `export let` props internally. Svelte 5 auto-detects runes mode per-file, so your own rune-based components work fine alongside Carbon.
- **Risk**: Medium. Not rewritten for Svelte 5 runes internally; relies on compat mode.
- **Alternatives**: Skeleton UI (Svelte 5 native), shadcn-svelte (Svelte 5 native via Bits UI). Both require more design work but have better Svelte 5 alignment.

### TanStack Table

- **Status**: `@tanstack/svelte-table` v8 is **incompatible** with Svelte 5 (imports `svelte/internal` which is removed)
- **Workaround**: Use `@tanstack/table-core` directly with a thin custom Svelte 5 wrapper (~50-100 LOC). Well-documented community pattern.
- **Version**: `@tanstack/table-core@latest` (do NOT install `@tanstack/svelte-table`)
- **Risk**: Medium. v9 alpha has Svelte 5 adapter planned but no stable release yet.

### Superforms

- **Status**: Works with Svelte 5 in compat mode. Core uses Svelte stores, not runes.
- **Version**: `sveltekit-superforms` + `zod`
- **Critical**: Same `runes: true` restriction as Carbon — do not set globally.
- **Notes**: Form data returned as Svelte stores (`$form`), which feels non-idiomatic in rune-mode components. v3 milestone planned for native runes support.
- **Risk**: Medium. Functional but not idiomatic Svelte 5.

### Tiptap (Rich Text)

- **Status**: Tiptap core is framework-agnostic. Official Svelte guide targets Svelte 4.
- **Options**:
  1. **Direct Tiptap** (`@tiptap/core` + `@tiptap/starter-kit`): Full control, requires custom Svelte 5 wrapper using `$state()` + `createSubscriber()` (~30-50 LOC)
  2. **Tipex** (`tipex`): Built natively for Svelte 5 with runes and snippets. Wraps Tiptap internally.
- **Risk**: Medium. `svelte-tiptap` wrapper has open Svelte 5 compatibility issues.
- **Recommendation**: Use Tiptap core directly for maximum control, or Tipex for speed.

### Uppy (File Uploads)

- **Status**: Uppy 5.x has Svelte 5 headless components (`@uppy/svelte@^5.2.0`)
- **Critical**: Older `@uppy/svelte` versions (pre-5.0) break on Svelte 5
- **Alternative**: SvelteKit 2.49+ has native streaming file uploads in form actions. Evaluate whether Uppy's complexity is needed for v1.
- **Risk**: Low if using v5.x.

### svelte-dnd-action (Drag and Drop)

- **Status**: Updated for Svelte 5 runes mode. Uses Svelte actions (`use:dndzone`) which are stable across versions.
- **Version**: `svelte-dnd-action@latest`
- **Risk**: None

## Critical Decision: Global Runes Mode

**Do NOT set `runes: true` globally in `svelte.config.js`.**

Multiple libraries (Carbon, Superforms) break under global runes mode because they use `export let` props internally. Svelte 5 auto-detects runes usage per-file, so your own components can freely use `$state`, `$derived`, `$effect` without any configuration. This is the approach recommended by the Svelte team for mixed codebases.

The current `svelte.config.js` in `apps/web` correctly uses auto-detection based on file location (runes for non-node_modules files).

## Dependency Install Summary

```bash
# Already installed (v1 core)
drizzle-orm better-sqlite3 better-auth drizzle-kit

# Admin UI (install when needed)
pnpm add carbon-components-svelte carbon-icons-svelte
pnpm add @tanstack/table-core
pnpm add sveltekit-superforms zod
pnpm add @tiptap/core @tiptap/pm @tiptap/starter-kit  # or: pnpm add tipex
pnpm add svelte-dnd-action

# Uploads (evaluate native SvelteKit uploads first)
pnpm add @uppy/core @uppy/dashboard @uppy/svelte @uppy/tus
```

## Version Compatibility Matrix

| Library             | Svelte 5           | SvelteKit 2       | Runes Mode | Status     |
| ------------------- | ------------------ | ----------------- | ---------- | ---------- |
| Drizzle ORM         | N/A (server)       | Yes               | N/A        | Stable     |
| better-sqlite3      | N/A (server)       | Yes               | N/A        | Stable     |
| Better Auth         | Yes                | Yes (first-class) | N/A        | Stable     |
| Carbon Svelte       | Compat mode        | Yes               | No global  | Works      |
| TanStack Table v8   | **No**             | N/A               | N/A        | **Broken** |
| TanStack table-core | Yes (with wrapper) | Yes               | Yes        | Works      |
| Superforms          | Compat mode        | Yes               | No global  | Works      |
| Tiptap core         | Yes (with wrapper) | Yes               | Yes        | Works      |
| Tipex               | Yes (native)       | Yes               | Yes        | Works      |
| Uppy 5.x            | Yes                | Yes               | Yes        | Works      |
| svelte-dnd-action   | Yes                | Yes               | Yes        | Works      |
