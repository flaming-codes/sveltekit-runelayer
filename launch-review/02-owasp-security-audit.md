# OWASP Top 10 Security Audit

## Synopsis

`sveltekit-runelayer` has a solid security baseline: auth headers are stripped before session injection, access control is deny-by-default when no `Request` exists, and the database layer mostly relies on parameterized Drizzle queries. Against the latest Payload CMS release line (`v3.80.0` on March 20, 2026), the package is still behind on hardening. The main gaps are unfiltered admin writes, inline SVG serving, field-level access that exists in types but not in enforcement, and upload flows that trust client MIME metadata more than they should.

## Grade: 6.5/10

The architecture is credible, but it is not hardened enough for a confident security-oriented release. The code is safer than a typical hand-rolled CMS, yet the package still has one critical stored-XSS risk and several medium-severity integrity and exposure problems.

## Main Content

### What is solid

- `packages/sveltekit-runelayer/src/auth/index.ts:45-58` strips inbound `x-user-*` headers before session resolution, which blocks trivial header spoofing.
- `packages/sveltekit-runelayer/src/query/access.ts:7-18` denies access when an access function exists but no request context is present.
- `packages/sveltekit-runelayer/src/db/operations.ts:1-48` uses Drizzle builders for normal CRUD, which keeps user values out of raw SQL strings.
- `packages/sveltekit-runelayer/src/storage/local.ts:13-20` and `packages/sveltekit-runelayer/src/storage/serve.ts:12-18` do attempt traversal checks around storage paths.

### A01: Broken Access Control

The biggest access-control issue is not the auth boundary itself; it is the gap between schema intent and runtime enforcement.

- `packages/sveltekit-runelayer/src/query/operations.ts:19-74` only checks collection-level access. Field-level access is defined in schema types, but it is never enforced during reads or writes.
- That creates a false sense of security for sensitive fields. A config can declare `FieldAccess`, but the runtime will still return and persist the full row unless a host adds extra filtering.
- `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:180-215` passes `Object.fromEntries(formData.entries())` directly into `query.create()` and `query.update()`. There is no allowlist against the collection schema, so hidden/system fields can be injected by a crafted request.

### A02: Cryptographic Failures

The core auth stack depends on Better Auth and is not the weak point. The problem is exposure of auth-related data once it is in the CMS data model.

- `packages/sveltekit-runelayer/src/db/schema.ts` adds `hash`, `salt`, `token`, and `tokenExpiry` columns when `auth: true` is enabled on a collection.
- `packages/sveltekit-runelayer/src/query/operations.ts` returns full rows with no redaction layer.
- That means a collection with auth enabled can leak credential-adjacent columns through normal read paths unless the host builds its own filtering on top.

### A03: Injection

The SQL layer itself is reasonably controlled, but there is still a schema/data injection problem at the application boundary.

- Raw SQL use in `packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts:19-42` and `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:170-175` is parameterized and not the primary risk.
- The real issue is the unvalidated FormData path in `admin-actions.ts:185-209`. Because the field set is not validated before persistence, clients can write arbitrary keys that match table columns.
- `packages/sveltekit-runelayer/src/query/operations.ts:53-62` also accepts whatever object is passed in after hooks, so the database layer will happily persist malformed shapes if the caller lets them through.

### A04: Insecure Design

The design is serviceable, but some runtime behaviors are too permissive for a package that wants to be a secure CMS foundation.

- `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:125-177` creates the first admin in two steps and then elevates the user with a separate SQL update. That sequence is race-prone during bootstrap.
- `packages/sveltekit-runelayer/src/query/operations.ts:19-74` has no transaction boundary around hook execution plus persistence. If a hook mutates external state and the write fails, the system can drift.
- `packages/sveltekit-runelayer/src/sveltekit/runtime.ts:203-237` exposes a public health path. That is fine, but it should be treated as intentional metadata disclosure, not a general auth bypass point.

### A05: Security Misconfiguration

The storage layer is the clearest configuration-sensitive risk.

