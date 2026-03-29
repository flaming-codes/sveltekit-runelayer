# Security Model

Security measures and known limits for `sveltekit-runelayer`.

## Authentication

Better Auth manages sessions via HTTP-only cookies.

The runtime `handle` hook:

1. strips inbound `x-user-id`, `x-user-role`, `x-user-email`
2. resolves session from cookies
3. injects verified `x-user-*` headers only after session validation

This blocks header spoofing attempts from external clients.

## Access control

### Deny-by-default

Query layer behavior:

- no access function: allow
- access function + request: evaluate function result
- access function + missing request: deny with 403

This protects against accidental server-side bypass.

### Request-scoped access context

Access functions receive only `Request` and derived values. They do not depend on SvelteKit internals.

## Storage security

### Path traversal checks

Storage path operations resolve and validate paths to prevent escaping the configured storage root.

### Upload validation

Upload handler validates:

- file presence
- max size
- allowed MIME types
- folder path shape

## Database security

### SQL injection

Drizzle query builders are parameterized. User values are not interpolated into raw SQL strings in normal CRUD flow.

### Migration control

Runtime does not mutate schema. Migrations are host-managed through drizzle-kit before startup.

Benefits:

- schema changes are explicit and reviewable
- migration SQL is versioned with app code
- startup behavior is deterministic

## Known limitations

- strict admin gating can be disabled (`admin.strictAccess: false`), which intentionally relaxes access checks
- no built-in global request rate limiting
- MIME validation is header-based unless host adds content sniffing

## Deployment checklist

- set a strong `BETTER_AUTH_SECRET`
- keep `admin.strictAccess` enabled unless you explicitly need an open admin integration
- configure upload allowlists and size limits
- apply drizzle-kit migrations before startup
- run behind HTTPS and apply rate limiting at edge/proxy level
