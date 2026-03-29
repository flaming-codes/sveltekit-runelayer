# Authentication & Access Control

sveltekit-runelayer uses Better Auth for authentication and provides a role-based access control system that integrates with the schema and query layers.

## Setup

```ts
import { defineConfig } from "@flaming-codes/sveltekit-runelayer";

const config = defineConfig({
  collections: [
    /* ... */
  ],
  auth: {
    secret: process.env.AUTH_SECRET!, // Required: signing secret
    baseURL: "http://localhost:5173", // Required: app base URL
    basePath: "/api/auth", // Optional (default: '/api/auth')
    sessionMaxAge: 60 * 60 * 24 * 7, // Optional (default: 7 days)
    requireEmailVerification: false, // Optional (default: false)
  },
});
```

## Auth Config

```ts
interface AuthConfig {
  secret: string; // Token signing secret
  baseURL: string; // Public app URL
  basePath?: string; // Auth API prefix (default: '/api/auth')
  sessionMaxAge?: number; // Session TTL in seconds (default: 604800)
  requireEmailVerification?: boolean; // Require email verification (default: false)
}
```

## How It Works

### Session Management

The `handle` hook returned by `createRunelayer()`:

1. **Strips spoofed headers** — removes any incoming `x-user-id`, `x-user-role`, `x-user-email` headers
2. **Resolves session** — calls Better Auth's `getSession()` API with the request cookies
3. **Injects user context** — sets `x-user-id`, `x-user-role`, `x-user-email` headers and populates `event.locals.user`/`event.locals.session`
4. **Routes auth API** — requests to `/api/auth/*` are handled by Better Auth directly

Runelayer passes an explicit Drizzle schema map (`user`, `session`, `account`, `verification`) to
the Better Auth Drizzle adapter, so auth works even when Drizzle is initialized without
`fullSchema` metadata.

Runelayer also enables Better Auth's `admin` plugin. This provides built-in server endpoints used by
the CMS user-management UI:

- `GET /api/auth/admin/list-users`
- `GET /api/auth/admin/get-user`
- `POST /api/auth/admin/create-user`
- `POST /api/auth/admin/update-user`
- `POST /api/auth/admin/remove-user`
- `POST /api/auth/admin/set-user-password`

### SvelteKit Integration

In your `src/hooks.server.ts`:

```ts
import { runelayer } from "$lib/runelayer";

export const handle = runelayer.handle;
```

In the high-level `createRunelayerApp` integration, no separate `src/routes/api/auth/[...all]/+server.ts` route is required. The global `handle` hook routes auth requests at `auth.basePath` (default `/api/auth`).

## User Model

```ts
interface User {
  id: string;
  email: string;
  name: string;
  role: Role; // 'admin' | 'editor' | 'user'
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

Better Auth manages user storage. The admin plugin schema includes:

- `user.role` (default `"user"`)
- `user.banned`, `user.banReason`, `user.banExpires`
- `session.impersonatedBy`

## First Admin Bootstrap

Runelayer checks whether any admin user exists in Better Auth's `user` table.

- if at least one admin exists, `/admin/login` is shown and admin access requires admin auth
- if no admin exists, admin routes redirect to `/admin/create-first-user`
- the setup form posts `?/createFirstUser`, which creates the first user via Better Auth sign-up and then promotes that email to `role = "admin"`

## Roles

```ts
type Role = "admin" | "editor" | "user";
```

Roles are stored as a string on the user record. The type can be extended via TypeScript module augmentation if needed.

## Access Control Functions

Access functions are used in collection/global configs and field configs to control who can perform operations.

### Signature

```ts
type AccessFn = (args: { req: Request; id?: string; data?: unknown }) => boolean | Promise<boolean>;
```

### Built-in Helpers

```ts
import { isAdmin, isLoggedIn, hasRole } from "@flaming-codes/sveltekit-runelayer";

// Allow only admin users
isAdmin();

// Allow any authenticated user
isLoggedIn();

// Allow users with a specific role
hasRole("editor");
```

These functions check the `x-user-id` and `x-user-role` headers that are injected by the auth handle hook.

### Usage in Collections

```ts
const Posts = defineCollection({
  slug: "posts",
  fields: [
    /* ... */
  ],
  access: {
    create: isLoggedIn(),
    read: () => true, // Public read
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
  const userId = req.headers.get("x-user-id");
  // Check if the requesting user owns the document
  return userId === id;
};

const Posts = defineCollection({
  slug: "posts",
  access: {
    update: async ({ req, id, data }) => {
      if (req.headers.get("x-user-role") === "admin") return true;
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
  tokenExpiration?: number; // Token lifetime in ms
  verify?: boolean; // Require email verification
  maxLoginAttempts?: number; // Lock after N failed attempts
  lockTime?: number; // Lock duration in ms
}
```
