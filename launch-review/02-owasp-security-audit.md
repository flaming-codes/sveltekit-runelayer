# OWASP Top 10 Security Audit

## Synopsis

sveltekit-runelayer has a sound security architecture for its auth header anti-spoofing, deny-by-default access control, and parameterized SQL queries. The most significant finding is a mass-assignment vulnerability in the collection create/update admin actions, where raw form data is passed directly to the database layer without field allowlisting. The `systemRequest` helper fabricates admin-level auth headers in a `Request` object that bypasses the anti-spoofing strip, which is by design but requires careful handling. Several medium-severity items around MIME validation, upload handler auth, and SVG serving need attention before production hardening.

## Grade: 7/10

## OWASP Top 10 Analysis

### A01: Broken Access Control

**Header spoofing prevention: GOOD.** The auth handle hook at `/packages/sveltekit-runelayer/src/auth/index.ts:46-48` correctly strips `x-user-id`, `x-user-role`, and `x-user-email` from all incoming requests before session resolution.

**Deny-by-default: GOOD.** `/packages/sveltekit-runelayer/src/query/access.ts:12-16` denies access when an access function exists but no `Request` is provided.

**Admin guard: GOOD.** `guardAdminRoute` in `/packages/sveltekit-runelayer/src/sveltekit/runtime.ts:49-88` requires `role === "admin"` for all admin routes except login, create-first-user, and health.

**Finding 1 -- `systemRequest` fabricates admin headers that are never stripped.**

- File: `/packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts:73-81`
- The `systemRequest()` function creates a `Request` with `x-user-id: "runelayer-system"` and `x-user-role: "admin"`. This is used by `system` query API (`runtime.ts:106`). The fabricated headers are valid because this `Request` never passes through the `handle` hook that would strip them. This is intentional server-side bypass, but the `system` API is exposed on the `RunelayerApp` return type (`types.ts:74`) and accessible to any server-side code with a reference to the app instance. This is acceptable if documented but could be dangerous if host code passes the system API to untrusted contexts.
- Impact: Low. By design, but worth explicit documentation.

**Finding 2 -- Mass assignment in collection create/update actions.**

- File: `/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:171-172`
- `Object.fromEntries(formData.entries())` passes all form fields directly to `query.create()` and `query.update()`. A malicious admin (or CSRF if SvelteKit origin checking is disabled) can inject arbitrary columns like `createdAt`, `updatedAt`, `_status`, `_version`, `hash`, `salt`, or `token` by adding hidden form fields or crafting a request.
- Same pattern at line 190 for updates.
- Impact: Medium. An authenticated admin can overwrite system columns.
- Remediation: Filter form data through the collection's field definitions before passing to the query layer. Only allow fields that exist in `collection.fields[].name`.

**Finding 3 -- Upload and serve handlers have no built-in auth check.**

- File: `/packages/sveltekit-runelayer/src/storage/handler.ts:13` and `/packages/sveltekit-runelayer/src/storage/serve.ts:12`
- `createUploadHandler` and `createServeHandler` accept any request without authentication. Auth is left entirely to the host application's route configuration.
- Impact: Low-Medium. If a host mounts these at a public route without adding middleware, anyone can upload files (within MIME/size limits) or read all stored files.
- Remediation: Consider adding an optional `access` function parameter to these handlers, or document clearly that auth must be applied by the host.

**Finding 4 -- No field-level access enforcement in query layer.**

- File: `/packages/sveltekit-runelayer/src/query/operations.ts`
- While the schema supports field-level `access` (`FieldAccess` in `schema/types.ts`), the query layer (`operations.ts`) only checks collection-level access. Field-level `read`/`update` access functions are never evaluated during query execution. The admin UI renders all fields regardless.
- Impact: Medium. Field-level access is defined in types but never enforced, creating a false sense of security.
- Remediation: Either enforce field-level access in the query layer (strip unauthorized fields from results / reject unauthorized field writes) or remove the `FieldAccess` type to avoid confusion.

### A02: Cryptographic Failures

