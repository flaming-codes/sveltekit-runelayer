# Monorepo & Tooling

`sveltekit-runelayer` uses a pnpm workspace monorepo with vite-plus.

## Layout

```
sveltekit-runelayer/
├── apps/
│   └── web/
├── packages/sveltekit-runelayer/
├── docs/
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json
├── pnpm-workspace.yaml
└── vite.config.ts
```

## Package manager

Workspace packages:

```yaml
packages:
  - apps/*
  - packages/*
```

Shared catalog includes:

- `drizzle-orm`
- `@libsql/client`
- `better-auth`
- `drizzle-kit`
- `svelte`, `@sveltejs/kit`, `typescript`

## Root scripts

```json
{
  "build": "vp run build -r",
  "check": "vp check",
  "ready": "vp fmt && vp lint && vp run test -r && vp run build -r",
  "prepare": "vp config"
}
```

## Package scripts (`packages/sveltekit-runelayer`)

```json
{
  "build": "vp pack",
  "dev": "vp pack --watch",
  "test": "vp test",
  "check": "vp check"
}
```

## Package distribution hygiene

- Published package root: `packages/sveltekit-runelayer/`
- Runtime source is shipped from `src/**` entrypoints.
- `src/.npmignore` excludes test/support paths from tarballs:
  - `__tests__/`
  - `__e2e__/`
  - `__testutils__/`
  - `*.test.ts` / `*.spec.ts`
- Validate contents with `npm pack --dry-run --json` in package root.

## TypeScript

- root uses `moduleResolution: nodenext`
- library uses strict mode and emits declarations on pack

## Node requirement

- minimum: Node.js >= 22.18.0
- pinned locally via `.nvmrc`

## Workflow

```bash
pnpm install
pnpm dev:web
npx vitest run
pnpm ready
```

## Dependency additions

```bash
pnpm add <pkg> --filter @flaming-codes/sveltekit-runelayer
pnpm add -D <pkg> --filter @flaming-codes/sveltekit-runelayer
```

For shared versions, add to `pnpm-workspace.yaml` catalog and reference with `"catalog:"`.

## Example app

- `apps/web` is the example SvelteKit application used to exercise the package in a host app.
- It mounts the package-owned admin and renders a public marketing site from Runelayer-managed content.
- App-specific scripts such as `pnpm dev:web`, `pnpm --filter web check`, and `pnpm --filter web build` run against this workspace app.
