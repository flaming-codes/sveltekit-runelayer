# Client/Server Code Separation Review

## Synopsis

The SvelteKit-specific split is mostly correct: `./sveltekit/server` is explicitly server-only, `./sveltekit/components` is browser-safe, and the admin Svelte components only import client-safe modules or type-only schema definitions. The weak point is the package root. `src/index.ts` re-exports the entire server stack, and `package.json` points both the `svelte` and `default` conditions at that same file, so a consumer can accidentally pull `db`, `auth`, `storage`, `query`, and `hooks` into a browser build. The deprecated combined `./sveltekit` entry point repeats that mistake. Serialization is also intentionally lossy: `toSerializable()` is a JSON round-trip, which is fine for plain CMS payloads but makes the server/client contract depend on hidden data-shape assumptions.

## Grade: 6/10

## Boundary Review

| Path                             | Classification                               | Status                       |
| -------------------------------- | -------------------------------------------- | ---------------------------- |
| `src/sveltekit/server.ts`        | Server-only entry point                      | Good, but runtime-only guard |
| `src/sveltekit/components.ts`    | Client-safe entry point                      | Good                         |
| `src/admin/index.ts`             | Client-safe admin component bundle           | Good                         |
| `src/sveltekit/index.ts`         | Legacy mixed entry point                     | Risky                        |
| `src/index.ts`                   | Public root entry point                      | Risky                        |
| `src/sveltekit/serializable.ts`  | Server-to-client serialization helper        | Functional, but blunt        |
| `src/sveltekit/AdminPage.svelte` | Client router for server-rendered admin data | Works, but stringly typed    |

## Main Findings

### 1. The root export graph is not boundary-safe

`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/index.ts:5-61` re-exports `createRunelayer`, `createAuth`, `createLocalStorage`, `createDatabase`, `find`, `create`, `runBeforeHooks`, and other server-only APIs from the package root. `package.json` then maps both `"."` and the top-level `"svelte"` condition to that same file (`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/package.json:18-23`).

That means a consumer importing from the root in a component or shared module can drag `@libsql/client`, `better-auth`, `drizzle-orm`, and Node-only storage code into a browser bundle. The code is not browser-safe by construction; it is only browser-safe if the consumer already knows to never import the root entry from client code. That is too much implicit discipline for a package whose job is to make the safe path obvious.

### 2. The legacy `./sveltekit` entry point still mixes server and client concerns

`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/index.ts:1-19` is marked deprecated, but it still exports `createRunelayerApp` alongside `AdminPage` and `AdminErrorPage`. The server-only subpath has a runtime `typeof window` guard (`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/server.ts:1-10`), but that only fails after import. It does not create a build-time boundary and it does not stop the mixed module graph from being resolved.

The newer split is the right shape. The compatibility entry point should either be removed sooner or reduced to a thin compatibility wrapper that cannot be mistaken for a safe import target.

### 3. The admin UI itself is cleanly isolated

The client bundle side is mostly disciplined. `src/sveltekit/components.ts` only exports `AdminPage`, `AdminErrorPage`, and a UI config type. `src/admin/index.ts` only re-exports Svelte components. The Svelte components under `src/admin/components` import schema modules as `type` only, and `AdminPage.svelte` imports only from `../admin/index.js`, which is exactly what you want for a client router.

So the problem is not the admin component tree. The problem is the public package surface around it.

### 4. Serialization is intentionally simple, but the contract is brittle

`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/serializable.ts:1-7` uses `JSON.stringify`/`JSON.parse` with a function filter to strip callbacks before data crosses the server/client boundary. That works for plain collection configs and document payloads, and it is used consistently in `runtime-loaders.ts` and `admin-actions.ts`.

The tradeoff is that the boundary is lossy in more ways than functions:

- `undefined` values disappear.
- `Date` objects become strings.
- `Map`, `Set`, `BigInt`, class instances, and cycles are not represented safely.
- Any future attempt to pass richer runtime objects through admin load data will fail in opaque ways.

That is acceptable if the boundary is treated as “plain JSON only”, but the code does not make that constraint explicit in the type system. `AdminPage.svelte` receives `Record<string, any>` (`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/AdminPage.svelte:16-19`), so the server/client contract remains stringly typed.

### 5. Runtime guards are useful, but they are the weakest form of safety

The `typeof window` throw in `server.ts` is a good last-resort trap, but it is still runtime protection, not packaging protection. The safer pattern is to make the wrong import path impossible or unattractive:

- root exports should not include server-only code
- compatibility entry points should not mix server and client modules
- client-safe paths should not depend on consumers remembering subpath rules

## Action Items

### Critical

- Split the public root export so `src/index.ts` no longer re-exports server-only modules. Keep schema/config types at the root if needed, but move `db`, `auth`, `storage`, `query`, `hooks`, and `plugin` to a server-only subpath.

### Medium

- Remove or further narrow the deprecated `./sveltekit` entry point. It currently combines server and client exports in one module and is still a plausible import target.
- Replace the runtime-only `typeof window` guard in `src/sveltekit/server.ts` with packaging that prevents the wrong bundle from resolving in the first place.
- Make the server/client data contract explicit. `AdminPage.svelte` should not accept `Record<string, any>` if the real payload shape is a finite union of admin view models.

### Low

- Consider adding a dedicated `./schema` subpath export for the client-safe schema DSL and leaving the root entry point minimal.
- Add a small boundary test that imports the browser-safe entry points and asserts they do not transitively resolve Node-only modules.

### Recommendation

- Treat admin load data as plain JSON only and document that rule next to `toSerializable()`. The current implementation works, but the rule is implicit.
- If the compatibility path must stay for one release cycle, make the deprecation message more explicit in docs and package metadata so new consumers are steered to `./sveltekit/server` and `./sveltekit/components`.
