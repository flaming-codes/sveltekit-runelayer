# SvelteKit RuneLayer

SvelteKit RuneLayer is a CMS-as-a-package for SvelteKit applications.

It runs in your app process with SQLite, Drizzle ORM, Better Auth, and local filesystem storage. The package includes schema-driven collections, query APIs with hooks and access control, and a Svelte admin UI.

## Packages

- `@flaming-codes/sveltekit-runelayer` - core library and admin exports
- `apps/demo` - demo SvelteKit host application

## Install

```bash
pnpm add @flaming-codes/sveltekit-runelayer
```

## Release model

Releases are tag-driven via GitHub Actions:

- Push tag `vX.Y.Z`
- Workflow publishes `@flaming-codes/sveltekit-runelayer@X.Y.Z` to npm
- Workflow creates a GitHub Release

See [`docs/releasing.md`](./docs/releasing.md) for details.
