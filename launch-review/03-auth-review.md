# Authentication & Authorization Review

## Synopsis

The auth system is architecturally sound: Better Auth handles session lifecycle via HTTP-only cookies, header stripping prevents spoofing from external clients, and the deny-by-default access pattern in the query layer is correctly implemented. However, there are several gaps that matter for production: banned users are not checked at the handle-hook level, field-level access control is declared but never enforced, the `systemRequest` fabricates admin-privileged headers that bypass access checks without any audit trail, there is no rate limiting or password policy enforcement, and CSRF protection relies entirely on Better Auth defaults with no explicit configuration or verification.

## Grade: 6/10

## Architecture Overview

Auth flows through the system as follows:

1. `createRunelayer()` in `/packages/sveltekit-runelayer/src/plugin.ts` (line 45) calls `createAuth()` which initializes Better Auth with the Drizzle adapter and admin plugin.
2. The returned `handle` hook (exposed as a SvelteKit `Handle`) is the single entry point for all requests.
3. Inside `createAuth()` at `/packages/sveltekit-runelayer/src/auth/index.ts` (lines 45-48), the hook strips `x-user-id`, `x-user-role`, `x-user-email` from incoming requests.
4. It then resolves the session via `auth.api.getSession()` (line 51), and if valid, injects trusted headers and populates `event.locals.user`/`event.locals.session` (lines 53-57).
5. Requests matching `authBasePath` (default `/api/auth`) are forwarded to Better Auth's `svelteKitHandler` (line 63).
6. Admin routes are guarded by `guardAdminRoute()` in `/packages/sveltekit-runelayer/src/sveltekit/runtime.ts` (lines 49-88), which checks for admin role.
7. Collection/global CRUD operations go through the query layer at `/packages/sveltekit-runelayer/src/query/operations.ts`, which calls `checkAccess()` from `/packages/sveltekit-runelayer/src/query/access.ts`.
8. Access functions (e.g., `isAdmin()`, `isLoggedIn()`, `hasRole()`) in `/packages/sveltekit-runelayer/src/auth/access.ts` read the trusted `x-user-*` headers injected by the handle hook.

## Detailed Findings

### Session Management

**What works well:**

- Better Auth manages session creation, cookie setting, and expiry. Sessions use HTTP-only cookies (Better Auth default), which is correct.
- Session TTL is configurable via `sessionMaxAge` with a sensible 7-day default (`/packages/sveltekit-runelayer/src/auth/index.ts`, line 33).
- The `getSession` call in the handle hook catches errors gracefully (line 51: `.catch(() => null)`), preventing session resolution failures from crashing the request pipeline.
- The E2E tests at `/packages/sveltekit-runelayer/src/__e2e__/auth-journeys.e2e.test.ts` verify that re-login produces distinct session tokens (line 589: `expect(secondToken).not.toBe(firstToken)`).
- Logout calls Better Auth's `/sign-out` endpoint and redirects (`/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts`, line 391).

**Issues:**

1. **Banned user bypass** -- The handle hook at `/packages/sveltekit-runelayer/src/auth/index.ts` lines 52-57 injects auth headers whenever `session.user` exists. There is no check for `session.user.banned === true`. Better Auth's admin plugin stores `banned` on the user table (`/packages/sveltekit-runelayer/src/auth/schema.ts`, line 11), but the handle hook does not consult it. If Better Auth's `getSession()` returns sessions for banned users (which depends on the BA version and configuration), a banned user would still pass `isLoggedIn()` and `hasRole()` checks. This needs explicit verification.

2. **Session revocation on role change** -- When an admin changes a user's role via `updateUser` (`/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts`, lines 278-335), existing sessions for that user are not invalidated. The user retains their old role until the session expires or they re-authenticate. This is a privilege persistence window of up to 7 days.

3. **No session invalidation on password change** -- `set-user-password` is called at line 315 but other active sessions for the target user are not revoked. A compromised session remains valid after password rotation.

### Access Control

**What works well:**

- The deny-by-default pattern in `/packages/sveltekit-runelayer/src/query/access.ts` (lines 10-16) is correctly implemented: if an access function is defined but no `Request` is provided, access is denied with 403.
- Collection-level access is enforced for all five CRUD operations in `/packages/sveltekit-runelayer/src/query/operations.ts`.
- The admin guard in `guardAdminRoute()` correctly blocks non-admin authenticated users with 403 and unauthenticated users with a redirect to login.
- The `createFirstUser` action checks that no admin exists before allowing execution (`/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts`, line 111), and the E2E test confirms a second admin cannot be created through this path after the first exists (line 486-489 of the E2E test).

**Issues:**

