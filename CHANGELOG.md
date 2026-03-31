# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) with `0.x` pre-v1 stability expectations.

## [Unreleased]

### Added

- Root-level OSS hygiene files: `LICENSE`, `CONTRIBUTING.md`, and this changelog.
- Adopter-focused README with end-to-end SvelteKit integration guidance.

### Changed

- Publishing hygiene for `@flaming-codes/sveltekit-runelayer` by excluding test/support files from the npm tarball using `src/.npmignore`.
- Release, monorepo, and getting-started docs to reflect packaging and release-checklist requirements.

## [0.1.1]

### Added

- Initial `@flaming-codes/sveltekit-runelayer` package release line with schema, db, auth, query, hooks, storage, and admin integration.
