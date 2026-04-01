# Testing

`sveltekit-runelayer` uses vitest (via vite-plus) for unit and E2E journeys.

## Run tests

```bash
# from repo root
npx vitest run
npx vitest run packages/sveltekit-runelayer/src/__e2e__
npx vitest run -t "blog"
npx vitest --watch
```

## Test structure

```
packages/sveltekit-runelayer/src/
├── schema/__tests__/*.test.ts
├── db/__tests__/*.test.ts
├── auth/__tests__/*.test.ts
├── hooks/__tests__/*.test.ts
├── storage/__tests__/*.test.ts
├── query/__tests__/*.test.ts
├── sveltekit/__tests__/*.test.ts
└── __e2e__/*.e2e.test.ts
```

Container journeys are guarded by `describe.skipIf(!isDockerRunning())`.

## Auth journey E2E tests

`src/__e2e__/auth-journeys.e2e.test.ts` validates full admin auth lifecycles against real
runtime handlers with persistent cookie/session state. The suite requires Docker for a
Mailpit container.

### What the tests cover

- **First-time setup** — bootstraps exactly one admin via the create-first-user form action,
  verifies session creation, and confirms the setup page locks out after an admin exists
- **Repeated login** — rotates session tokens across logout/login cycles while preserving
  the same admin identity, and verifies wrong-password rejection
- **Login/logout gating** — enforces redirect and 403 rules: unauthenticated users see the
  login page, non-admin users are denied dashboard access, and admin users reach the dashboard

### Harness architecture

The tests do not start a real HTTP server. Instead, a `createAuthJourneyHarness()` function
wires together the full runtime in-process:

```
┌─────────────────────────────────────────────────────────┐
│  Test code                                              │
│  calls harness.runAdminAction() / harness.adminLoad()   │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  adminEvent()                                     │  │
│  │  - builds a fake RequestEvent with URL, headers,  │  │
│  │    form body, and resolved locals                 │  │
│  │  - sets event.fetch = appFetch                    │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │  app.admin.actions[action](event)                 │  │
│  │  or app.admin.load(event)                         │  │
│  │                                                   │  │
│  │  When an action calls event.fetch() (e.g. to hit  │  │
│  │  /api/auth/sign-up/email), it goes to appFetch:   │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  appFetch(url, init)                        │  │  │
│  │  │  - constructs Request with CookieJar state  │  │  │
│  │  │  - calls app.handle({ event, resolve })     │  │  │
│  │  │  - ingests Set-Cookie from response         │  │  │
│  │  └──────────────────┬──────────────────────────┘  │  │
│  │                     │                             │  │
│  │  ┌──────────────────▼──────────────────────────┐  │  │
│  │  │  app.handle → runelayer.handle → auth.handle│  │  │
│  │  │  - strips spoofed headers                   │  │  │
│  │  │  - resolves session from cookies            │  │  │
│  │  │  - routes /api/auth/* to svelteKitHandler   │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  CookieJar                                        │  │
│  │  - persists session cookies across all appFetch   │  │
│  │    calls within one harness instance               │  │
│  │  - applied to outgoing requests, ingested from    │  │
│  │    Set-Cookie responses                           │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  resolveLocals(pathname)                          │  │
│  │  - runs app.handle with a resolve callback that   │  │
│  │    captures event.locals after auth header        │  │
│  │    injection                                      │  │
│  │  - used by adminEvent to populate event.locals    │  │
│  │    with the current session user before the       │  │
│  │    action/load handler sees it                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### SvelteKit redirect/error conventions

The harness supplies a `kit` object that mimics SvelteKit's `redirect()`, `error()`,
and `fail()` functions:

- `redirect(status, location)` throws an object with `{ status, location }` properties.
  Tests assert these with `.rejects.toMatchObject({ status: 303, location: "..." })`.
- `error(status, body)` throws an object with `{ status, body }` properties.
- `fail(status, data)` returns `{ status, data }` (does not throw).
  Tests assert these with `.resolves.toMatchObject(...)`.

This means success-with-redirect (e.g. after login) looks like a rejection in tests, and
validation errors (e.g. missing fields) look like resolutions. This is intentional and
matches SvelteKit's real behavior where `redirect()` throws.

### Critical constraint: origin matching

Better Auth's `svelteKitHandler` uses an `isAuthPath()` function that checks both pathname
prefix **and origin equality** before routing a request to the auth handler:

```js
// from better-auth/dist/integrations/svelte-kit.mjs
function isAuthPath(url, options) {
  const _url = new URL(url);
  const baseURL = new URL(`${options.baseURL || _url.origin}${options.basePath || "/api/auth"}`);
  if (_url.origin !== baseURL.origin) return false; // <-- origin check
  if (!_url.pathname.startsWith(baseURL.pathname + "/")) return false;
  return true;
}
```

If the request URL's origin does not match `auth.baseURL`'s origin, `isAuthPath` returns
false, `svelteKitHandler` calls `resolve(event)` instead of `auth.handler(request)`, and
the request falls through to the test's 404 resolve callback. The auth endpoint silently
returns 404 with no error message.

The harness must construct all URLs (in `appFetch`, `resolveLocals`, `adminEvent`) with the
**same origin** as `auth.baseURL`. Both use `http://localhost:3000`.

If you change the auth config's `baseURL`, you must update every URL construction in the
harness to match. There is no runtime warning when origins diverge.

### Database setup

Each test creates a fresh harness with:

1. `migrateDatabaseForTests()` — applies collection table schemas
2. `applyBetterAuthSchemaForTests()` — manually creates Better Auth's `user`, `session`,
   `account`, and `verification` tables with the expected column layout

The manual schema creation in step 2 is necessary because Better Auth's migration system
is not available in the test environment. The column definitions must match Better Auth's
expected schema including the admin plugin columns (`role`, `banned`, `banReason`,
`banExpires` on `user`; `impersonatedBy` on `session`).

### Docker requirement

The test suite uses Testcontainers to run a Mailpit container for email capture. Tests are
automatically skipped via `describe.skipIf(!isDockerRunning())` when Docker is unavailable.
The `isDockerRunning()` check is imported from `__e2e__/docker-check.ts`.

## Database test pattern

Runtime does not auto-migrate schema. Tests explicitly pre-apply schema before CRUD assertions.

```ts
import { createDatabase } from "../../db/init.js";
import { applySchemaForTests } from "../../__testutils__/migrations.js";

let rdb: RunelayerDatabase;

beforeEach(async () => {
  rdb = createDatabase({ url: ":memory:", collections: [collection] });
  await applySchemaForTests(rdb);
});
```

## Query + access testing

- pass `Request` objects with `x-user-*` headers for role checks
- verify deny-by-default behavior when `req` is missing and access function exists
- verify hooks are called in expected order

## Storage testing

Use temporary directories (`mkdtemp`) and remove them in teardown (`rm(..., { recursive: true, force: true })`).

## Migration contract coverage

`db/__tests__/migration-contract.test.ts` verifies:

- schema helper export for host drizzle-kit integration
- no runtime table auto-creation
- CRUD works after pre-applied migration step

## Quality gates

Run before sign-off:

```bash
npx vp fmt
npx vp check --fix
npx vitest run
pnpm build
```