**Session secrets: GOOD.** Better Auth handles session token generation and cookie signing. The config requires an explicit `secret` string.

**Finding 5 -- Demo app hardcoded fallback secret.**

- File: `/Users/tom/Github/sveltekit-runelayer/apps/demo/src/lib/server/runelayer.ts:17`
- `secret: process.env.AUTH_SECRET || "demo-secret-do-not-use-in-production-minimum-32-chars"`
- The fallback is only in the demo app, not the library. However, if someone copies this pattern, they ship with a known secret.
- Impact: Low (demo only). The naming convention helps but does not prevent misuse.
- Remediation: Throw at startup if `AUTH_SECRET` is missing in production mode.

**Token storage: ACCEPTABLE.** `accessToken`, `refreshToken`, and `password` hash are stored as plain text columns in the `account` table (`auth/schema.ts:41-43`). Better Auth handles hashing of passwords internally via the credential provider, so the `password` column in the `account` table stores the bcrypt hash, not plaintext.

### A03: Injection

**SQL Injection: GOOD.** All database operations in `/packages/sveltekit-runelayer/src/db/operations.ts` use Drizzle's parameterized query builders. Raw SQL in `globals.ts` and `admin-queries.ts` uses parameterized `args` arrays (e.g., `globals.ts:91`, `admin-actions.ts:153`).

**SQL identifier safety: GOOD.** Both `quoteIdent` implementations (`admin-queries.ts:16-19` and `globals.ts:17-22`) validate identifiers against `/^[a-zA-Z_][a-zA-Z0-9_-]*$/` before quoting.

**Finding 6 -- Sort column lookup is unvalidated but safe.**

- File: `/packages/sveltekit-runelayer/src/db/operations.ts:18`
- `const col = (table as any)[opts.sort.column]` uses user-supplied string as property key. If the column does not exist on the Drizzle table, `col` is `undefined`, which will cause Drizzle to generate broken SQL or throw. This is not injectable because Drizzle's tagged template literal (`sql\`${col} desc\``) treats the value as a column reference, not raw SQL. However, an attacker could cause server errors by supplying nonexistent column names.
- Impact: Low. Denial-of-service via error, not data exfiltration.
- Remediation: Validate that `opts.sort.column` exists in the table schema before using it.

**XSS in admin UI: GOOD.** Svelte templates escape all expressions by default. No `{@html}` is used in any admin component. The demo app uses `{@html htmlContent}` in `/apps/demo/src/routes/(site)/blog/[slug]/+page.svelte:73` but the `renderRichText` function (`/apps/demo/src/lib/rich-text.ts`) properly HTML-escapes all text content via `escapeHtml()`.

**Path traversal: GOOD.** The `safePath` function in `/packages/sveltekit-runelayer/src/storage/local.ts:14-21` validates resolved paths stay within the storage directory. The upload handler checks for `..` in folder paths (`handler.ts:30`). The serve handler rejects paths containing `..` (`serve.ts:16`).

### A04: Insecure Design

**Finding 7 -- First admin bootstrap race condition.**

- File: `/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:105-158`
- The `createFirstUser` action checks `countAdminUsers() > 0` to gate access, then creates a user and promotes them to admin in two separate operations (sign-up at line 124, then raw SQL UPDATE at line 152). Between the sign-up and the UPDATE, another concurrent request could also pass the `countAdminUsers() === 0` check and create a second admin.
- Impact: Low. Only exploitable during initial setup, and the window is very small. But in automated deployment scenarios this is more likely.
- Remediation: Use a database-level lock or transaction, or check-and-promote atomically.

**Finding 8 -- No password complexity requirements.**

- The `createFirstUser` and `createUser` actions accept any non-empty password. Better Auth may enforce minimum length internally, but the application layer does not validate password strength.
- Impact: Medium. Weak admin passwords are a common attack vector.
- Remediation: Add minimum length (12+ chars) and complexity validation in the admin actions.

### A05: Security Misconfiguration

