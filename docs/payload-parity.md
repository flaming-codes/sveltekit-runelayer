# Payload CMS v3 Parity Analysis

Feature-by-feature comparison of sveltekit-runelayer v1 against Payload CMS v3, identifying what is implemented, what is essential for v1, and what is deferred.

## 1. Collections

### Payload v3 Offers

- 20+ field types across data, presentational, and virtual categories
- Config: `slug`, `fields`, `auth`, `upload`, `versions`, `access`, `hooks`, `admin`, `timestamps`, `defaultSort`, `dbName`, `endpoints`, `labels`, `trash`, `indexes`, `graphQL`

### sveltekit-runelayer v1 Status

| Feature                              | Status      | Notes                                                                                                                                           |
| ------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`, `fields`, `labels`           | Implemented | Core collection config                                                                                                                          |
| `access` (CRUD)                      | Implemented | Per-operation access functions                                                                                                                  |
| `hooks` (6 lifecycle types)          | Implemented | beforeChange, afterChange, beforeDelete, afterDelete, beforeRead, afterRead                                                                     |
| `timestamps`                         | Implemented | Auto createdAt/updatedAt                                                                                                                        |
| `versions` / `drafts`                | Implemented | Full version history, publish/unpublish/saveDraft/restore, per-collection versions table, admin UI with history panel                           |
| `admin` (useAsTitle, defaultColumns) | Implemented | Basic admin config                                                                                                                              |
| `auth` flag                          | Implemented | Adds auth columns to collection                                                                                                                 |
| `upload` flag                        | Implemented | Upload config with mimeTypes, maxSize, imageSizes                                                                                               |
| 16 field types                       | Implemented | text, textarea, number, email, select, multiSelect, checkbox, date, relationship, upload, richText, json, slug, group, blocks, row, collapsible |

**Note on relationship storage**: sveltekit-runelayer uses sentinel objects (`{ _ref, _collection }`) rather than Payload's bare ID strings. hasMany relationships use a JSON array of sentinels stored in the main table rather than join tables. This enables polymorphic relationship support and depth-controlled population without additional tables.

### Deferred to v2

- `trash` (soft delete)
- Compound `indexes`
- Custom REST `endpoints`
- `dbName` override
- `graphQL` support
- `point` field type
- `code` field type
- Virtual/join fields
- `saveToJWT`
- `disableBulkEdit`
- `defaultSort`

## 2. Globals

### sveltekit-runelayer v1 Status

- `slug`, `fields`, `label`, `admin.group` — Implemented
- `access` (read, update) — Implemented
- `hooks` (beforeChange, afterChange) — Implemented
- `versions` — Implemented (full: publish/unpublish/history/restore)

### Deferred to v2

- `livePreview`, custom admin components, `preview` URL, `readVersions` access

## 3. Auth

### Payload v3 Offers

- Auth-enabled collections with login/logout/refresh/forgot/reset/verify/unlock
- Strategies: cookies, JWT, API keys, custom
- Config: `tokenExpiration`, `verify`, `maxLoginAttempts`, `lockTime`, `useAPIKey`, `useSessions`

### sveltekit-runelayer v1 Status

- Better Auth handles login/logout/refresh, password hashing, session management
- Email/password auth enabled
- Role-based access control (admin/editor/user)
- SvelteKit handle hook with session injection
- Anti-spoofing header protection

### Deferred to v2

- Custom auth strategies
- `loginWithUsername`
- API key support
- Fine-grained cookie configuration
- `forgotPassword` / `resetPassword` flows (Better Auth supports but not yet wired to admin UI)

## 4. Access Control

### Payload v3 Offers

- Collection-level: create, read, update, delete, admin, unlock, readVersions
- Field-level: create, read, update
- Functions receive `{ req, id, data, siblingData }`
- Can return boolean OR query constraint (WHERE clause)

### sveltekit-runelayer v1 Status

- Collection-level: create, read, update, delete — Implemented
- Field-level: create, read, update — Implemented (schema types)
- Functions receive `{ req, id, data }` — Implemented
- Returns boolean only — **query constraints not yet supported**

### Gap: Query Constraints

Payload allows access functions to return WHERE clauses (e.g., "users can only read their own documents"). sveltekit-runelayer v1 only supports boolean returns. This is architecturally significant and should be added before v2.

## 5. Uploads / Media

### sveltekit-runelayer v1 Status

- Local filesystem storage adapter — Implemented
- StorageAdapter contract for future S3/cloud — Implemented
- Upload/serve handlers — Implemented
- Path traversal protection — Implemented
- `mimeTypes`, `maxSize`, `imageSizes` config — Implemented (schema)

### Deferred to v2

- Image resizing (Sharp integration)
- `focalPoint` / smart crop
- Cloud storage adapters (S3, etc.)
- Auto-injected upload fields (filename, mimeType, filesize, url, width, height)

## 6. Versions / Drafts

### sveltekit-runelayer v1 Status

- `_status` (draft/published) column — Implemented
- `_version` counter — Implemented
- `maxPerDoc` config — Implemented (schema)

### Deferred to v2

- Autosave with interval
- Version diff/comparison view
- Scheduled publishing
- Per-locale draft/publish status

## 7. Localization

### sveltekit-runelayer v1 Status

- Field-level `localized: true` flag — Implemented (schema)
- Top-level localization config — Not yet implemented

### Required for Full Support

- `localization` config with `locales`, `defaultLocale`, `fallbackLocale`
- Locale-keyed storage (per-field locale variants in DB)
- `locale` parameter on query operations
- Locale switcher in admin UI

### Deferred to v2

- Per-locale fallback chains
- Locale-specific labels/RTL config

## 8. Rich Text

### Payload v3 Approach

Lexical editor with feature-based extensibility (React-bound).

### sveltekit-runelayer v1 Approach

Tiptap (Svelte-native). Currently a textarea placeholder in admin UI.

**Data format**: Tiptap JSON (different from Payload's Lexical JSON). No cross-platform content portability. This is a conscious lock-in decision since Lexical is React-specific.

### Deferred to v2

- Full Tiptap integration with toolbar
- Custom blocks/nodes plugin API
- Inline embeds

## 9. Admin UI

### Payload v3 Offers (Next.js)

Dashboard, Collection List/Edit, Version History, Account, Login, Forgot Password, Create First User, custom components, branding, nav customization.

### sveltekit-runelayer v1 Status

- Dashboard with collection cards — Implemented
- Collection list with sortable table and pagination — Implemented
- Collection edit with field rendering — Implemented
- Login form — Implemented
- Create first user flow — Implemented (`/admin/create-first-user` + `?/createFirstUser`)
- User management (list/create/edit/delete/reset-password) — Implemented (`/admin/users*`)
- Profile view — Implemented (`/admin/profile`)
- Admin layout with sidebar — Implemented
- Version history view — Implemented (tabbed interface in CollectionEdit/GlobalEdit with restore)
- 12 field renderers — Implemented (includes BlocksField, updated RelationshipField with sentinel storage)

### Deferred to v2

- Forgot password view
- Custom admin components API
- Custom views/routes API
- Nav injection (beforeNavLinks, afterNavLinks)
- Branding (custom logo/icon)
- Live preview

## Risk Register

| #   | Risk                                         | Impact                                           | Severity                |
| --- | -------------------------------------------- | ------------------------------------------------ | ----------------------- |
| 1   | Access control lacks query constraints       | Cannot implement "users see only their own docs" | High                    |
| 2   | Rich text format lock-in (Tiptap vs Lexical) | No content portability with Payload              | Medium                  |
| 3   | Admin UI is the largest engineering effort   | Must render 15+ field types correctly            | High                    |
| 4   | Better Auth session ↔ access control mapping | Needs careful design for req.user                | Medium                  |
| 5   | Version storage with SQLite single-writer    | Heavy autosave could bottleneck                  | Low (autosave deferred) |

## Recommendations for v1 Completion

1. Add query constraint support to access functions (`boolean | SQL`)
2. Integrate Tiptap in the rich text field component
3. Add `overrideAccess` flag to query operations for server-side bypass
4. Add `locale` parameter to query operations for i18n
