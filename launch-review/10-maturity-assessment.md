# Overall Maturity Assessment

## Synopsis

sveltekit-runelayer is a well-architected CMS-as-a-package with clean module boundaries, a thoughtful schema-driven design, and solid test coverage across unit and E2E layers. The core runtime (schema, database, auth, query, hooks, storage) is functional and coherent. However, several gaps in validation enforcement, TypeScript strictness, user-facing documentation, and admin UI completeness make it a strong alpha/beta but not yet ready for a confident v1.0 public release.

## Grade: 6/10

## Maturity Radar

| Dimension             | Score (0-10) | Notes                                                                                                                                                                                         |
| --------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation         | 5            | Strong internal docs (16 files in /docs), but no user-facing API reference, no getting-started tutorial outside the repo, minimal README                                                      |
| Test Coverage         | 7            | 150+ tests across 18 files; good journey coverage (blog, multi-tenant, access control, schema evolution); no admin UI tests, no validation tests                                              |
| Error Handling        | 6            | Access denials are clear (403 with messages); DB/auth errors surface reasonably; no structured error codes; silent swallowing in afterHooks                                                   |
| TypeScript Quality    | 5            | Schema types are well-designed; ~25 uses of `any` in production code (plugin.ts, auth, hooks runner, admin components); QueryApi returns `any[]`/`unknown`                                    |
| API Stability         | 7            | Clean public API surface; good use of `defineConfig`/`defineCollection`/`defineGlobal` builder pattern; deprecated combined entry point handled properly                                      |
| Publishing Readiness  | 6            | Package.json exports correct; CI workflow validates version tag; publishConfig set; no CHANGELOG; version 0.1.1 signals pre-release correctly                                                 |
| Developer Experience  | 6            | Demo app is comprehensive and demonstrates real patterns; `kit` injection pattern is non-obvious and requires explanation; drizzle-kit migration is host-managed but under-documented         |
| Edge Case Handling    | 5            | Path traversal protected; SQL injection guarded via quoteIdent; no field-level validation enforcement at query time; no max payload size on JSON fields; FormData parsing trusts input shapes |
| Logging & Debugging   | 3            | Single `console.error` in afterHooks runner; no structured logging; no debug mode; no request tracing; errors in hooks are swallowed silently                                                 |
| Performance           | 5            | No connection pooling concerns (libsql is embedded); N+1 query risk on dashboard (counts each collection); no pagination defaults enforced; no query result size limits                       |
| SvelteKit Integration | 8            | Feels native: handle hook, load/actions pattern, form actions, proper redirect/error/fail injection from host; split server/components entry points                                           |
| Community Readiness   | 4            | Minimal README; no CHANGELOG; no CONTRIBUTING.md; no issue/PR templates; demo exists but no standalone example repo; no npm badges or docs site                                               |

## Detailed Assessment

### Documentation (5/10)

The `/docs` directory contains 16 well-written internal design documents covering architecture, auth, database, hooks, query API, admin UI, security, testing, storage, schema, integration decisions, monorepo setup, getting started, releasing, Payload parity, and the demo app. These are excellent for contributors.

What is missing for users:

- No API reference documentation (JSDoc comments exist on some functions but not systematically).
- The root README is a bare-minimum install stub with no usage examples, no configuration guide, no screenshots of the admin UI.
- No migration guide explaining the drizzle-kit workflow end-to-end (the host must run `drizzle-kit generate` and `drizzle-kit migrate` but this is only mentioned in `/docs/database.md`, not in any user-facing doc).
- No explanation of the `kit: { redirect, error, fail }` injection requirement, which is a non-obvious pattern that will confuse new users.
- No documentation of the `system` query API vs `withRequest` distinction.

### Test Coverage (7/10)

Strengths:

- 8 E2E journey tests covering realistic scenarios: blog CMS, access control, multi-tenant, hooks pipeline, file storage, schema evolution, auth journeys, and containerized integration.
- 10 unit test files covering access functions, DB operations, schema generation, hooks, query layer, storage, drizzle config, and the SvelteKit app integration layer.
- Docker-dependent tests are properly gated with `describe.skipIf(!isDockerRunning())`.

Gaps:

- No tests for field-level validation (`ValidationFn` is defined in types but never invoked anywhere in the codebase).
- No tests for the admin Svelte components (no component testing at all).
- No tests for the `toSerializable` function (which silently strips functions -- could cause subtle data loss).
- No tests for globals CRUD (the `globals.ts` module has zero dedicated tests).
- No tests for the `multiSelect` field type rendering or storage/retrieval of JSON mode columns.
- No load testing or concurrency tests beyond the multi-tenant E2E.

### Error Handling (6/10)

Good:

