# Security Model

This document covers the security measures implemented in Runekit and known attack surfaces.

## Authentication

### Session Management

Better Auth handles session management via HTTP-only cookies. The auth handle hook:

1. **Strips incoming auth headers** — `x-user-id`, `x-user-role`, `x-user-email` are removed from every incoming request before processing
2. **Resolves session** — Better Auth's `getSession()` reads the session cookie and validates it
3. **Injects verified headers** — only after successful session resolution are the `x-user-*` headers set

This prevents header spoofing attacks where an external client sets `x-user-role: admin` to gain elevated access.

### Anti-Spoofing

```
Incoming request with x-user-role: admin (malicious)
  → handle hook strips x-user-role header
  → Better Auth resolves session from cookie
  → If valid session: sets x-user-role from session data
  → If no session: headers remain absent → access denied
```

### Auth Secret

The `BETTER_AUTH_SECRET` environment variable is used for:

- Signing session tokens/cookies
- CSRF protection

It must be set in both development (`.env`) and production environments. In SvelteKit, it must also be available at build time.

## Access Control

### Deny-by-Default

The query layer enforces access control with a deny-by-default policy:

- **No access function** → allowed (public access)
- **Access function + valid request** → function evaluated
- **Access function + no request** → **denied** (prevents server-side bypass)

This means server-side code that calls query operations without passing a `Request` will be denied if the collection has access control. To bypass, use the low-level DB operations directly.

### Access Function Isolation

Access functions receive only a `Request` object with injected headers. They do not receive the full SvelteKit `event` or `locals`, which:

- Prevents access functions from depending on SvelteKit-specific APIs
- Makes them testable with plain `new Request()` objects
- Limits the blast radius of a compromised access function

## Storage Security

### Path Traversal Protection

All storage adapter operations validate paths using `safePath()`:

```ts
function safePath(directory: string, userPath: string): string {
  const resolved = resolve(directory, userPath);
  const rel = relative(resolve(directory), resolved);
  if (rel.startsWith("..")) throw new Error("Path traversal detected");
  return resolved;
}
```

This prevents:

- `../../etc/passwd` in `delete()`, `getStream()`, `exists()`
- `../../../root/.ssh/id_rsa` in file reads
- Absolute paths that escape the storage directory

### Upload Validation

The upload handler validates:

- **File presence** — rejects requests without a `file` field (400)
- **File size** — rejects files exceeding `maxFileSize` (413)
- **MIME type** — rejects files not in `allowedMimeTypes` (415)
- **Folder path** — rejects `folder` containing `..` or starting with `/` (400)

### MIME Type Limitation

MIME type validation checks the client-provided `Content-Type` header, which is trivially spoofable. A `.exe` file could be uploaded with `type: image/png`. For sensitive deployments, implement magic-byte validation (e.g., using `file-type` or `mmmagic`).

### Serve Handler Protection

The file serve handler:

- Strips the URL prefix to extract the file path
- Rejects paths containing `..`
- Checks file existence before streaming
- Sets `Content-Type` based on file extension (not content inspection)

## Database Security

### SQL Injection

Drizzle ORM uses parameterized queries for all operations. User input never appears in SQL strings directly. The CRUD operations (`findMany`, `insertOne`, etc.) pass data through Drizzle's builder, which handles escaping.

### Migration Safety

`pushSchema()` only creates tables and adds columns. It never:

- Drops tables
- Removes columns
- Modifies column types
- Deletes data

This prevents accidental data loss from schema changes. Column removal must be done manually.

## Known Limitations

### Admin Routes Not Auth-Gated

The admin handler factories (`handleCollectionCreate`, etc.) do not enforce authentication internally. The host application must gate admin routes with auth middleware. Typical pattern:

```ts
// src/routes/admin/+layout.server.ts
export const load = ({ locals }) => {
  if (!locals.user || locals.user.role !== "admin") {
    throw redirect(303, "/login");
  }
};
```

### No CSRF Protection on Admin Actions

Admin form actions rely on SvelteKit's built-in CSRF protection (origin checking). Better Auth adds CSRF protection for its own API routes. Custom admin actions should ensure they are protected by SvelteKit's default behavior.

### No Rate Limiting

There is no built-in rate limiting for:

- Login attempts (Better Auth's `maxLoginAttempts` is per-user, not per-IP)
- API requests
- File uploads

Production deployments should add rate limiting at the reverse proxy level (e.g., Nginx, Cloudflare).

### Session Storage

Sessions are stored in the SQLite database via Better Auth. For high-traffic deployments, consider using a session store with faster read performance (e.g., Redis adapter for Better Auth).

## Security Checklist for Deployment

- [ ] Set `BETTER_AUTH_SECRET` to a strong random value (32+ characters)
- [ ] Set `BETTER_AUTH_SECRET` in both build and runtime environments
- [ ] Gate admin routes with auth middleware in `+layout.server.ts`
- [ ] Configure `allowedMimeTypes` for upload collections
- [ ] Set appropriate `maxFileSize` limits
- [ ] Add rate limiting at the reverse proxy level
- [ ] Ensure the uploads directory is not served by the static file handler
- [ ] Review access control functions for all collections before deployment
- [ ] Enable HTTPS in production (session cookies require secure context)
