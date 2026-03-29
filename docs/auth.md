# Authentication & Access Control

Runekit uses Better Auth for authentication and provides a role-based access control system that integrates with the schema and query layers.

## Setup

```ts
import { defineConfig } from 'runekit';

const config = defineConfig({
  collections: [/* ... */],
  auth: {
    secret: process.env.AUTH_SECRET!,    // Required: signing secret
    baseURL: 'http://localhost:5173',     // Required: app base URL
    basePath: '/api/auth',               // Optional (default: '/api/auth')
    sessionMaxAge: 60 * 60 * 24 * 7,    // Optional (default: 7 days)
    requireEmailVerification: false,     // Optional (default: false)
  },
});
```

## Auth Config

```ts
interface AuthConfig {
  secret: string;                    // Token signing secret
  baseURL: string;                   // Public app URL
  basePath?: string;                 // Auth API prefix (default: '/api/auth')
  sessionMaxAge?: number;            // Session TTL in seconds (default: 604800)
  requireEmailVerification?: boolean; // Require email verification (default: false)
}
```

## How It Works

### Session Management

The `handle` hook returned by `createRunekit()`:

1. **Strips spoofed headers** — removes any incoming `x-user-id`, `x-user-role`, `x-user-email` headers
2. **Resolves session** — calls Better Auth's `getSession()` API with the request cookies
3. **Injects user context** — sets `x-user-id`, `x-user-role`, `x-user-email` headers and populates `event.locals.user`/`event.locals.session`
4. **Routes auth API** — requests to `/api/auth/*` are handled by Better Auth directly

### SvelteKit Integration

In your `src/hooks.server.ts`:

```ts
import { runekit } from '$lib/runekit';

export const handle = runekit.handle;
```

For the auth API endpoints, create `src/routes/api/auth/[...all]/+server.ts`:

```ts
import { createAuthHandler } from 'runekit';
import { runekit } from '$lib/runekit';

const handler = createAuthHandler(runekit.auth);
export const GET = handler;
export const POST = handler;
```

## User Model

```ts
interface User {
  id: string;
  email: string;
  name: string;
  role: Role;            // 'admin' | 'editor' | 'user'
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Better Auth manages user storage. The `role` field is added as an additional user field with default value `'user'`.

## Roles

```ts
type Role = 'admin' | 'editor' | 'user';
```

Roles are stored as a string on the user record. The type can be extended via TypeScript module augmentation if needed.

## Access Control Functions

Access functions are used in collection/global configs and field configs to control who can perform operations.

### Signature

```ts
type AccessFn = (args: {
  req: Request;
  id?: string;
  data?: unknown;
}) => boolean | Promise<boolean>;
```

### Built-in Helpers

```ts
import { isAdmin, isLoggedIn, hasRole } from 'runekit';

// Allow only admin users
isAdmin()

// Allow any authenticated user
isLoggedIn()

// Allow users with a specific role
hasRole('editor')
```

These functions check the `x-user-id` and `x-user-role` headers that are injected by the auth handle hook.

### Usage in Collections

```ts
const Posts = defineCollection({
  slug: 'posts',
  fields: [/* ... */],
  access: {
    create: isLoggedIn(),
    read: () => true,           // Public read
    update: isLoggedIn(),
    delete: isAdmin(),
  },
});
```

### Field-Level Access

```ts
{
  name: 'internalNotes',
  ...textarea(),
  access: {
    read: isAdmin(),      // Only admins see this field
    update: isAdmin(),    // Only admins can edit
  },
}
```

### Custom Access Functions

```ts
const isOwner: AccessFn = ({ req, id }) => {
  const userId = req.headers.get('x-user-id');
  // Check if the requesting user owns the document
  return userId === id;
};

const Posts = defineCollection({
  slug: 'posts',
  access: {
    update: async ({ req, id, data }) => {
      if (req.headers.get('x-user-role') === 'admin') return true;
      return isOwner({ req, id, data });
    },
  },
  // ...
});
```

## Access Control Behavior

The query layer enforces access control automatically:

- **No access function defined** — operation is allowed (public access)
- **Access function defined, request provided** — function is called; `false` throws 403
- **Access function defined, no request** — operation is **denied by default** (403)

This deny-by-default behavior for server-side calls without a request context prevents accidental access control bypass. To intentionally bypass access control in server-side code, do not define access functions on the collection, or call the low-level DB operations directly.

## Security Considerations

### Header Anti-Spoofing

The auth handle hook strips `x-user-id`, `x-user-role`, and `x-user-email` from all incoming requests before resolving the session. This prevents external clients from setting these headers to impersonate users.

### Better Auth Environment Variable

`BETTER_AUTH_SECRET` (or the `secret` config field) must be available at both build time and runtime when using SvelteKit. Set it in your `.env` file and ensure it is available in your CI/CD build environment.

### Collection Auth Config

Collections with `auth: true` get additional database columns (`hash`, `salt`, `token`, `tokenExpiry`). This is separate from the global auth system and is used for collection-specific authentication features like API keys or per-collection password protection.

```ts
interface CollectionAuthConfig {
  tokenExpiration?: number;     // Token lifetime in ms
  verify?: boolean;             // Require email verification
  maxLoginAttempts?: number;    // Lock after N failed attempts
  lockTime?: number;            // Lock duration in ms
}
```