- Access control throws structured errors with `{ status: 403 }` property.
- Auth admin actions parse error messages from Better Auth responses with fallback strings.
- Unknown routes return 404 with clear messages like "Admin route not found" or "Unknown collection: X".
- Self-deletion prevention ("You cannot delete your own account").
- Last-admin-standing protection ("At least one admin account must remain").

Concerning:

- `runAfterHooks` catches and `console.error`s hook errors, then continues silently. This means a critical afterChange hook (e.g., sending a notification, syncing to external system) can fail without the caller ever knowing.
- No error boundary or retry logic for database operations.
- `createAuth` swallows session resolution errors with `.catch(() => null)` -- legitimate session errors (DB unavailable, corrupt token) are indistinguishable from "no session".
- No structured error codes that consumers could programmatically match on.

### TypeScript Quality (5/10)

Strengths:

- Schema field types are a well-designed discriminated union with proper builder functions.
- `CollectionConfig`, `GlobalConfig`, `HookContext`, `AccessFn` types are precise.
- `SvelteKitUtils` interface correctly documents why host injection is needed.

Weaknesses:

- `event: any` appears 6 times in production code (plugin.ts, auth/index.ts, auth/types.ts). These should use `RequestEvent` from `@sveltejs/kit`.
- `db: any` in `createAuth` -- should be typed as `LibSQLDatabase`.
- `RunelayerQueryApi` methods return `Promise<any[]>` and `Promise<any>` -- the entire query API output is untyped from the consumer's perspective.
- `AfterHook` in runner.ts accepts `ctx: any`.
- `AdminPage.svelte` receives `data: Record<string, any>` and `form?: { error?: string } | null` -- the entire admin data contract is untyped.
- `toSvelteKitHandler(runelayerAuth.auth as any)` in auth handler.
- `(session.user as any).role` in auth/index.ts.

### API Stability (7/10)

The public API is well-designed:

- `defineConfig`, `defineCollection`, `defineGlobal`, `defineSchema` follow established CMS patterns (Payload CMS parity is explicitly tracked).
- Field builder functions (`text()`, `number()`, etc.) are ergonomic.
- The split entry points (`/sveltekit/server` vs `/sveltekit/components`) are correct for tree-shaking and SSR safety.
- The deprecated combined `/sveltekit` entry point is properly marked.

Risks:

- `SCHEMA_VERSION = "0.0.1"` is defined but never used anywhere. If this is intended for migration compatibility, it needs implementation.
- The `Hooks` type in `schema/types.ts` and `CollectionHooks`/`GlobalHooks` in `hooks/types.ts` are subtly different (different hook signatures). This will cause confusion.
- `FindArgs.where` is typed as `Record<string, unknown>` but never actually used -- the query layer passes `undefined` for `where` in all paths. The type promises functionality that does not exist.
- `upload` field config (`UploadConfig`) defines `imageSizes` but no image processing is implemented.
- `localized` field property is defined on every field type but localization is not implemented.
- `versions` collection property is partially implemented (adds `_status` and `_version` columns) but no versioning logic exists.

### Publishing Readiness (6/10)

Ready:

- `package.json` exports are correctly structured with Svelte conditions.
- `publishConfig: { access: "public" }` is set.
- GitHub Actions workflow validates tag-version match, runs quality checks, publishes with provenance.
- `files` array correctly includes only `src` and `package.json`.
- Peer dependencies are declared for `@sveltejs/kit` and `svelte`.

Not ready:

- No CHANGELOG.md.
- No LICENSE file visible.
- Version 0.1.1 is appropriate -- this should not claim 1.0.
- The `vp pack` build command is used but there is no `dist` directory or compiled output in the files array -- the package ships raw TypeScript source. This works for Svelte packages but should be explicitly documented.
- No `.npmignore` or explicit exclusion of test files, `__tests__`, `__e2e__`, `__testutils__` from the published package (they are under `src/` which is in the `files` array).

### Developer Experience (6/10)

Good:

- The demo app at `apps/demo/` is comprehensive: 8 collections, 2 globals, seed data, full site routes, and proper admin integration. This is the best documentation of how to use the package.
- `createRunelayerApp` is a single function that wires everything together.
- `app.admin.load` and `app.admin.actions` plug directly into SvelteKit's `+page.server.ts` pattern.
- Health endpoint is built in for monitoring.

Friction points:

- The `kit: { redirect, error, fail }` pattern requires importing from `@sveltejs/kit` and passing as config -- this will trip up every new user. No error message explains what happens if you forget.
- Host-managed migrations require the user to create a drizzle-schema file, a drizzle.config.ts, and run `drizzle-kit generate && drizzle-kit migrate` before the app works. This is a multi-step process with no CLI helper and no warning if tables are missing (the app will crash with "no such table").
- The `zod v4` Vite alias requirement (`resolve: { alias: { zod: "zod/v4" } }`) is a gotcha documented only in CLAUDE.md and one doc file. Users will hit this in production builds with cryptic errors.
- No TypeScript inference from schema to query results -- users get `any` back from queries and must cast manually.

