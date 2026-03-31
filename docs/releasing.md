# Releasing & Publishing

This repository publishes `@flaming-codes/sveltekit-runelayer` to npm from Git tags.

## Publish Workflow

The release pipeline is defined in:

- `.github/workflows/release-publish.yml`

It triggers on pushes of tags matching `v*`.

## Release Preconditions

- npm publish token is set in repository secrets as `NPM_TOKEN`.
- `packages/sveltekit-runelayer/package.json` has the version to release.
- The git tag matches that version without the `v` prefix.
- Root hygiene files are up to date (`LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`).

Example:

- package version: `0.1.1`
- tag: `v0.1.1`

## Release Checklist

Run this checklist before tagging:

1. Update package version and changelog entries.
2. Confirm docs and README reflect the shipped behavior.
3. Run full quality gates:
   - `npx vp fmt`
   - `npx vp check --fix`
   - `npx vitest run`
   - `pnpm build`
4. Verify package contents with a dry-run pack:
   - `npm pack --dry-run --json` from `packages/sveltekit-runelayer`
5. Confirm tarball excludes test/support paths (`__tests__`, `__e2e__`, `__testutils__`).

## What the Workflow Does

1. Checks out the repo
2. Installs Node and pnpm
3. Installs dependencies with `pnpm install --frozen-lockfile`
4. Verifies tag version equals package version
5. Runs package checks (`check`, `test`, `build`)
6. Publishes to npm with provenance
7. Creates a GitHub Release with generated notes

## Tarball Boundary

The package publishes from source entrypoints (`src/**`) and uses `src/.npmignore` to exclude test/support files from the npm tarball.

## Manual Release Steps

```bash
# Ensure working tree is clean and changes are pushed

# Verify package contents before tagging
cd packages/sveltekit-runelayer
npm pack --dry-run --json
cd ../..

# Create and push tag for the package version
git tag v0.1.1
git push origin v0.1.1
```

Pushing the tag triggers npm publication and GitHub Release creation.
