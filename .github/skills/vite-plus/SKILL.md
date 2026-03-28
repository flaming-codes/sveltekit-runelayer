---
name: vite-plus
description: Guidance for working with Vite+, the unified toolchain for web development that consolidates Vite, Vitest, Oxlint, Oxfmt, Rolldown, tsdown, and Vite Task into a single CLI (`vp`).
---

# Vite+

Vite+ is **The Unified Toolchain for the Web** — a single CLI (`vp`) that replaces the fragmented ecosystem of separate tools (Vite, Vitest, ESLint, Prettier, lint-staged, etc.) with an integrated, zero-configuration platform. It is developed by VoidZero and is MIT-licensed.

## Core Tooling Bundled

| Tool            | Purpose                                       |
| --------------- | --------------------------------------------- |
| Vite + Rolldown | Dev server and production bundling            |
| Vitest          | Testing (Jest-compatible API)                 |
| Oxlint          | Linting (~50–100× faster than ESLint)         |
| Oxfmt           | Code formatting (~30× faster than Prettier)   |
| tsdown          | Library bundling / standalone executables     |
| Vite Task       | Task runner with caching and monorepo support |

**Performance:** 40× faster builds than webpack; Rust-based linting and formatting.

**Framework support:** React, Vue, Svelte, Solid.js, and 20+ others. Supports Vercel, Netlify, Cloudflare, and Render deployments.

---

## Installation

```bash
# macOS / Linux
curl -fsSL https://vite.plus | bash

# Windows
irm https://vite.plus/ps1 | iex
```

Two packages are installed: `vp` (global CLI) and `vite-plus` (local project package).

---

## CLI Commands

### Project Setup

```bash
vp create                          # Interactive project scaffolding
vp create <template>               # Scaffold from a template
vp create <template> -- <opts>     # Pass options to the template
vp migrate                         # Migrate existing project to Vite+
vp migrate <path>
vp install                         # Install dependencies (wraps pnpm/npm/yarn)
vp add <pkg>                       # Add dependency
vp update                          # Update dependencies
vp outdated                        # Check for outdated packages
```

**Built-in templates:** `vite:monorepo`, `vite:application`, `vite:library`, `vite:generator`
**Shorthand templates:** `vite`, `@tanstack/start`, `svelte`, `next-app`, `nuxt`, `react-router`, `vue`
**Remote templates:** `github:user/repo` or full GitHub URLs

`vp create` flags: `--directory`, `--agent`, `--editor`, `--hooks/--no-hooks`, `--no-interactive`, `--verbose`, `--list`

### Development

```bash
vp dev          # Start Vite development server
vp check        # Run fmt + lint + type-check in one pass (fastest)
vp check --fix  # Apply auto-fixes
vp lint         # Lint with Oxlint
vp lint --fix
vp lint --type-aware
vp fmt          # Format with Oxfmt
vp test         # Run tests with Vitest (does NOT default to watch)
vp test watch   # Watch mode
vp test run --coverage
```

### Build & Preview

```bash
vp build            # Production build (Vite 8 + Rolldown)
vp build --watch
vp build --sourcemap
vp preview          # Serve the production build locally
vp pack             # Build a library with tsdown
vp pack src/index.ts --dts
vp pack --watch
```

> Use `vp build` for web apps and `vp pack` for publishable libraries.

### Task Execution

```bash
vp run <task>              # Run package.json script or vite.config.ts task
vp run                     # Interactive task picker
vp run --cache build       # Run with caching enabled
vp run @my/app#build       # Target a specific workspace package
vp run -r build            # Recursive: run across all packages
vp run -t build            # Transitive: run in package + its dependencies
vp run --filter <glob>     # Filter packages by name/glob/directory
vp run -v                  # Show detailed execution stats and cache hit rates
vp run --last-details      # Show previous run summary without re-executing
vp exec <bin>              # Execute a binary
vp dlx <pkg>               # Download and execute a package
```

**Caching:** `package.json` scripts are not cached by default; tasks defined in `vite.config.ts` are cached by default. Cache hits replay previous output; cache misses occur when inputs change.

### Environment & Maintenance