3. **Field-level access is declared but never enforced** -- `FieldAccess` is defined in `/packages/sveltekit-runelayer/src/schema/types.ts` (lines 16-20), field configs accept an `access` property (`/packages/sveltekit-runelayer/src/schema/fields.ts`, line 8), and the documentation promotes field-level access as a feature (`/docs/auth.md`, lines 177-183). However, the query layer in `/packages/sveltekit-runelayer/src/query/operations.ts` only calls `checkAccess()` at the collection level. No code in the entire codebase evaluates `field.access.read` or `field.access.update`. Fields configured with `access: { read: isAdmin() }` are returned to all users regardless. This is a documentation-to-implementation mismatch that could lead users to believe their data is protected when it is not.

4. **`systemRequest` fabricates admin credentials** -- `/packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts` lines 73-80 create a synthetic `Request` with `x-user-id: "runelayer-system"` and `x-user-role: "admin"`. This request never passes through the handle hook, so the header-stripping protection is irrelevant. The `system` query API (`runtime.ts`, line 106) uses this to bypass all access checks. While the intent is legitimate (server-side system operations), the approach is fragile: any code path that accidentally exposes `app.system` to user input would grant full admin access. There is also no audit logging to distinguish system operations from real admin actions.

### Header-Based Auth Context

**What works well:**

- Header stripping at `/packages/sveltekit-runelayer/src/auth/index.ts` lines 46-48 correctly prevents external spoofing. This is the right approach.
- The three headers (`x-user-id`, `x-user-role`, `x-user-email`) are only set after successful session resolution (lines 53-55).
- Access functions in `/packages/sveltekit-runelayer/src/auth/access.ts` are clean and minimal, reading only from the trusted headers.

**Issues:**

5. **Role as a single string check** -- `hasRole("editor")` at `/packages/sveltekit-runelayer/src/auth/access.ts` line 29 does a strict equality check (`=== role`). This means `hasRole("editor")` does not match users with role `"admin"`. This is by design but creates a usability trap: if a collection uses `update: hasRole("editor")`, admins cannot update documents. The E2E test at `/packages/sveltekit-runelayer/src/__e2e__/access-control.e2e.test.ts` line 59 confirms this -- the `update` access is set to `hasRole("editor")`, and the admin test at line 187 uses `editorReq`, not `adminReq`. This means admins are implicitly excluded unless they also have the editor role or the access function is written as a custom function checking for both. The `countAdminUsers` query at `/packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts` line 42 uses `LIKE '%,admin,%'` suggesting comma-separated roles were considered, but `hasRole()` does not support this.

6. **Headers on mutable Request object** -- The handle hook modifies `event.request.headers` in-place (lines 46-55). In SvelteKit, `event.request` is generally considered read-only. While this works in practice because SvelteKit does not freeze the headers object, it relies on an implementation detail. If SvelteKit ever freezes request headers, this will break silently. Using `event.locals` for auth context (which is already populated at lines 56-57) would be more robust and idiomatic.

### Admin UI Auth Flow

**What works well:**

- The Login component at `/packages/sveltekit-runelayer/src/admin/components/Login.svelte` uses standard form POST with server-side form actions, avoiding client-side token handling.
- The first-user bootstrap flow correctly redirects between `/admin/create-first-user` and `/admin/login` based on whether an admin exists.
- The E2E tests cover the complete lifecycle: first-user creation, login with wrong password, login with correct password, session validation, non-admin rejection, and logout.
- The `deleteUser` action at `/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts` line 346 prevents self-deletion and ensures at least one admin remains (line 366).

**Issues:**

7. **Login error messages are generic** -- This is actually good from a security perspective. The login action returns "Invalid email or password." (line 99) without distinguishing between unknown email and wrong password. This prevents user enumeration through the admin login form.

8. **No redirect loop protection** -- `guardAdminRoute()` in `runtime.ts` could theoretically enter a redirect loop if the `countAdminUsers` query fails unexpectedly (it catches "no such table" errors but throws on other database errors). A database timeout during the admin count query would propagate as a 500 rather than a controlled error page.

### Missing Security Controls

9. **No rate limiting** -- There is no rate limiting on the login endpoint, the sign-up endpoint, or the Better Auth API. The security docs at `/docs/security.md` line 67 acknowledge this: "no built-in global request rate limiting." This leaves the auth system vulnerable to brute-force password attacks. Better Auth may have some built-in protections depending on the version, but this is not configured or verified.

10. **No password policy enforcement** -- The `createFirstUser` and `login` actions validate that password is non-empty but do not enforce minimum length, complexity, or check against known-breached passwords. Better Auth may enforce a minimum length internally (typically 8 characters), but this is not configured in the `createAuth()` call at `/packages/sveltekit-runelayer/src/auth/index.ts` and there is no user-facing validation feedback.

11. **No explicit CSRF configuration** -- The codebase has zero references to "csrf", "CSRF", or "SameSite" in any source file. SvelteKit provides CSRF protection for form submissions by default (checking the `Origin` header), and Better Auth may set `SameSite` on cookies, but neither is explicitly configured or tested. The E2E auth test harness at line 233-234 sets `origin: "http://localhost:3000"` which would satisfy SvelteKit's CSRF check, but no test verifies that requests without a matching origin are rejected.