**Finding 9 -- Health endpoint exposes infrastructure details without auth.**

- File: `/packages/sveltekit-runelayer/src/sveltekit/runtime.ts:191-216` (HTML view) and `390-418` (JSON API)
- The `/admin/health` endpoint is explicitly public (no auth guard). It reveals database connectivity status, collection count, global count, and server timestamp.
- Impact: Low. Information disclosure aids reconnaissance. Collection/global counts reveal schema complexity.
- Remediation: Acceptable for monitoring, but consider adding optional auth or IP allowlisting.

**Finding 10 -- SVG files served with `image/svg+xml` content type.**

- File: `/packages/sveltekit-runelayer/src/storage/serve.ts:37`
- SVG files can contain embedded JavaScript. Serving user-uploaded SVGs with `image/svg+xml` allows stored XSS if an attacker uploads a malicious SVG.
- Impact: High. If uploads are user-facing and SVG is an allowed MIME type, any user viewing the SVG in their browser will execute the embedded script.
- Remediation: Either (a) strip SVG from the default MIME type map and serve SVGs as `application/octet-stream`, (b) add `Content-Disposition: attachment` for SVG responses, or (c) sanitize SVG content on upload. At minimum, serve SVGs with `Content-Security-Policy: sandbox` header.

### A06: Vulnerable and Outdated Components

Not auditable from source alone. The `better-auth` dependency is at v1.5.6 per the docs. No known CVEs at time of review. The `zod` v4 compatibility workaround noted in `CLAUDE.md` suggests dependency version mismatches that should be monitored.

### A07: Identification and Authentication Failures

**Session management: GOOD.** Delegated to Better Auth with HTTP-only cookies. Session max age defaults to 7 days (`auth/index.ts:33`).

**Finding 11 -- No account lockout in CMS login.**

- File: `/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:68-103`
- The `login` action returns `fail(401)` on invalid credentials but implements no rate limiting or account lockout. An attacker can brute-force admin credentials indefinitely.
- Impact: Medium-High. Combined with the lack of password complexity requirements (Finding 8).
- Remediation: Implement exponential backoff, account lockout after N failures, or integrate with Better Auth's rate limiting if available. At minimum, add server-side rate limiting per IP/email.

**Finding 12 -- Email verification not enforced by default.**

- File: `/packages/sveltekit-runelayer/src/auth/types.ts:36`
- `requireEmailVerification` defaults to `false`. The first admin user created via bootstrap has no email verification.
- Impact: Low. Acceptable default for development but should be documented as a production consideration.

### A08: Software and Data Integrity Failures

**Finding 13 -- Form data passed without schema validation.**

- File: `/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:171-172` and `189-190`
- `Object.fromEntries(formData.entries())` is passed directly to the query layer. The collection schema defines `ValidationFn` per field (`schema/types.ts:22-25`) but these validation functions are never invoked in the admin actions or query layer.
- Impact: Medium. Invalid data (wrong types, constraint violations) can be written to the database. Combined with Finding 2 (mass assignment), this allows writing to any column.
- Remediation: Run each field's `validate` function before persisting. Filter data to only include declared fields.

### A09: Security Logging and Monitoring Failures

**Finding 14 -- No security event logging.**

- The codebase has no logging for: failed login attempts, access control denials, admin user creation/deletion, privilege escalation, or storage access.
- The only logging is `console.error` for afterHook failures (`hooks/runner.ts:29`).
- Impact: Medium. Without audit logs, security incidents cannot be detected or investigated.
- Remediation: Add structured logging for authentication events, access control decisions, and admin operations. Consider an audit log table.

### A10: Server-Side Request Forgery

**Finding 15 -- `event.fetch` in admin actions makes internal requests.**

- Files: `/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:55` and `/packages/sveltekit-runelayer/src/sveltekit/runtime.ts:148`
- The admin actions use `event.fetch()` to call Better Auth endpoints internally. The URLs are constructed from the configured `authBasePath`, not from user input. The `callbackURL` parameter in login/signup (lines 94, 134) comes from the hardcoded `cfg.adminPath`, not user input.
- Impact: None. No user-controlled URLs are fetched server-side.

