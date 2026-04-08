# Security Model

Security measures and known limits for `sveltekit-runelayer`.

## Authentication

Better Auth manages sessions via HTTP-only cookies.

The runtime `handle` hook:

1. strips inbound `x-user-id`, `x-user-role`, `x-user-email`
2. resolves session from cookies
3. injects verified `x-user-*` headers only after session validation
4. evaluates storage-route file serving only after the same auth sanitization/session boundary

When using `createRunelayer()`, storage file serving is authenticated by default. Set
`storage.publicRead: true` to opt into public file serving.

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

### Field-level access enforcement

Field-level access is enforced at runtime in the query layer:

- `create`/`update` checks field `access.create` and `access.update`
- `find`/`findOne` applies field `access.read` and redacts denied fields from results
- missing request context with a defined field access function is denied by default

## Schema enforcement at query boundary

Writes are schema-validated before persistence:

- unknown fields are rejected (allowlist-only)
- reserved/system fields (`id`, timestamps, auth internals, version internals) are rejected
- required fields are enforced on create
- built-in field constraints (e.g. select options, min/max, minLength/maxLength) are enforced
- custom field `validate` functions are executed

This prevents mass-assignment style writes and keeps runtime behavior aligned with schema definitions.

### Global document enforcement

Global document writes go through `enforceWritePayload` using the global's field config, with the same schema validation, normalization, and field-level access checks as collection documents. Global document reads apply `enforceReadProjection` to redact fields denied by field-level access rules.

### Populated sub-document projection

When `depth: 1` populates relationship references, fetched sub-documents from referenced collections are run through `enforceReadProjection` using the referenced collection's field config. Field-level access rules on referenced collections are enforced on populated documents.

### Polymorphic relationship collection validation

For polymorphic relationship fields (`relationTo: string[]`), the `_collection` value in sentinel objects is validated against the `relationTo` allowlist on write. Sentinels referencing collections not in the allowlist are rejected with a 400 error.

### Admin API endpoint

The `/runelayer/api/{slug}` endpoint runs inside the shared auth `handle` boundary and requires an authenticated admin user. It uses per-request access context (not system context), ensuring collection-level access rules are respected. Responses include `Cache-Control: private, no-store` to prevent proxy caching of sensitive data.

## Storage security

### Path traversal checks

Storage path operations resolve and validate paths to prevent escaping the configured storage root.

### Upload validation

Upload handler validates:

- file presence
- max size
- allowed MIME types
- folder path shape (normalized relative paths only)
- detected-vs-declared MIME consistency for known file signatures

### Safer file serving

Serve handler now applies defensive response controls:

- `X-Content-Type-Options: nosniff`
- `Content-Disposition` is set explicitly
- SVG files are served as attachments by default (`allowInlineSvg` must be explicitly enabled)

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

- no built-in global request rate limiting
- MIME validation remains lightweight and signature-based for common formats, not full deep content scanning/sanitization
- if inline SVG is explicitly enabled, host code remains responsible for SVG sanitization policy

## Deployment checklist

- set a strong `BETTER_AUTH_SECRET`
- configure upload allowlists and size limits
- apply drizzle-kit migrations before startup
- run behind HTTPS and apply rate limiting at edge/proxy level
