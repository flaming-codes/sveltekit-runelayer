import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import {
  createDrizzleKitSchema,
  createRunekit,
  create,
  defineCollection,
  defineConfig,
  text,
  type QueryContext,
} from "../../index.js";
import { migrateDatabaseForTests } from "../../__testutils__/migrations.js";

const Posts = defineCollection({
  slug: "posts",
  fields: [{ name: "title", ...text({ required: true }) }],
});

describe("host-managed migration contract", () => {
  let tmpDir: string | undefined;

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
      tmpDir = undefined;
    }
  });

  it("exports a drizzle-kit schema object for host migration files", () => {
    const schema = createDrizzleKitSchema([Posts]);
    expect(schema).toHaveProperty("posts");
    const tableConfig = getTableConfig(schema.posts);
    expect(tableConfig.name).toBe("posts");
  });

  it("requires pre-applied migrations before runtime CRUD", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "runelayer-contract-"));
    const dbUrl = `file:${join(tmpDir, "contract.db")}`;

    const unresolvedKit = createRunekit(
      defineConfig({
        collections: [Posts],
        database: { url: dbUrl },
        auth: {
          secret: "migration-contract-secret-minimum-32-chars",
          baseURL: "http://localhost:3000",
        },
      }),
    );

    const unresolvedCtx: QueryContext = {
      db: unresolvedKit.database,
      collection: Posts,
    };

    const beforeTables = await unresolvedKit.database.client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='posts'",
    );
    expect(beforeTables.rows).toHaveLength(0);

    await expect(create(unresolvedCtx, { title: "Should fail before migration" })).rejects.toThrow(
      /Failed query/i,
    );
    unresolvedKit.database.client.close();

    await migrateDatabaseForTests(dbUrl, [Posts]);

    const migratedKit = createRunekit(
      defineConfig({
        collections: [Posts],
        database: { url: dbUrl },
        auth: {
          secret: "migration-contract-secret-minimum-32-chars",
          baseURL: "http://localhost:3000",
        },
      }),
    );
    const migratedCtx: QueryContext = {
      db: migratedKit.database,
      collection: Posts,
    };

    const doc = await create(migratedCtx, { title: "Works after migration" });
    expect(doc.title).toBe("Works after migration");

    migratedKit.database.client.close();
  });
});