- `packages/sveltekit-runelayer/src/storage/handler.ts:13-40` validates file size only after `request.formData()` has already parsed the full body.
- `packages/sveltekit-runelayer/src/storage/local.ts:37-38` then reads the uploaded `File` into memory again with `arrayBuffer()`.
- That is a poor fit for large uploads and makes the max-size check weaker than it looks because the expensive parse already happened.
- `packages/sveltekit-runelayer/src/storage/handler.ts:25-27` trusts `file.type`, which is client-supplied metadata. MIME allowlists help, but they are not real content validation.

### A06: Vulnerable and Outdated Components

This cannot be fully assessed from source alone, but the dependency profile matters.

- The repo currently relies on Better Auth, Drizzle, Carbon, and SvelteKit packages that change fast.
- `docs/integration-decisions.md` already calls out the `zod/v4` alias requirement for Better Auth. That is a build-time compatibility concern, not a security hole, but it is the kind of dependency friction that often hides security regressions.

### A07: Identification and Authentication Failures

Authentication works, but the login surface still lacks obvious hardening.

- `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:88-123` has no rate limiting, lockout, or backoff for repeated failed sign-in attempts.
- `packages/sveltekit-runelayer/src/auth/index.ts:51-57` silently treats session-resolution failures as anonymous access. That is operationally convenient, but it can mask auth outages and make incidents harder to detect.
- `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:327-360` prevents self-deletion and the removal of the last admin account, which is good.

### A08: Software and Data Integrity Failures

This is where the package is weakest after access control.

- `packages/sveltekit-runelayer/src/query/operations.ts:42-62` does not validate payload shape before persistence.
- `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:180-215` does not sanitize the submitted object against the collection schema.
- `packages/sveltekit-runelayer/src/db/schema.ts` defines field types, but those types are not being used as a persistence guardrail.
- The result is a CMS that looks schema-driven from the outside but still accepts unsanitized, user-shaped writes at the boundary.

### A09: Security Logging and Monitoring Failures

There is almost no audit trail.

- The codebase has no structured logging for login attempts, access denials, admin CRUD, bootstrap promotion, or upload events.
- The only visible error logging in the core runtime is hook failure handling.
- For a CMS, that is too little evidence for incident response.

### A10: Server-Side Request Forgery

I did not find a meaningful SSRF issue in the reviewed paths.

- `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:64-85` and `packages/sveltekit-runelayer/src/sveltekit/runtime.ts:114-182` build Better Auth admin URLs from fixed base paths, not user input.

## Action Items

### Critical

- Remove inline SVG execution risk in `packages/sveltekit-runelayer/src/storage/serve.ts:30-45`. Either block SVG by default, serve it as an attachment, or sanitize it before storage. Right now, if SVG uploads are allowed, a stored XSS path exists.

### Medium

- Add schema-aware allowlisting before `query.create()` and `query.update()` in `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:180-215`. Only persist declared collection fields and reject unknown keys.
- Enforce or remove field-level access semantics. `FieldAccess` currently reads like a security feature, but `packages/sveltekit-runelayer/src/query/operations.ts:19-74` does not apply it.
- Redact auth-sensitive columns such as `hash`, `salt`, `token`, and `tokenExpiry` from normal query results when `auth: true` is enabled on a collection.
- Add real upload content validation. `file.type` is not sufficient, and `request.formData()` plus `arrayBuffer()` makes the current path memory-heavy under attack.
- Add login throttling or account lockout to `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:88-123`.

### Low

- Make first-admin bootstrap atomic. The check-plus-promote sequence in `packages/sveltekit-runelayer/src/sveltekit/admin-actions.ts:125-177` is race-prone during initial setup.
- Treat the public health endpoint as intentional metadata exposure and document it clearly so it is not mistaken for an auth bypass.
- Reduce operational ambiguity in `packages/sveltekit-runelayer/src/auth/index.ts:51-57` by surfacing session-resolution failures instead of silently swallowing them everywhere.

### Recommendation

- Add structured audit logging for auth events, admin CRUD, access denials, upload operations, and first-admin promotion.
- Add defense-in-depth response headers for storage responses, especially `X-Content-Type-Options: nosniff` and a safer default for downloadable content.
- Document the privileged nature of `systemRequest()` in `packages/sveltekit-runelayer/src/sveltekit/admin-queries.ts:63-71` so host code does not pass it into untrusted paths by accident.
