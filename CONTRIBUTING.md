# Contributing

Thanks for contributing to SvelteKit RuneLayer.

## Local setup

```bash
pnpm install
pnpm dev
```

## Branching and scope

- Keep pull requests focused and small enough to review.
- Prefer one concern per pull request (runtime behavior, docs, or release/tooling).
- Do not mix unrelated refactors with feature or bug-fix work.

## Quality gates

Before opening a PR, run:

```bash
npx vp fmt
npx vp check --fix
npx vitest run
pnpm build
```

Use `pnpm ready` when you want the combined repo gate.

## Tests

- Add or update tests for behavior changes.
- Keep tests close to the feature area (`src/**/__tests__` for unit tests, `src/__e2e__` for journeys).
- If a test is intentionally skipped, document the reason in the PR.

## Documentation

- Update docs whenever behavior or setup changes.
- Keep docs timeless and factual.
- Ensure the root README remains adopter-focused.

## Releases

- Update `CHANGELOG.md` for user-visible changes.
- Ensure package metadata and tarball contents are clean before tagging.
- See [`docs/releasing.md`](./docs/releasing.md) for the release checklist.

## Code style

- TypeScript ESM imports use `.js` extensions.
- Keep Svelte 5 runes file-local. Do not enable global `runes: true`.
- Prefer explicit, readable code over clever abstractions.
