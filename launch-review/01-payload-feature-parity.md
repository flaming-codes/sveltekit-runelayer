# PayloadCMS Feature Parity Review

## Synopsis

Runelayer v1 covers the core CMS primitives -- collections, globals, 16 field types, CRUD with access control and hooks, auth via Better Auth, local filesystem uploads, and a full admin UI built with Carbon Svelte 5. It provides a credible "SvelteKit-native Payload alternative" for content-heavy apps that need schema-driven data management. However, several features that Payload v3 users consider table-stakes are either partially wired or entirely absent: `where` query filters, versioning beyond schema columns, localization runtime, rich text editing (Tiptap not integrated), REST/GraphQL APIs, the plugin system, live preview, and image processing. These gaps are honest v1 scope cuts but must be clearly communicated to avoid user frustration.

## Grade: 5.5/10

The score reflects strong architectural foundations (schema-as-source-of-truth, deny-by-default access, header anti-spoofing, SvelteKit-native integration) offset by meaningful functional gaps in querying, versioning, localization, rich text, and API surface that Payload v3 ships out of the box. A user migrating from Payload would hit blockers within hours on any non-trivial project.

## Feature Comparison Matrix

| #   | Feature Area                       | PayloadCMS v3                                                                                                                 | Runelayer v1                                                                                                               | Status                                 |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | Collections (basic CRUD)           | Full                                                                                                                          | Full                                                                                                                       | **supported**                          |
| 2   | Globals (single-document)          | Full                                                                                                                          | Full (JSON blob storage)                                                                                                   | **supported**                          |
| 3   | Data field types                   | 15 (text, number, email, date, checkbox, select, radio, textarea, richText, relationship, upload, array, blocks, point, json) | 13 (text, number, email, date, checkbox, select, multiSelect, textarea, richText, relationship, upload, array, json, slug) | **supported** (partial)                |
| 4   | Structural field types             | row, collapsible, tabs, group, blocks, ui                                                                                     | row, collapsible, group                                                                                                    | **supported** (partial)                |
| 5   | Access control (collection-level)  | create/read/update/delete/admin/unlock/readVersions; boolean OR query constraint return                                       | create/read/update/delete; boolean return only                                                                             | **supported** (partial)                |
| 6   | Access control (field-level)       | create/read/update                                                                                                            | create/read/update (type-defined, not enforced at query layer)                                                             | **supported** (partial)                |
| 7   | Access control (query constraints) | Returns WHERE clause for row-level security                                                                                   | Not implemented                                                                                                            | **deferred**                           |
| 8   | Hooks (collection)                 | beforeValidate, beforeChange, afterChange, beforeRead, afterRead, beforeDelete, afterDelete                                   | beforeChange, afterChange, beforeRead, afterRead, beforeDelete, afterDelete                                                | **supported** (missing beforeValidate) |
| 9   | Hooks (field-level)                | Per-field hooks                                                                                                               | Not implemented                                                                                                            | **deferred**                           |
| 10  | Hooks (global)                     | beforeChange, afterChange, beforeRead, afterRead                                                                              | beforeChange, afterChange (beforeRead/afterRead in global code but not in GlobalConfig type)                               | **supported** (partial)                |
| 11  | Auth (email/password)              | Full (login, logout, refresh, forgot, reset, verify, unlock)                                                                  | login, logout, refresh via Better Auth                                                                                     | **supported** (partial)                |
| 12  | Auth (strategies)                  | JWT, cookies, API keys, custom                                                                                                | Cookie sessions via Better Auth                                                                                            | **supported** (partial)                |
| 13  | Auth (password reset)              | Built-in forgot/reset flow                                                                                                    | Better Auth supports it; not wired to admin UI                                                                             | **deferred**                           |
| 14  | Auth (MFA)                         | Supported                                                                                                                     | Not implemented                                                                                                            | **out-of-scope**                       |
| 15  | Auth (API keys)                    | Built-in `useAPIKey`                                                                                                          | Not implemented                                                                                                            | **deferred**                           |
| 16  | Uploads / storage                  | Local + S3/Azure/GCS via plugins; Sharp image processing; focal point; auto-resize                                            | Local FS only; no image processing                                                                                         | **supported** (partial)                |
| 17  | Image resizing                     | Sharp with imageSizes, focalPoint, crop                                                                                       | Schema config exists; no runtime processing                                                                                | **deferred**                           |
| 18  | Versions / drafts (schema)         | \_status, \_version, version history table                                                                                    | \_status, \_version columns                                                                                                | **supported** (partial)                |
| 19  | Versions (publish/unpublish)       | Full publish workflow + scheduled publishing                                                                                  | Not wired                                                                                                                  | **deferred**                           |
| 20  | Versions (history + restore)       | Full version history with restore and diff                                                                                    | Not implemented                                                                                                            | **deferred**                           |
| 21  | Versions (autosave)                | Built-in with configurable interval                                                                                           | Not implemented                                                                                                            | **deferred**                           |
| 22  | Localization (config)              | locales, defaultLocale, fallbackLocale, per-locale labels, RTL                                                                | `localized: true` flag on fields only; no runtime config                                                                   | **deferred**                           |
| 23  | Localization (runtime)             | Locale param on all queries; locale-keyed storage; admin locale switcher                                                      | Not implemented                                                                                                            | **deferred**                           |
| 24  | Rich text editor                   | Lexical (full block editor) or Slate; extensible with features                                                                | Textarea placeholder in admin; Tiptap planned but not integrated                                                           | **deferred**                           |
| 25  | Query: `where` filters             | Full operator set (equals, not_equals, greater_than, like, in, exists, near, etc.)                                            | `where` in FindArgs type but not passed to DB layer; `findMany` accepts Drizzle SQL but high-level API does not expose it  | **deferred**                           |
| 26  | Query: `depth` (population)        | Configurable relationship depth                                                                                               | Not implemented; relationships return raw IDs                                                                              | **deferred**                           |
| 27  | Query: `select` / `populate`       | Select specific fields; control populated fields                                                                              | Not implemented                                                                                                            | **deferred**                           |
| 28  | Query: pagination metadata         | `totalDocs`, `totalPages`, `hasNextPage`, `hasPrevPage`, `page`, `limit`                                                      | Admin runtime computes pagination; query API returns raw array                                                             | **supported** (partial)                |
| 29  | REST API                           | Auto-generated at `/api/{collection}` with full CRUD + query operators                                                        | No REST API; admin actions use SvelteKit form actions                                                                      | **deferred**                           |
| 30  | GraphQL API                        | Auto-generated queries, mutations, playground                                                                                 | Not implemented                                                                                                            | **out-of-scope**                       |
| 31  | Local API (typed)                  | `payload.find()`, `payload.create()`, etc. with TypeScript generics                                                           | `system.find()`, `withRequest().find()` -- functional but no generated types                                               | **supported** (partial)                |
| 32  | Plugin system                      | `plugins` array in config; can modify collections, fields, hooks, endpoints, components                                       | Not implemented                                                                                                            | **deferred**                           |
| 33  | Live preview                       | Real-time frontend preview in admin                                                                                           | Not implemented                                                                                                            | **out-of-scope**                       |
| 34  | Admin: dashboard                   | Collection cards with counts                                                                                                  | Collection cards with counts + global links                                                                                | **supported**                          |
| 35  | Admin: collection list             | Sortable, filterable, bulk ops, column customization                                                                          | Sortable table with pagination; no bulk ops, no filtering                                                                  | **supported** (partial)                |
| 36  | Admin: collection edit             | Full form with all field types, live validation, sidebar                                                                      | Form with 10 field renderers + sidebar                                                                                     | **supported** (partial)                |
| 37  | Admin: global edit                 | Full form                                                                                                                     | Full form                                                                                                                  | **supported**                          |
| 38  | Admin: user management             | Basic (via auth collection)                                                                                                   | Full (list/create/edit/delete/password-reset, role management)                                                             | **supported**                          |
| 39  | Admin: create first user           | Built-in                                                                                                                      | Built-in                                                                                                                   | **supported**                          |
| 40  | Admin: custom components           | React Server/Client component injection points                                                                                | Not implemented                                                                                                            | **deferred**                           |
| 41  | Admin: branding                    | Custom logo, icon, favicon, meta                                                                                              | appName, productName, footerText only                                                                                      | **supported** (partial)                |
| 42  | Admin: document locking            | Concurrent edit prevention                                                                                                    | Not implemented                                                                                                            | **out-of-scope**                       |
| 43  | Admin: bulk operations             | Bulk edit, bulk delete                                                                                                        | Not implemented                                                                                                            | **deferred**                           |
| 44  | Database adapters                  | MongoDB, PostgreSQL, SQLite (Drizzle), Vercel Postgres                                                                        | libsql/SQLite only (Drizzle)                                                                                               | **supported** (partial)                |
| 45  | Migrations                         | `payload migrate` CLI with drizzle-kit                                                                                        | Host-managed via `createDrizzleKitSchema()` helper + drizzle-kit                                                           | **supported**                          |
| 46  | TypeScript generation              | Auto-generated `payload-types.ts`                                                                                             | Not implemented                                                                                                            | **deferred**                           |
| 47  | Transactions                       | ACID transactions                                                                                                             | Not implemented (single-statement operations)                                                                              | **deferred**                           |
| 48  | Soft delete (trash)                | Built-in trash with restore                                                                                                   | Not implemented                                                                                                            | **deferred**                           |
| 49  | `blocks` field type                | Layout builder with typed blocks                                                                                              | Not implemented                                                                                                            | **deferred**                           |
| 50  | `tabs` field type                  | Tabbed field organization                                                                                                     | Not implemented                                                                                                            | **deferred**                           |
| 51  | `radio` field type                 | Radio button group                                                                                                            | Not implemented (select covers basic use case)                                                                             | **deferred**                           |
| 52  | `point` field type                 | Geospatial coordinates                                                                                                        | Not implemented                                                                                                            | **out-of-scope**                       |
| 53  | `join` field type                  | Virtual reverse relationships                                                                                                 | Not implemented                                                                                                            | **deferred**                           |
| 54  | `ui` field type                    | Custom UI-only components                                                                                                     | Not implemented                                                                                                            | **deferred**                           |
| 55  | Custom endpoints                   | Per-collection and global REST endpoints                                                                                      | Not implemented                                                                                                            | **deferred**                           |
| 56  | Email adapter                      | Configurable email sending                                                                                                    | Not implemented                                                                                                            | **deferred**                           |
| 57  | Orderable collections              | Drag-and-drop ordering                                                                                                        | Not implemented                                                                                                            | **out-of-scope**                       |
| 58  | Query presets                      | Saved filter/sort configurations                                                                                              | Not implemented                                                                                                            | **out-of-scope**                       |
| 59  | Conditional field logic            | `admin.condition` show/hide                                                                                                   | Type-defined; admin UI renders conditionally                                                                               | **supported**                          |
| 60  | Validation                         | Per-field validation functions                                                                                                | Type-defined; not enforced at query layer                                                                                  | **supported** (partial)                |

