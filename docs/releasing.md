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

Example:

- package version: `0.1.1`
- tag: `v0.1.1`

## What the Workflow Does

1. Checks out the repo
2. Installs Node and pnpm
3. Installs dependencies with `pnpm install --frozen-lockfile`
4. Verifies tag version equals package version
5. Runs package checks (`check`, `test`, `build`)
6. Publishes to npm with provenance
7. Creates a GitHub Release with generated notes

## Manual Release Steps

```bash
# Ensure working tree is clean and changes are pushed

# Create and push tag for the package version
git tag v0.1.1
git push origin v0.1.1
```

Pushing the tag triggers npm publication and GitHub Release creation.
