# Client/Server Code Separation Review

## Synopsis

The package provides a well-structured `./sveltekit/server` vs `./sveltekit/components` split for the demo-app integration layer, and the demo app uses this correctly. However, the root `"."` entry point (`src/index.ts`) re-exports every server-only module (database, auth, storage, query) without any guard, making it trivially easy for a consumer to pull Node-native code into a client bundle. The deprecated `./sveltekit` combined entry point has the same issue. Admin Svelte components are clean -- they only import type-only schema modules and Carbon UI -- but the overall exports map relies on consumer discipline rather than enforced boundaries.

## Grade: 6/10

## Entry Point Analysis

| Export Path                | File                          | Server-Only                                     | Client-Safe                       | Guard                               |
| -------------------------- | ----------------------------- | ----------------------------------------------- | --------------------------------- | ----------------------------------- |
| `"."`                      | `src/index.ts`                | Yes (db, auth, storage, query, hooks, plugin)   | Partially (schema types/builders) | None                                |
| `"./admin"`                | `src/admin/index.ts`          | No                                              | Yes                               | None needed                         |
| `"./sveltekit"`            | `src/sveltekit/index.ts`      | Yes (`createRunelayerApp` -> full server chain) | Partially (`AdminPage` component) | None (deprecated, no runtime guard) |
| `"./sveltekit/server"`     | `src/sveltekit/server.ts`     | Yes                                             | No                                | `typeof window` runtime throw       |
| `"./sveltekit/components"` | `src/sveltekit/components.ts` | No                                              | Yes                               | None needed                         |

The `"./sveltekit/server"` entry is the only one with a runtime guard. The root `"."` export -- which is the primary public API -- has no such guard.

## Module Classification

| Module                            | Server-Only | Client-Safe | Mixed | Notes                                                                       |
| --------------------------------- | ----------- | ----------- | ----- | --------------------------------------------------------------------------- |
| `schema/`                         | No          | Yes         | No    | Pure types and builder functions, no Node or DB imports                     |
| `db/init.ts`                      | Yes         | No          | No    | `@libsql/client`, `drizzle-orm/libsql`                                      |
| `db/schema.ts`                    | Yes         | No          | No    | `drizzle-orm/sqlite-core`                                                   |
| `db/operations.ts`                | Yes         | No          | No    | `drizzle-orm`, `crypto.randomUUID()` (web-compatible but context is server) |
| `db/drizzle-kit.ts`               | Yes         | No          | No    | Imports auth schema + db schema                                             |
| `auth/index.ts`                   | Yes         | No          | No    | `better-auth`, `better-auth/svelte-kit`, `better-auth/adapters/drizzle`     |
| `auth/access.ts`                  | No          | Yes         | No    | Pure Request header checks, no Node APIs                                    |
| `auth/handler.ts`                 | Yes         | No          | No    | `better-auth/svelte-kit`                                                    |
| `auth/schema.ts`                  | Yes         | No          | No    | `drizzle-orm/sqlite-core`                                                   |
| `auth/types.ts`                   | No          | Yes         | No    | Pure type definitions                                                       |
| `storage/local.ts`                | Yes         | No          | No    | `node:fs`, `node:path`, `node:crypto`, `node:stream`                        |
| `storage/handler.ts`              | Yes         | No          | No    | `@sveltejs/kit` json helper, uses StorageAdapter                            |
| `storage/serve.ts`                | No          | Yes         | No    | Pure Request/Response, delegates to StorageAdapter interface                |
| `hooks/`                          | No          | Yes         | No    | Pure async runner, no Node APIs                                             |
| `query/operations.ts`             | Yes         | No          | No    | Imports db operations, drizzle types                                        |
| `query/access.ts`                 | No          | Yes         | No    | Pure Request-based access check                                             |
| `query/types.ts`                  | No          | Yes         | No    | Pure type definitions                                                       |
| `config.ts`                       | No          | Yes         | No    | Pure type + identity function                                               |
| `plugin.ts`                       | Yes         | No          | No    | Wires db, auth, storage together                                            |
| `admin/` (components)             | No          | Yes         | No    | Only imports schema types + Carbon UI                                       |
| `sveltekit/runtime.ts`            | Yes         | No          | No    | Full server orchestration                                                   |
| `sveltekit/admin-actions.ts`      | Yes         | No          | No    | SvelteKit Actions, form handling                                            |
| `sveltekit/admin-queries.ts`      | Yes         | No          | No    | Direct SQL via `runelayer.database.client`                                  |
| `sveltekit/admin-routing.ts`      | No          | Yes         | No    | Pure string parsing                                                         |
| `sveltekit/serializable.ts`       | No          | Yes         | No    | Pure JSON round-trip                                                        |
| `sveltekit/drizzle-config.ts`     | No          | Yes         | No    | Pure config object builder                                                  |
| `sveltekit/types.ts`              | No          | Yes         | No    | Pure type definitions                                                       |
| `sveltekit/globals.ts`            | Yes         | No          | No    | Direct SQL, imports hooks, access                                           |
| `sveltekit/AdminPage.svelte`      | No          | Yes         | No    | Imports only from `admin/index.js`                                          |
| `sveltekit/AdminErrorPage.svelte` | No          | Yes         | No    | Imports only from `admin/index.js`                                          |

