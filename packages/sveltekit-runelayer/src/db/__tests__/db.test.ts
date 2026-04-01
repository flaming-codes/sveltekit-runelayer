import { describe, it, expect, beforeEach } from "vitest";
import { generateTables } from "../schema.js";
import { createDatabase, type RunelayerDatabase } from "../init.js";
import { insertOne, findById, findMany, updateOne, deleteOne } from "../operations.js";
import { text, number, checkbox, json, array, relationship } from "../../schema/fields.js";
import type { CollectionConfig } from "../../schema/collections.js";
import { applySchemaForTests } from "../../__testutils__/migrations.js";

const postsCollection: CollectionConfig = {
  slug: "posts",
  fields: [
    { name: "title", ...text({ required: true }) },
    { name: "views", ...number() },
    { name: "published", ...checkbox() },
    { name: "meta", ...json() },
  ],
};

describe("generateTables", () => {
  it("creates a table with base columns plus field columns", () => {
    const tables = generateTables([postsCollection]);
    expect(tables).toHaveProperty("posts");
  });

  it("creates auxiliary tables for array fields", () => {
    const col: CollectionConfig = {
      slug: "pages",
      fields: [
        { name: "title", ...text() },
        { name: "blocks", ...array({ fields: [{ name: "content", ...text() }] }) },
      ],
    };
    const tables = generateTables([col]);
    expect(tables).toHaveProperty("pages");
    expect(tables).toHaveProperty("pages_blocks");
  });

  it("creates join tables for hasMany relationships", () => {
    const col: CollectionConfig = {
      slug: "articles",
      fields: [{ name: "tags", ...relationship({ relationTo: "tags", hasMany: true }) }],
    };
    const tables = generateTables([col]);
    expect(tables).toHaveProperty("articles_rels_tags");
  });

  it("adds version columns when versions is enabled", () => {
    const col: CollectionConfig = {
      slug: "docs",
      fields: [{ name: "title", ...text() }],
      versions: true,
    };
    const tables = generateTables([col]);
    expect(tables).toHaveProperty("docs");
  });

  it("adds auth columns when auth is enabled", () => {
    const col: CollectionConfig = {
      slug: "users",
      fields: [{ name: "email", ...text() }],
      auth: true,
    };
    const tables = generateTables([col]);
    expect(tables).toHaveProperty("users");
  });
});

describe("createDatabase + migrated schema", () => {
  let rdb: RunelayerDatabase;

  beforeEach(async () => {
    rdb = createDatabase({ url: ":memory:", collections: [postsCollection] });
    await applySchemaForTests(rdb);
  });

  it("creates tables in the SQLite database", async () => {
    const rows = await rdb.client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='posts'",
    );
    expect(rows.rows).toHaveLength(1);
  });
});

describe("CRUD operations", () => {
  let rdb: RunelayerDatabase;
  const tbl = () => rdb.tables.posts;

  beforeEach(async () => {
    rdb = createDatabase({ url: ":memory:", collections: [postsCollection] });
    await applySchemaForTests(rdb);
  });

  it("insertOne auto-generates id and timestamps", async () => {
    const doc = await insertOne(rdb.db, tbl(), { title: "Hello" });
    expect(doc.id).toBeTypeOf("string");
    expect(doc.id.length).toBeGreaterThan(0);
    expect(doc.createdAt).toBeTypeOf("string");
    expect(doc.updatedAt).toBeTypeOf("string");
    expect(doc.title).toBe("Hello");
  });

  it("findById retrieves an inserted document", async () => {
    const created = await insertOne(rdb.db, tbl(), { title: "Find me" });
    const found = await findById(rdb.db, tbl(), created.id as string);
    expect(found).toBeDefined();
    expect(found!.title).toBe("Find me");
  });

  it("findById returns undefined for missing id", async () => {
    const found = await findById(rdb.db, tbl(), "nonexistent");
    expect(found).toBeUndefined();
  });

  it("findMany returns all rows", async () => {
    await insertOne(rdb.db, tbl(), { title: "A" });
    await insertOne(rdb.db, tbl(), { title: "B" });
    const rows = await findMany(rdb.db, tbl());
    expect(rows).toHaveLength(2);
  });

  it("findMany respects limit", async () => {
    await insertOne(rdb.db, tbl(), { title: "A" });
    await insertOne(rdb.db, tbl(), { title: "B" });
    await insertOne(rdb.db, tbl(), { title: "C" });
    const rows = await findMany(rdb.db, tbl(), { limit: 2 });
    expect(rows).toHaveLength(2);
  });

  it("updateOne modifies data and sets updatedAt", async () => {
    const created = await insertOne(rdb.db, tbl(), { title: "Original" });
    const updated = await updateOne(rdb.db, tbl(), created.id as string, { title: "Modified" });
    expect(updated.title).toBe("Modified");
    expect(updated.updatedAt).toBeTypeOf("string");
    expect(new Date(updated.updatedAt as string).getTime()).toBeGreaterThanOrEqual(
      new Date(created.createdAt as string).getTime(),
    );
  });

  it("deleteOne removes the document", async () => {
    const created = await insertOne(rdb.db, tbl(), { title: "Delete me" });
    const deleted = await deleteOne(rdb.db, tbl(), created.id as string);
    expect(deleted!.id).toBe(created.id);
    const after = await findById(rdb.db, tbl(), created.id as string);
    expect(after).toBeUndefined();
  });
});