### Edge Case Handling (5/10)

Protected:

- Path traversal in storage (`safePath` with relative-path check).
- SQL injection via `quoteIdent` and `assertSafeIdentifier`.
- Auth header spoofing (stripped in handle hook).
- Form field extraction handles missing/non-string values safely.
- Folder path validation in upload handler.
- `safeInt` clamping for pagination parameters.
- Self-deletion and last-admin-standing guards.

Unprotected:

- **Field validation is defined but never enforced.** `ValidationFn` exists on field types but no code anywhere calls these validation functions. Data is written directly to the database without validation. This is a critical gap.
- No `required` field enforcement at the query layer -- a required field can be omitted and the insert will succeed (or fail with a cryptic SQLite error depending on the column definition).
- No file size limit enforcement in `createLocalStorage` itself (only in `createUploadHandler`, which is optional).
- `Object.fromEntries(formData.entries())` in admin actions loses multi-value form fields (like multiSelect).
- No guard against extremely large JSON payloads in the `json` field type.
- No uniqueness enforcement for `slug` fields (the schema defines a `slug` field type but creates a regular `text` column with no unique constraint).
- `toSerializable` strips functions silently -- if a user stores a function reference accidentally, no warning.
- The `globalTableReady` WeakSet creates a race condition: if two requests hit `ensureGlobalTable` simultaneously on startup, both will execute the CREATE TABLE statement (harmless due to IF NOT EXISTS, but indicative of missing synchronization).

### Logging & Debugging (3/10)

The package has virtually no logging infrastructure:

- One `console.error` call in the entire codebase (in `runAfterHooks`).
- No configurable log levels.
- No debug mode to trace query execution, hook pipeline, or access control decisions.
- No request ID or correlation tracking.
- Errors in auth session resolution are silently caught and treated as "no session".
- No way for users to enable verbose logging for troubleshooting.
- No performance timing or slow-query warnings.

This is the weakest dimension. When something goes wrong in production, users will have no visibility into what the CMS layer is doing.

### Performance (5/10)

The architecture is fundamentally sound for small-to-medium sites (embedded SQLite via libsql, in-process), but:

- Dashboard load executes N+1 queries (one `countDocuments` per collection, serialized via `Promise.all` but each is a separate SQL round-trip).
- No pagination limit defaults -- a `find()` call with no limit returns all rows. The admin UI defaults to 20, but the programmatic API has no guard.
- `toSerializable` does `JSON.parse(JSON.stringify(...))` on every load response -- this is O(n) memory duplication for every admin page load.
- No query result caching or connection reuse strategy beyond libsql's built-in.
- `readStoredGlobal` creates the globals table on every first read per instance -- acceptable for cold start but the WeakSet check runs on every request.
- No lazy loading of collections/globals metadata -- all collection configs are serialized to every admin page.

### SvelteKit Integration (8/10)

This is the strongest dimension. The package feels native to SvelteKit:

- Uses SvelteKit's `Handle` hook pattern correctly.
- `load` and `actions` plug directly into `+page.server.ts`.
- The `kit: { redirect, error, fail }` injection, while non-obvious, correctly solves the "library throws vs runtime catches" problem that plagues SvelteKit libraries.
- Server/client entry point split prevents accidental server imports in browser code (with a runtime guard).
- Admin UI uses Carbon Svelte components consistently.
- Form actions use progressive enhancement (standard form submission with `method="POST"`).
- The catch-all `[...path]` route pattern is idiomatic.

Minor issues:

- Svelte 5 runes are used correctly (`$state`, `$derived`, `$effect`, `$props`).
- Some components use Carbon `on:click` (Svelte 4 event syntax) which may generate deprecation warnings in Svelte 5.
- No use of SvelteKit's `$app/stores` or `$page` -- all data flows through `load` which is correct.

### Community Readiness (4/10)

Present:

- Root README with basic install instructions.
- Demo app that serves as a reference implementation.
- GitHub Actions CI for releases.
- Clear package naming and scoping under `@flaming-codes/`.

Missing:

- No CHANGELOG.md.
- No CONTRIBUTING.md.
- No CODE_OF_CONDUCT.md.
- No issue or PR templates.
- No docs site or hosted documentation.
- No npm badge, CI badge, or license badge in README.
- No screenshots or demo video of the admin UI.
- No standalone starter template or `create-*` CLI.
- No LICENSE file in the repository root (or it was not found).
- No social presence or announcement strategy.

## Launch Readiness Verdict

**Not ready for v1.0.** The package is a strong 0.x release -- well-architected, functional, and with good test coverage of the happy paths. However, three blockers prevent a confident v1.0:

