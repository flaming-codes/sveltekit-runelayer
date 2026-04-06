import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import {
  createDrizzleKitSchema,
  createRunelayer,
  create,
  defineCollection,
  defineGlobal,
  defineConfig,
  text,
  type QueryContext,
} from "../../index.js";
import { migrateDatabaseForTests } from "../../__testutils__/migrations.js";
import { updateGlobalDocument } from "../../sveltekit/globals.js";

const Posts = defineCollection({
  slug: "posts",
  fields: [{ name: "title", ...text({ required: true }) }],
});

const SiteSettings = defineGlobal({
  slug: "site-settings",
  fields: [{ name: "siteName", ...text({ required: true }) }],
  versions: true,
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
    const schema = createDrizzleKitSchema([Posts], [SiteSettings]);
    expect(schema).toHaveProperty("posts");
    expect(schema).toHaveProperty("__runelayer_globals");
    expect(schema).toHaveProperty("__runelayer_global_versions");
    expect(schema).toHaveProperty("user");
    expect(schema).toHaveProperty("session");
    expect(schema).toHaveProperty("account");
    expect(schema).toHaveProperty("verification");

    const tableConfig = getTableConfig(schema.posts);
    expect(tableConfig.name).toBe("posts");

    const globalsTable = getTableConfig(schema["__runelayer_globals"]);
    expect(globalsTable.name).toBe("__runelayer_globals");

    const userTable = getTableConfig(schema.user);
    expect(userTable.name).toBe("user");
  });

  it("requires pre-applied migrations before runtime CRUD", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "runelayer-contract-"));
    const dbUrl = `file:${join(tmpDir, "contract.db")}`;

    const unresolvedKit = createRunelayer(
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

    const migratedKit = createRunelayer(
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

  it("globals auto-create their table at runtime (no pre-migration needed)", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "runelayer-global-contract-"));
    const dbUrl = `file:${join(tmpDir, "contract.db")}`;
    const request = new Request("http://localhost", {
      headers: {
        "x-user-id": "admin-1",
        "x-user-role": "admin",
      },
    });

    // Globals use runtime DDL (CREATE TABLE IF NOT EXISTS) via ensureGlobalTable,
    // so they work without host-managed pre-migration.
    const kit = createRunelayer(
      defineConfig({
        collections: [],
        globals: [SiteSettings],
        database: { url: dbUrl },
        auth: {
          secret: "migration-contract-secret-minimum-32-chars",
          baseURL: "http://localhost:3000",
        },
      }),
    );

    const doc = await updateGlobalDocument(kit, SiteSettings, request, {
      siteName: "Works without pre-migration",
    });
    expect(doc.siteName).toBe("Works without pre-migration");

    kit.database.client.close();
  });
});