```bash
vp env on/off              # Toggle managed Node.js (on = always use Vite+'s Node)
vp env setup               # Create shims in bin directory
vp env pin                 # Lock project to a Node.js version (.node-version)
vp env default             # Set global Node.js version preference
vp env install/uninstall   # Manage Node.js versions
vp env use                 # Set version for current shell session
vp env current             # Show resolved environment
vp env which               # Show which tool path will execute
vp env list-remote         # List available Node.js versions
vp env print               # Output shell config for current session
vp upgrade                 # Upgrade Vite+
vp implode                 # Remove Vite+ completely
vp config                  # Install Git hooks and configure project (stores hooks in .vite-hooks)
vp staged                  # Run staged-file checks (called by commit hooks)
```

---

## Configuration

All configuration lives in a **single `vite.config.ts`** file. Use `defineConfig` from `vite-plus`:

```typescript
import { defineConfig } from 'vite-plus';

export default defineConfig({
  // Standard Vite options
  server: { ... },
  build: { ... },
  preview: { ... },

  // Vite+ additions
  test: {
    include: ['src/**/*.test.ts'],
    // Full Vitest config here — no separate vitest.config.ts needed
  },
  lint: {
    typeAware: true,   // Enable type-informed lint rules
    typeCheck: true,   // Full type checking (uses tsgolint / TypeScript Go)
  },
  fmt: { ... },        // Oxfmt config
  run: { ... },        // Task definitions
  pack: {              // tsdown config for libraries
    dts: true,
    // formats, sourcemaps, etc.
  },
  staged: {
    // Commit hook staged-file checks
    '*.{js,ts,tsx,vue,svelte}': 'vp check --fix',
  },
});
```

**Key rule:** Do NOT use separate config files like `oxlint.config.ts`, `.oxlintrc.json`, `vitest.config.ts`, `tsdown.config.ts`, or `lint-staged` config. Everything belongs in `vite.config.ts`.

Test imports: use `'vite-plus/test'` instead of `'vitest'` after migration.

---

## Task Definitions in vite.config.ts

Tasks defined in `run` are cached by default and support dependency ordering:

```typescript
run: {
  tasks: {
    build: {
      command: 'vp build',
      dependsOn: ['typecheck'],
    },
    typecheck: {
      command: 'tsc --noEmit',
      cache: true,
    },
  },
},
```

---

## Migration from Existing Vite Projects

Pre-requisites: upgrade to **Vite 8+** and **Vitest 4.1+** first.

```bash
vp migrate
vp install
vp check
vp test
vp build
```

`vp migrate` automatically:

- Updates dependencies
- Rewrites imports
- Merges tool configs into `vite.config.ts`
- Updates scripts to `vp` commands

Most projects require manual adjustments after automated migration.

---

## CI Integration

Use the `voidzero-dev/setup-vp` GitHub Action:

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    node-version: "22"
    cache: true
- run: vp install
- run: vp check
- run: vp test
- run: vp build
```

This single action replaces separate steps for Node.js setup, package manager config, and cache management.

---

## Key Differences from Standard Vite

| Concern            | Standard Vite         | Vite+                                                   |
| ------------------ | --------------------- | ------------------------------------------------------- |
| Entry point        | `vite` CLI            | `vp` CLI                                                |
| Testing            | Separate Vitest setup | `vp test` (integrated)                                  |
| Linting            | ESLint + config files | `vp lint` (Oxlint, config in vite.config.ts)            |
| Formatting         | Prettier + config     | `vp fmt` (Oxfmt, config in vite.config.ts)              |
| Library bundling   | Manual rollup/tsup    | `vp pack` (tsdown)                                      |
| Node.js management | External (nvm, fnm)   | `vp env` (built-in)                                     |
| Task running       | npm scripts only      | `vp run` (cached, monorepo-aware)                       |
| Config files       | Many separate files   | Single `vite.config.ts`                                 |
| Combined checks    | Run tools separately  | `vp check` (fmt+lint+typecheck in one pass, 2× speedup) |

---

## Commit Hooks

Set up with `vp config`. Hooks stored in `.vite-hooks`. Staged checks run automatically on commit via `vp staged`, configured in the `staged` block of `vite.config.ts`.