## Detailed Analysis

### 1. Schema and Field Types

Runelayer implements 16 field types covering the majority of common CMS content modeling needs. The type system is clean, using discriminated unions and builder functions that provide good DX.

**Missing field types with real user impact:**

- `blocks` -- This is arguably Payload's most distinctive feature. It enables page-builder patterns where content editors compose pages from typed content blocks. Many Payload users adopt it specifically for this. Its absence limits Runelayer to flat-form content modeling.
- `tabs` -- Important for complex content types with many fields. Without it, large forms become unwieldy.
- `radio` -- Minor; `select` covers the data need, just different UI.
- `join` (virtual reverse relationships) -- Important for content modeling ergonomics (e.g., "show all posts by this author" without a separate query).

**What works well:** `group` (with prefix flattening), `array` (with child tables), `row`/`collapsible` (layout-only), polymorphic `relationship` (multiple `relationTo`), `slug` with `from` source field. The schema-to-Drizzle-table generation in `db/schema.ts` is solid.

### 2. Query API and Data Access

The query API (`find`, `findOne`, `create`, `update`, `remove`) is functional but minimal compared to Payload's operator-rich query system.

**Critical gap: `where` filters.** The `FindArgs` type declares `where?: Record<string, unknown>` but the `find()` operation never passes it to `findMany()`. The low-level `findMany` accepts a Drizzle `SQL` where clause, but there is no translation layer from user-friendly filter syntax to Drizzle SQL. This means:

