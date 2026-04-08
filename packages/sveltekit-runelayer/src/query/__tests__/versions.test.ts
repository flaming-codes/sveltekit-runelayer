import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDatabase, type RunelayerDatabase } from "../../db/init.js";
import { text } from "../../schema/fields.js";
import type { CollectionConfig } from "../../schema/collections.js";
import { create, find, findOne, update, remove } from "../operations.js";
import type { QueryContext } from "../types.js";
import { applySchemaForTests } from "../../__testutils__/migrations.js";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Collections with `versions` declared (schema-level flag tests)
// ---------------------------------------------------------------------------

const versionedCollection: CollectionConfig = {
  slug: "articles",
  fields: [{ name: "title", ...text({ required: true }) }],
  versions: { drafts: true },
};

const versionsBoolCollection: CollectionConfig = {
  slug: "pages",
  fields: [{ name: "heading", ...text() }],
  versions: true,
};

const nonVersionedCollection: CollectionConfig = {
  slug: "notes",
  fields: [{ name: "body", ...text() }],
};

let rdb: RunelayerDatabase;
let ctx: QueryContext;
let tmpDir: string;

beforeEach(async () => {
  // Versioned collections use transactions which reset :memory: connections.
  // Use a file-based DB instead.
  tmpDir = mkdtempSync(join(tmpdir(), "rl-versions-"));
  rdb = createDatabase({
    url: `file:${join(tmpDir, "test.db")}`,
    collections: [versionedCollection],
  });
  await applySchemaForTests(rdb);
  ctx = { db: rdb, collection: versionedCollection };
});

afterEach(() => {
  rdb.client.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("versioned collection: CRUD basics", () => {
  it("create inserts and returns a document with id", async () => {
    const doc = await create(ctx, { title: "Draft article" });
    expect(doc.id).toBeTypeOf("string");
    expect(doc.title).toBe("Draft article");
  });

  it("findOne retrieves a created document", async () => {
    const doc = await create(ctx, { title: "Lookup" });
    const found = await findOne(ctx, doc.id as string);
    expect(found).toBeDefined();
    expect(found!.title).toBe("Lookup");
  });

  it("find returns all created documents (with draft: true)", async () => {
    await create(ctx, { title: "First" });
    await create(ctx, { title: "Second" });
    // Versioned collections auto-filter to _status='published' by default.
    // Use draft: true to include drafts.
    const docs = await find(ctx, { draft: true });
    expect(docs).toHaveLength(2);
  });

  it("update modifies the document", async () => {
    const doc = await create(ctx, { title: "Old" });
    const updated = await update(ctx, doc.id as string, { title: "New" });
    expect(updated.title).toBe("New");
  });

  it("remove deletes the document", async () => {
    const doc = await create(ctx, { title: "Gone" });
    await remove(ctx, doc.id as string);
    const after = await findOne(ctx, doc.id as string);
    expect(after).toBeUndefined();
  });
});

describe("versioned collection: required field enforcement", () => {
  it("rejects create when required field is missing", async () => {
    await expect(create(ctx, {})).rejects.toThrow('Field "title" is required');
  });
});

describe("versioned collection: _status and _version as allowed query columns", () => {
  it("_status is an allowed query column for versioned collection", async () => {
    // Should not throw on sort by _status (even though no data has _status)
    // The allowedQueryColumns should include _status for versioned collections
    const { allowedQueryColumns } = await import("../enforcement.js");
    const allowed = allowedQueryColumns(versionedCollection);
    expect(allowed.has("_status")).toBe(true);
    expect(allowed.has("_version")).toBe(true);
  });

  it("_status and _version are NOT allowed for non-versioned collection", async () => {
    const { allowedQueryColumns } = await import("../enforcement.js");
    const allowed = allowedQueryColumns(nonVersionedCollection);
    expect(allowed.has("_status")).toBe(false);
    expect(allowed.has("_version")).toBe(false);
  });
});

describe("versioned collection: versions boolean shorthand", () => {
  it("versions: true also allows _status and _version columns", async () => {
    const { allowedQueryColumns } = await import("../enforcement.js");
    const allowed = allowedQueryColumns(versionsBoolCollection);
    expect(allowed.has("_status")).toBe(true);
    expect(allowed.has("_version")).toBe(true);
  });
});

describe("non-versioned collection: basic operation", () => {
  it("creates and retrieves documents without version fields", async () => {
    const db = createDatabase({
      url: ":memory:",
      collections: [nonVersionedCollection],
    });
    await applySchemaForTests(db);
    const plainCtx: QueryContext = { db, collection: nonVersionedCollection };

    const doc = await create(plainCtx, { body: "Hello" });
    expect(doc.body).toBe("Hello");
    expect(doc.id).toBeTypeOf("string");

    const found = await findOne(plainCtx, doc.id as string);
    expect(found?.body).toBe("Hello");
  });
});
