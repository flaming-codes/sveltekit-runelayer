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
└── __e2e__/*.e2e.test.ts
```

Container journeys are guarded by `describe.skipIf(!isDockerRunning())`.

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