- No filtering in the query API beyond pagination and sorting
- No search functionality
- Access control cannot use query constraints for row-level security
- Admin list views cannot filter documents

**Missing: relationship population (`depth`).** Relationships return raw IDs. No depth-controlled population means the consumer must manually resolve references. This is a significant DX gap for any app with relational content.

**Missing: `select` field projection.** Every query returns all columns. No way to optimize payloads.

**Pagination metadata** is computed at the admin runtime level but not returned from the core query API. The `find()` function returns a raw array with no total count.

### 3. Access Control

The access control system is architecturally sound: deny-by-default, header anti-spoofing, `isAdmin()`/`isLoggedIn()`/`hasRole()` helpers, per-operation functions.

**Critical gap: query constraint returns.** Payload access functions can return a `Where` query instead of a boolean, enabling "users can only see their own documents" without fetching all documents and filtering in memory. Runelayer only supports boolean returns. This makes multi-tenant or user-scoped content patterns impractical at scale.

**Field-level access** is defined in types (`FieldAccess`) but the query layer does not enforce it. The admin UI does not strip fields based on access either. Field access is effectively decorative.

**Validation** functions are defined on field types but the query layer (`create`/`update`) does not run them. Validation is type-declared but not enforced. The `beforeValidate` hook (which Payload uses for pre-validation transforms) is also absent.