## Detailed Findings

### Server Code Leakage Risks

**F1 (High): Root entry point `"."` re-exports all server-only modules without guard**

`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/index.ts` exports `createRunelayer`, `createDatabase`, `createAuth`, `createLocalStorage`, `createDrizzleKitSchema`, `find`, `findOne`, `create`, `update`, `remove`, and `runBeforeHooks`/`runAfterHooks`. A consumer who writes:

```ts
import { defineCollection, text, createRunelayer } from "@flaming-codes/sveltekit-runelayer";
```

in any file that is not exclusively server-side will pull `@libsql/client`, `better-auth`, `node:fs`, `node:path`, `node:crypto`, and `node:stream` into the client bundle. The bundler will fail at build time for Node built-ins or produce broken runtime code.

This is mitigated in the demo app because the demo correctly uses `./sveltekit/server` and `./sveltekit/components` sub-paths, but third-party consumers reading the root package exports (which is the documented public API in `src/index.ts`) have no protection.

**F2 (Medium): Deprecated `./sveltekit` entry point mixes server and client exports**

`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/index.ts` re-exports both `createRunelayerApp` (server-only, transitively pulls in the entire server stack) and `AdminPage`/`AdminErrorPage` (client-safe Svelte components) from the same module. There is a `@deprecated` JSDoc comment but no runtime guard. If a consumer uses this path in a `+page.svelte`, the entire server graph is included.

**F3 (Low): `typeof window` guard in `server.ts` is a runtime check, not a build-time boundary**

`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/server.ts` lines 5-9 throw at runtime if `typeof window !== "undefined"`. This catches the mistake in development but:

- It does not prevent the bundler from including all transitive server code in the client chunk.
- The error only fires at import time, so tree-shaking and dead-code elimination do not benefit.
- SvelteKit's convention is to use `$lib/server/` paths or conditional `server`/`browser` export conditions in `package.json`, neither of which is used here.

### Import Graph Issues

**F4 (Medium): Admin components import schema type modules at the value level**

Files like `/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/admin/components/GlobalEdit.svelte` (line 8), `CollectionEdit.svelte` (line 12), `CollectionList.svelte` (line 14), and `AdminLayout.svelte` (line 18-19) import from `../../schema/collections.js` and `../../schema/globals.js`. These schema modules are currently client-safe (pure types + identity functions, no Node dependencies), so this works. However, if anyone adds a server-only import to the schema module in the future, it would break all admin components. The imports are `import type` in some places but value imports in others (e.g., `FieldRenderer.svelte` line 2 imports `type { NamedField }` which is fine).

After re-checking: all admin component imports from schema are `type`-only imports (`import type { ... }`), which TypeScript strips at compile time. This is correct and safe.

**F5 (Info): `db/operations.ts` uses `crypto.randomUUID()`**

`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/db/operations.ts` line 37 uses `crypto.randomUUID()` (the Web Crypto API, not `node:crypto`). This is available in both Node and modern browsers. Not a problem in itself since this module is server-only via its drizzle-orm imports, but worth noting that the crypto usage itself is platform-neutral.

### Tree-Shaking & Bundle Analysis

**F6 (High): No `sideEffects` field in package.json**

`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/package.json` does not declare `"sideEffects": false` (or a targeted list). Without this hint, bundlers like Vite/Rollup cannot safely tree-shake unused exports from the root `"."` entry point. If a consumer imports only `defineCollection` and `text` from the root, the bundler may still include the full module graph including `createDatabase`, `createAuth`, etc.