## Additional Security Findings

**Finding 16 -- `safePath` function edge case with symbolic links.**

- File: `/packages/sveltekit-runelayer/src/storage/local.ts:14-21`
- The path traversal check uses `resolve()` and `relative()` but does not check for symbolic links. If an attacker can create a symlink inside the upload directory (e.g., via a race condition or a separate vulnerability), `safePath` would follow it to arbitrary locations.
- Impact: Very Low. Requires a pre-existing way to create symlinks in the upload directory.

**Finding 17 -- MIME type validation is client-trust based.**

- File: `/packages/sveltekit-runelayer/src/storage/handler.ts:25`
- `allowedMimeTypes.includes(file.type)` checks the client-provided Content-Type, not the actual file bytes. An attacker can upload an executable or HTML file with a spoofed MIME type.
- Impact: Medium. Combined with Finding 10 (SVG XSS), this means MIME validation provides no real security guarantee against malicious uploads.
- Remediation: Add magic-byte validation (e.g., `file-type` npm package) for at least image types.

**Finding 18 -- Collection `auth` config stores hash/salt/token in the main table.**

- File: `/packages/sveltekit-runelayer/src/db/schema.ts:83-88`
- When `auth: true` on a collection, `hash`, `salt`, `token`, and `tokenExpiry` columns are added to the same table. The query layer's `find` and `findOne` return all columns. These sensitive fields will be included in API responses unless the host adds field-level filtering.
- Impact: Medium. Hash and salt leakage aids offline brute-force attacks.
- Remediation: Automatically exclude `hash`, `salt`, `token`, `tokenExpiry` from query results, similar to how ORMs handle `hidden` fields.

## Action Items

### Critical

- **[Finding 10]** SVG stored XSS: Serve SVGs with `Content-Disposition: attachment` or `Content-Security-Policy: sandbox` header, or exclude SVG from the MIME type map in `serve.ts:37`.

### Medium

- **[Finding 2/13]** Mass assignment + missing validation: Filter form data in `admin-actions.ts` create/update actions through the collection's field definitions. Only persist declared field names. Invoke field-level `validate` functions before writing.
- **[Finding 4]** Field-level access is defined but never enforced. Either implement it in the query layer or remove the `FieldAccess` type to avoid a false sense of security.
- **[Finding 11]** No brute-force protection on the login endpoint. Add rate limiting per IP/email or account lockout.
- **[Finding 14]** Add security event logging for auth events, access denials, and admin operations.
- **[Finding 17]** Add magic-byte validation for uploaded files to prevent MIME type spoofing.
- **[Finding 18]** Automatically exclude `hash`/`salt`/`token`/`tokenExpiry` columns from query results for collections with `auth: true`.
- **[Finding 8]** Enforce minimum password length and complexity for admin accounts.

### Low

- **[Finding 5]** Demo app hardcoded secret fallback. Consider throwing at startup if `AUTH_SECRET` is unset and `NODE_ENV === "production"`.
- **[Finding 6]** Validate sort column exists in the table schema before using it in `db/operations.ts`.
- **[Finding 7]** First-admin bootstrap race condition. Use a transaction or database lock for the check-and-promote sequence.
- **[Finding 9]** Health endpoint information disclosure. Document that it is intentionally public, or add optional auth.
- **[Finding 12]** Document that `requireEmailVerification: false` is unsafe for production.

### Recommendations

- Add a `Content-Security-Policy` response header to admin pages to mitigate any future XSS vectors.
- Consider adding `Referrer-Policy: strict-origin-when-cross-origin` and `X-Content-Type-Options: nosniff` headers to storage responses.
- Add an audit log table for tracking admin operations (user CRUD, content changes, login attempts).
- Document the `system` query API's elevated privileges and warn against passing it to untrusted contexts.
- Consider adding a `beforePersist` hook that runs after access control but before database write, to allow schema-aware data sanitization.