### 4. Authentication

Better Auth provides a solid foundation. Login, logout, session management, and role-based access work. The admin plugin integration for user management (list/create/edit/delete/password-reset) is more complete than many alternatives.

**Gaps:**

- No forgot-password/reset-password flow in the admin UI (Better Auth supports it underneath)
- No email verification flow in the admin UI
- No API key authentication for programmatic access
- No MFA support

### 5. Uploads and Media

The storage adapter pattern is clean and extensible. Local filesystem storage with path traversal protection works. Upload and serve handlers are functional.

**Gaps:**

- `imageSizes` config is defined but image resizing is not implemented (no Sharp integration)
- No focal point or smart crop
- No cloud storage adapters
- No auto-injected media metadata fields (width, height, filesize columns)

### 6. Versioning and Drafts

Schema-level support exists: `_status` and `_version` columns are generated. But the runtime is not wired:

- No publish/unpublish API operations
- No version history table or retrieval
- No restore-to-previous-version
- No autosave
- No scheduled publishing

This is effectively a placeholder. Users who enable `versions: { drafts: true }` get columns but no behavior.

### 7. Localization

The `localized: true` field flag exists in schema types but has zero runtime support:

- No `localization` top-level config
- No locale-keyed storage in the database layer
- No `locale` parameter on queries
- No locale switcher in admin UI
- No fallback chain

Localization is entirely non-functional.

### 8. Rich Text

The admin UI renders a `<textarea>` for richText fields. Tiptap was planned as the Svelte-native alternative to Payload's Lexical editor but is not integrated. There is no toolbar, no formatting, no block support. Rich text is effectively a JSON textarea.

### 9. Admin UI

The admin UI is surprisingly complete for a v1:

- Dashboard with collection counts and global links
- Collection list with sortable table and pagination
- Collection create/edit forms with 10 field renderers
- Global edit form with JSON blob persistence
- User management (list, create, edit, delete, password reset)
- Login and create-first-user flows
- Profile page
- Health check endpoint
- Carbon Design System integration (g10 theme)
- Breadcrumb navigation throughout

**Gaps vs Payload:**

- No `where` filtering or search in list views
- No bulk operations (select-all, bulk delete, bulk edit)
- No version history or diff view
- No custom component injection points
- No live preview
- No document locking
- Rich text field is a textarea
- No upload field UI (file picker, image preview)
- No relationship field UI (search/select related documents) -- the relationship field renderer exists but likely shows a text input for ID

### 10. APIs (REST / GraphQL)

Payload auto-generates REST endpoints at `/api/{collection}` and optional GraphQL endpoints. These are how frontend apps typically consume content.

Runelayer has no REST API and no GraphQL API. Data access is limited to:

1. SvelteKit form actions (admin UI)
2. Local API via `system` or `withRequest()` (server-side only)

This means Runelayer content is only accessible from within the SvelteKit application. No external consumers (mobile apps, static site generators, other services) can query content without building custom API routes.

### 11. Plugin System

Payload's plugin system allows third-party extensions to modify collections, add fields, register hooks, inject admin components, and add endpoints. Official plugins include SEO, cloud storage, form builder, and search.

Runelayer has no plugin system. The PLAN.md defers stable plugin API to v2.

### 12. Migrations