**F7 (Medium): No `server` export condition in the exports map**

The `package.json` exports map uses `"svelte"` and `"default"` conditions but not `"server"` or `"node"`. SvelteKit and Vite support export conditions like:

```json
{
  ".": {
    "server": "./src/server-index.ts",
    "default": "./src/client-index.ts"
  }
}
```

This would allow the root `"."` path to resolve differently on server vs client, providing build-time enforcement rather than relying on consumers to use the correct sub-path.

**F8 (Low): The `"svelte"` export condition on `"./sveltekit/server"` is absent**

The `./sveltekit/server` export only has `"default"`, which is correct since it should never be processed by the Svelte compiler directly. This is fine.

### SvelteKit Integration Patterns

**F9 (Good): Demo app follows correct patterns**

The demo app at `/Users/tom/Github/sveltekit-runelayer/apps/demo/src/` correctly:

- Places the Runelayer instance in `$lib/server/runelayer.ts` (SvelteKit server-only convention)
- Imports `createRunelayerApp` from `./sveltekit/server` only in `+page.server.ts` and `hooks.server.ts`
- Imports `AdminPage` from `./sveltekit/components` in `+page.svelte`
- Uses SvelteKit's `$lib/server/` directory convention to enforce server boundaries

**F10 (Good): Data serialization boundary is handled**

`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/sveltekit/serializable.ts` strips functions before passing data from server `load` to client `+page.svelte`. This prevents function references (like `access` or `hooks` callbacks on collection configs) from leaking to the client. The `toSerializable` function is applied consistently in `runtime.ts` before returning data.

**F11 (Good): Auth secrets are not exposed to clients**

The `AuthConfig.secret` is only consumed in `createAuth()` (`/Users/tom/Github/sveltekit-runelayer/packages/sveltekit-runelayer/src/auth/index.ts` line 23) which passes it to `betterAuth()`. This code path is server-only. The `toSerializable` call strips the runelayer config before it reaches the client, and collections/globals configs passed to the client do not contain auth secrets.

## Action Items

### Critical

- **Split the root `"."` entry point into server-only and client-safe exports.** The current `src/index.ts` exports everything. Either:
  - (a) Make `"."` export only client-safe items (schema builders, types, config) and move server exports to a new `"./server"` sub-path, or
  - (b) Add `"server"` and `"default"` export conditions to `"."` so that server-only code resolves differently, or
  - (c) At minimum, add a `typeof window` runtime guard to `src/index.ts` like `./sveltekit/server.ts` has (least effective option).

### Medium

- **Remove or properly guard the deprecated `./sveltekit` combined entry point.** It currently mixes `createRunelayerApp` (server) with `AdminPage` (client) in one module. Either remove it entirely or split it the same way `./sveltekit/server` and `./sveltekit/components` are split.
- **Add `"sideEffects": false` to `package.json`** (or `"sideEffects": ["**/*.svelte"]` to account for Svelte component side effects). This enables proper tree-shaking for consumers who import only schema utilities from the root.
- **Consider adding `"server"` export conditions** to `"./sveltekit/server"` and the root `"."` export in `package.json`, so Vite/SvelteKit can enforce the boundary at build time rather than runtime.

### Low

- **Document the import convention prominently.** The current architecture requires consumers to know that `./sveltekit/server` is for `+page.server.ts`/`hooks.server.ts` and `./sveltekit/components` is for `+page.svelte`. This is not obvious from the package name or the root entry point.
- **Consider making `storage/serve.ts` and `storage/handler.ts` available as separate sub-path exports** for consumers who want to set up custom upload/serve routes without pulling in the full integration layer.

### Recommendations

- The long-term clean solution is a three-tier export structure:
  1. `"."` -- schema definitions, types, config (client-safe, no Node deps)
  2. `"./server"` -- database, auth, storage, query, plugin, hooks (server-only)
  3. `"./admin"` -- Svelte components (client-safe, already exists)

  The `./sveltekit/*` sub-paths would remain as the high-level integration layer. This matches how packages like `lucia-auth` and `drizzle-orm` structure their exports.

- Add a CI check (e.g., a Vitest test) that attempts to resolve the client-safe entry points and asserts they do not transitively import any `node:*` modules. This catches future regressions where someone adds a server import to a previously client-safe module.
