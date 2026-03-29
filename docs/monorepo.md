# Monorepo & Tooling

Runekit is structured as a pnpm workspace monorepo with vite-plus as the unified build/test/lint toolchain.

## Workspace Layout

```
sveltekit-runelayer/
├── apps/
│   └── demo/                   # SvelteKit demo app (Carbon Design + full CMS showcase)
├── packages/
│   └── sveltekit-runelayer/    # Core CMS library
├── docs/                       # Internal documentation
├── package.json                # Root workspace config
├── pnpm-workspace.yaml         # Workspace + dependency catalog
├── tsconfig.json               # Root TypeScript config
└── vite.config.ts              # Root vite-plus config (lint, format)
```

## Package Manager: pnpm 10

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

### Dependency Catalog

Shared dependency versions are managed via pnpm's catalog:

```yaml
catalog:
  svelte: ^5
  "@sveltejs/kit": ^2
  typescript: ^5
  drizzle-orm: ^0.45.2
  better-sqlite3: ^12.8.0
  better-auth: ^1.5.6
  vite: npm:@voidzero-dev/vite-plus-core@latest
  vitest: npm:@voidzero-dev/vite-plus-test@latest
  vite-plus: latest
```

Packages reference catalog versions with `"catalog:"`:

```json
{ "drizzle-orm": "catalog:" }
```

## Build Tool: vite-plus

vite-plus (`vp`) is a unified CLI that wraps Vite, Vitest, Oxlint, and Oxfmt.

### Root Scripts

```json
{
  "dev": "vp run demo#dev", // Run demo app dev server
  "build": "vp run build -r", // Build all packages recursively
  "check": "vp check", // Lint + type check
  "ready": "vp fmt && vp lint && vp run test -r && vp run build -r", // Full quality gate
  "prepare": "vp config" // Initialize vite-plus
}
```

### Package Scripts

```json
// packages/sveltekit-runelayer
{
  "build": "vp pack", // Build library for publishing
  "dev": "vp pack --watch", // Watch mode for development
  "test": "vp test", // Run vitest
  "check": "vp check" // Lint + type check
}
```

```json
// apps/demo
{
  "dev": "vp dev", // SvelteKit dev server
  "build": "vp build", // SvelteKit build
  "preview": "vp preview", // Preview production build
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
}
```

## TypeScript Configuration

### Root tsconfig.json

```json
{
  "compilerOptions": {
    "noEmit": true,
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "allowImportingTsExtensions": true,
    "esModuleInterop": true
  }
}
```

### Library tsconfig (packages/sveltekit-runelayer)

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

## Linting

vite-plus uses Oxlint (Rust-based linter) with type-aware rules:

```ts
// vite.config.ts (root)
export default defineConfig({
  staged: { "*": "vp check --fix" }, // Pre-commit hook
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
```

## Pre-Commit Hooks

Configured via `.vite-hooks/pre-commit`. Runs `vp check --fix` on staged files before each commit.

## Package Exports

The `@flaming-codes/sveltekit-runelayer` package uses TypeScript source as entry points (no pre-built dist):

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./admin": "./src/admin/index.ts",
    "./package.json": "./package.json"
  }
}
```

For publishing, `vp pack` builds the dist output with declarations.

## Node.js Requirements

- **Minimum**: Node.js >= 22.12.0
- **Reason**: Required for `crypto.randomUUID()`, modern ES module support, and better-sqlite3 compatibility
- **Note**: `node:sqlite` (built-in SQLite) is not used because `drizzle-kit` does not yet support it

## Development Workflow

```bash
# Install dependencies
pnpm install

# Start dev server (runs demo app with hot-reloading @flaming-codes/sveltekit-runelayer)
pnpm dev

# Run tests
pnpm test

# Full quality gate (format, lint, test, build)
pnpm ready

# Type check only
pnpm check
```

## Adding Dependencies

```bash
# Add to a specific package
pnpm add <package> --filter @flaming-codes/sveltekit-runelayer
pnpm add -D <package> --filter @flaming-codes/sveltekit-runelayer

# Add to workspace catalog (for shared versions)
# Edit pnpm-workspace.yaml catalog section, then reference with "catalog:"
```

## Build Dependency Approval

Some native dependencies (like `better-sqlite3`) need build scripts approved:

```json
// package.json (root)
{
  "pnpm": {
    "onlyBuiltDependencies": ["better-sqlite3", "esbuild"]
  }
}
```