Runelayer delegates to drizzle-kit and provides `createDrizzleKitSchema()` and `defineRunelayerDrizzleConfig()` helpers. This is a reasonable approach for v1 -- migrations are host-managed but tooling is provided.

### 13. Transactions

Payload supports ACID transactions for multi-step operations. Runelayer's CRUD operations are single-statement with no transaction support. An interrupted `update` that involves hooks modifying multiple records could leave data inconsistent.

## Action Items

### Critical

1. **Implement `where` filter translation in the query API.** Without filtering, the query API is not useful for any real application. Map a Payload-compatible `where` syntax (or a subset: `equals`, `not_equals`, `like`, `in`, `greater_than`, `less_than`) to Drizzle SQL. This unblocks list filtering in admin, search, and row-level access control.

2. **Enforce field validation at the query layer.** `create()` and `update()` must run field validators before writing to the database. Currently, invalid data passes through to SQLite unchecked. Add a `beforeValidate` hook point.

3. **Wire versioning publish/unpublish operations.** Users who set `versions: { drafts: true }` expect a working draft/publish workflow. At minimum: `publish(ctx, id)` and `unpublish(ctx, id)` operations that toggle `_status` and increment `_version`.

4. **Enforce field-level access at the query layer.** Strip fields from responses when `field.access.read` denies, and reject writes when `field.access.create` or `field.access.update` denies. Without this, field-level access is security theater.

### Medium

5. **Implement relationship population with configurable `depth`.** At least depth=1 auto-population so relationship fields return objects instead of raw IDs. Payload defaults to depth=1.

6. **Integrate Tiptap for the rich text field.** A textarea is not acceptable for a CMS rich text field. Even a minimal Tiptap setup (bold, italic, headings, links, lists) would be a major improvement.

7. **Add query constraint returns to access control.** Allow access functions to return `boolean | Where` so row-level security patterns work without loading all rows.

8. **Implement `blocks` field type.** This is the field type that differentiates a CMS from a database admin panel. Page-builder patterns depend on it.

9. **Add pagination metadata to `find()`.** Return `{ docs, totalDocs, totalPages, page, limit, hasNextPage }` instead of a raw array.

10. **Implement `tabs` structural field.** Important for complex content types with many fields.

### Low

11. **Add a REST API layer.** Auto-generate `/api/{collection}` endpoints for external consumers. This can be a thin wrapper over the existing query API.

12. **Add `radio` field type.** Trivial variant of `select`.

13. **Add image processing (Sharp).** Wire the existing `imageSizes` config to actual resize operations on upload.

14. **Add `forgot-password` and `reset-password` to admin UI.** Better Auth supports it; just needs UI wiring.

15. **Add TypeScript type generation.** Auto-generate document types from collection configs.

16. **Add upload field UI in admin.** File picker, image preview, drag-and-drop.

17. **Add relationship field UI in admin.** Search/select modal for choosing related documents.

18. **Return total count from `find()` without a separate raw SQL query.** The admin runtime currently calls `countDocuments()` separately using raw `SELECT COUNT(*)`.

### Recommendations

1. **Communicate scope honestly.** The landing page / README should clearly state what v1 does and does not support. A comparison table showing `supported | coming soon | not planned` prevents user disappointment. Do not market parity with Payload v3 -- market it as a "SvelteKit-native CMS foundation" with a clear roadmap.

2. **Prioritize `where` filters above all else.** This single feature unlocks filtering, search, row-level access, and makes the query API actually useful for application development. Without it, the CMS is limited to "show all documents, pick one by ID."

3. **Consider shipping v1 without localization.** The current state (flag in schema, no runtime) is worse than not having the feature at all. Users will define `localized: true`, expect it to work, and file bugs. Either remove the flag or implement the runtime.

4. **Treat versioning similarly.** Either remove the `versions` config option or wire the publish/unpublish workflow. Schema columns without behavior create false expectations.

5. **Add an `overrideAccess` flag to query operations.** Server-side code (seeding, cron jobs, webhooks) needs to bypass access control cleanly. The current workaround (use raw DB operations or the `system` query API) works but `overrideAccess: true` on individual calls is the Payload pattern users expect.

6. **The `system` query API with synthetic admin headers is a reasonable interim.** Document it clearly as the server-side bypass mechanism.

7. **Plan the `blocks` field type for v1.1 or v1.2.** It is the single most impactful field type for CMS adoption and is what separates a CMS from a CRUD admin panel.
