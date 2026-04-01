# Authentication & Authorization Review

## Synopsis

Runelayer's auth stack is built on a good foundation: Better Auth handles credentials and sessions, the SvelteKit handle hook strips spoofed headers before trust is established, and the query layer correctly denies server-side access when no request context exists. The problem is that several important auth guarantees exist only in types or docs, not in runtime behavior. Field-level access is declared but not enforced, collection auth options are schema-only, banned users are not checked explicitly, role handling is closed and non-hierarchical, and role/password changes do not revoke existing sessions.

## Grade: 6/10

## Main Body

The implementation is coherent, but it mixes strong security patterns with a few false boundaries. The strongest parts are the header anti-spoofing in `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/auth/index.ts:45-58`, the deny-by-default guard in `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/query/access.ts:3-20`, and the admin route guard in `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/runtime.ts:50-88`.

What is not solid yet is the contract surface. The docs promise field-level access and collection auth features, but the runtime never evaluates `field.access.*` or uses `CollectionAuthConfig` for anything beyond schema shape. `requireEmailVerification` is accepted in `AuthConfig` but not passed to Better Auth. That means the public API says "supported" while the code path says "placeholder."

The role model is also narrower than the docs suggest. `SUPPORTED_USER_ROLES` is hard-coded, `normalizeUserRole()` collapses unknown roles to `"user"`, and `hasRole()` is an exact equality check. That is fine for a small CMS, but it is not a flexible enterprise auth model and it makes hierarchical permissions awkward. The current behavior is especially surprising because `isAdmin()` is just `hasRole("admin")`, so admin is not a superset of editor.

Session handling is functional but incomplete. Existing sessions are not revoked when an admin changes a user's role or password in `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:274-325`, so privilege changes can linger until the session naturally expires. The first-user bootstrap also upgrades the account with a second SQL write after sign-up at `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:170-175`, which is workable but not atomic.

The internal `systemRequest()` bypass at `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts:63-71` is intentional, but it is a sharp edge. It gives server code full admin privileges without going through the same auth path as normal requests, so it needs a stronger boundary and better documentation than it has now.

## Action Items

### Critical

- Enforce field-level access control in the query/admin write path or remove `FieldAccess` and the related docs. Right now `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/schema/types.ts:16-20`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/schema/fields.ts:1-8`, and `/Users/tom/Github/sveltekit-runelayer/docs/auth.md:175-185` promise protection that `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/query/operations.ts` never applies.

### Medium

- Explicitly reject banned users in `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/auth/index.ts:50-58`, or document and test that Better Auth already prevents banned sessions from resolving.
- Revoke active sessions when a user's role or password changes in `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:274-325`.
- Wire `requireEmailVerification` into Better Auth, or remove it from `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/auth/types.ts:26-38` and `/Users/tom/Github/sveltekit-runelayer/docs/auth.md:14-33`.
- Treat `CollectionAuthConfig` as unimplemented until it has runtime behavior. The current schema-only path in `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/schema/types.ts:55-60`, `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/schema/collections.ts:9-14`, and `/Users/tom/Github/sveltekit-runelayer/docs/auth.md:229-239` is misleading.
- Make the first-admin bootstrap atomic, or move the role elevation into the auth provider flow so the sign-up and promotion cannot diverge.

### Low

- Document that `hasRole("editor")` does not include admins and that the role model is intentionally closed in `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/auth/access.ts:1-27`.
- Move auth context to typed `event.locals` instead of mutating request headers in place. The current dual source of truth works, but it is brittle and more difficult to reason about.
- Add a production note for auth secret strength and rate limiting. Neither is enforced in code today, so deployments need explicit guidance.

### Recommendation

- Add tests for banned-user handling, role-change/session revocation, and bootstrap behavior. These are the auth paths most likely to regress quietly.
- Decide whether `system` query access is a first-class internal API or just an implementation detail, then document and gate it accordingly.
- If collection auth is meant to be a real feature, implement it as a separate runtime path rather than leaving it as schema metadata.