12. **Auth secret has no minimum length validation** -- `defineConfig()` at `/packages/sveltekit-runelayer/src/config.ts` accepts any string for `auth.secret` without validating minimum length or entropy. A weak secret (e.g., `"123"`) would be silently accepted, compromising session token security.

13. **`requireEmailVerification` config is accepted but never wired** -- The `AuthConfig` type at `/packages/sveltekit-runelayer/src/auth/types.ts` line 36 declares `requireEmailVerification?: boolean`, but `createAuth()` at `/packages/sveltekit-runelayer/src/auth/index.ts` never passes it to Better Auth's configuration. Users who set this option get no effect.

14. **`CollectionAuthConfig` is defined but unused** -- `/packages/sveltekit-runelayer/src/schema/types.ts` lines 56-61 define `CollectionAuthConfig` with `maxLoginAttempts` and `lockTime`, but no code in the repository reads these values. The auth doc at `/docs/auth.md` lines 229-240 documents this feature as if it works.

## Action Items

### Critical

- **[C1] Enforce field-level access control or remove the feature from types/docs.** Currently `FieldAccess` is a false promise. Users configuring `access: { read: isAdmin() }` on fields believe the data is protected. Either implement field-level filtering in the query layer (strip fields from returned documents based on `field.access.read`, reject writes based on `field.access.update`) or remove `FieldAccess` from the schema types and documentation to avoid a false sense of security. Files: `/packages/sveltekit-runelayer/src/query/operations.ts`, `/packages/sveltekit-runelayer/src/schema/types.ts`, `/docs/auth.md`.

- **[C2] Check banned status in the auth handle hook.** Add a check after session resolution: if `session.user.banned` is truthy, do not inject auth headers and do not populate `event.locals`. File: `/packages/sveltekit-runelayer/src/auth/index.ts`, after line 52.

### Medium

- **[M1] Invalidate sessions on role change.** When `updateUser` changes a user's role, call Better Auth's session revocation API to invalidate all existing sessions for that user. File: `/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts`, after line 310.

- **[M2] Invalidate other sessions on password change.** After `set-user-password` succeeds, revoke all sessions except the current admin's. File: `/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts`, after line 325.

- **[M3] Add auth secret minimum length validation.** In `createAuth()` or `defineConfig()`, validate that `config.secret` is at least 32 characters. Throw a clear error at startup if it is too short. File: `/packages/sveltekit-runelayer/src/auth/index.ts` or `/packages/sveltekit-runelayer/src/config.ts`.

- **[M4] Wire `requireEmailVerification` or remove it from the config type.** Either pass it to Better Auth's `emailAndPassword.requireEmailVerification` option, or remove the property from `AuthConfig` to avoid misleading users. File: `/packages/sveltekit-runelayer/src/auth/index.ts`, line 32.

- **[M5] Remove or mark `CollectionAuthConfig` as unimplemented.** `maxLoginAttempts`, `lockTime`, `tokenExpiration`, and `verify` are dead config options. Remove from types and docs, or implement them. Files: `/packages/sveltekit-runelayer/src/schema/types.ts`, `/docs/auth.md`.

### Low

- **[L1] Document the `hasRole()` non-hierarchical behavior.** Make it explicit in docs that `hasRole("editor")` does not include admins. Provide a helper or documented pattern for hierarchical role checks (e.g., `hasAnyRole("editor", "admin")`). File: `/docs/auth.md`.

- **[L2] Add CSRF protection test.** Write a test that verifies form submissions without a valid `Origin` header are rejected. This confirms SvelteKit's default CSRF protection is active and has not been accidentally disabled.

- **[L3] Consider moving auth context from headers to `event.locals` exclusively.** The dual storage (headers + locals) creates two sources of truth. Access functions could read from a typed locals object instead of parsing string headers. This would be more idiomatic SvelteKit and avoid reliance on mutable request headers.

- **[L4] Add a password length feedback to the admin UI.** Even if Better Auth enforces a minimum internally, the Login/CreateFirstUser forms should provide client-side feedback about password requirements.

### Recommendations

- **Rate limiting:** Document that rate limiting must be applied at the reverse proxy / CDN layer (nginx, Cloudflare, etc.) for production deployments. Consider adding an optional rate-limiting middleware hook point for self-hosted deployments without a proxy.

- **Audit logging:** The `systemRequest` synthetic admin context is invisible in logs. Consider adding a distinct marker (e.g., a custom header or a separate access path) so that system-initiated operations can be distinguished from human-admin operations in any future audit trail.

- **Session binding:** Consider binding sessions to IP address or user-agent fingerprint for additional session hijacking protection. The schema already stores `ipAddress` and `userAgent` on the session table (`/packages/sveltekit-runelayer/src/auth/schema.ts`, lines 25-26), but these are not validated on subsequent requests.