1. **Field validation is defined but never enforced.** This means the schema system -- the stated single source of truth -- does not actually validate data. Users will define `required: true` and `maxLength: 200` and be surprised when the CMS accepts empty strings and 10,000-character inputs.

2. **No logging or debugging capability.** When something breaks in production, users have zero visibility. This will generate support burden and erode trust.

3. **Test files ship in the npm package.** The `files: ["src"]` directive includes `__tests__/`, `__e2e__/`, and `__testutils__/` directories, bloating the package and potentially confusing consumers.

Recommendation: Ship as **v0.2.0** (or v0.1.2 for a patch) with clear "alpha" or "preview" messaging. Address the critical items below before considering v1.0.

## Action Items

### Critical (Must fix before launch)

- **Enforce field validation at the query layer.** Wire `ValidationFn` and `required` checks into `create()` and `update()` in `query/operations.ts`. Without this, the schema system is decorative. Estimated scope: ~200 lines of validation logic + tests.

- **Exclude test files from npm package.** Add `__tests__`, `__e2e__`, `__testutils__` to either a `.npmignore` or modify `files` in package.json to use explicit source paths (e.g., `["src/index.ts", "src/config.ts", ...]` or use a build step that strips test dirs). The current config ships ~4400 lines of test code to npm.

- **Add a LICENSE file.** No open-source package should ship without a license. This is both a legal requirement and an npm publishing expectation.

- **Fix `FormData` parsing for multi-value fields.** `Object.fromEntries(formData.entries())` in `admin-actions.ts` (lines 172, 190) drops duplicate keys. `multiSelect` and `array` fields will lose data. Use `formData.getAll()` for fields that accept multiple values.

### Medium (Should fix soon after launch)

- **Add structured logging.** Introduce a minimal logger (configurable via `defineConfig`) with levels (debug, info, warn, error). At minimum: log access denials, hook errors, and query failures. This is essential for production debugging.

- **Eliminate `any` in the public API surface.** Key files: `plugin.ts` (use `RequestEvent`), `auth/index.ts` (type the `db` parameter), `RunelayerQueryApi` (return typed results or at least `Record<string, unknown>`), `hooks/runner.ts` (type the AfterHook context).

- **Add a CHANGELOG.md.** Even a minimal one. Users need to know what changed between versions.

- **Write a user-facing getting-started guide in the README.** Cover: install, define schema, configure runelayer, set up drizzle-kit, add admin route, run migrations. The demo app demonstrates all of this but users should not have to reverse-engineer it.

- **Document the `zod v4` Vite alias requirement.** Add it to the README and ideally detect its absence at startup with a helpful error message.

- **Add pagination limit defaults.** The programmatic `find()` API should enforce a maximum result size (e.g., 1000) to prevent accidental full-table scans.

- **Add slug uniqueness.** The `slug` field type should generate a UNIQUE constraint on the column, or at minimum enforce uniqueness in the query layer.

### Low (Nice to have)

- **Add component tests for admin UI.** Even smoke tests that render each component with mock data would catch regression.

- **Add tests for globals CRUD.** The `globals.ts` module handles its own table creation and JSON storage but has no dedicated tests.

- **Implement the `localized` field property or remove it.** Currently it is defined on every field type but does nothing, which is misleading.

- **Implement `versions` or clearly document it as planned-but-not-implemented.** The schema adds `_status` and `_version` columns but no versioning logic exists.

- **Implement `upload` field integration with storage.** The `upload` field type is defined and the storage adapter exists, but they are not wired together -- the admin UI has no file upload capability.

- **Remove the `SCHEMA_VERSION` constant or implement it.** It is exported but unused.

- **Clean up the duplicate hooks type definitions.** `schema/types.ts` and `hooks/types.ts` define the same hook types with subtly different signatures. Consolidate to one source.

### Recommendations (Future roadmap)

- **Type-safe query results.** Infer return types from collection schemas so `find("posts")` returns `Post[]` instead of `any[]`. This is a significant TypeScript challenge but would be a major DX win.

- **CLI for migrations.** A `npx runelayer migrate` command that wraps drizzle-kit would reduce setup friction significantly.

- **Admin UI file upload.** Add drag-and-drop file upload to the `upload` field renderer, wired to the storage adapter.

- **Rich text editor.** The current `RichTextField` renderer likely renders a plain textarea for JSON input. A proper WYSIWYG editor (Tiptap, ProseMirror) would be expected for a CMS.

- **Relationship field picker.** The current `RelationshipField` renderer is likely a plain text input for an ID. A searchable dropdown that queries the related collection would be expected.

- **Real-time preview / draft mode.** This is table-stakes for a modern CMS.

- **Plugin system.** Allow extending collections, hooks, and admin UI via plugins.

- **Standalone documentation site.** The internal docs are good enough to seed this.
