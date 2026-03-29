import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDatabase, type RunekitDatabase } from "../../db/init.js";
import { text } from "../../schema/fields.js";
import type { CollectionConfig } from "../../schema/collections.js";
import { checkAccess } from "../access.js";
import { create, findOne, find, update, remove } from "../operations.js";
import type { QueryContext } from "../types.js";
import { applySchemaForTests } from "../../__testutils__/migrations.js";

const collection: CollectionConfig = {
  slug: "posts",
  fields: [{ name: "title", ...text({ required: true }) }],
};

let rdb: RunekitDatabase;
let ctx: QueryContext;

beforeEach(async () => {
  rdb = createDatabase({ url: ":memory:", collections: [collection] });
  await applySchemaForTests(rdb);
  ctx = { db: rdb, collection };
});

describe("checkAccess", () => {
  it("passes when accessFn is undefined", async () => {
    await expect(checkAccess(undefined, new Request("http://x"))).resolves.toBeUndefined();
  });

  it("denies when accessFn is defined but req is undefined", async () => {
    const fn = () => false;
    await expect(checkAccess(fn, undefined)).rejects.toThrow("Forbidden");
  });

  it("passes when no accessFn even if req is undefined", async () => {
    await expect(checkAccess(undefined, undefined)).resolves.toBeUndefined();
  });

  it("passes when accessFn returns true", async () => {
    const fn = () => true;
    await expect(checkAccess(fn, new Request("http://x"))).resolves.toBeUndefined();
  });

  it("throws 403 when accessFn returns false", async () => {
    const fn = () => false;
    await expect(checkAccess(fn, new Request("http://x"))).rejects.toThrow("Forbidden");
  });

  it("throws with status 403 property", async () => {
    const fn = () => false;
    try {
      await checkAccess(fn, new Request("http://x"));
    } catch (err: any) {
      expect(err.status).toBe(403);
    }
  });
});

describe("query operations with in-memory DB", () => {
  it("create inserts and returns a document", async () => {
    const doc = await create(ctx, { title: "First" });
    expect(doc.title).toBe("First");
    expect(doc.id).toBeTypeOf("string");
  });

  it("findOne retrieves a created document", async () => {
    const doc = await create(ctx, { title: "Lookup" });
    const found = await findOne(ctx, doc.id as string);
    expect(found).toBeDefined();
    expect(found!.title).toBe("Lookup");
  });

  it("find returns all documents", async () => {
    await create(ctx, { title: "A" });
    await create(ctx, { title: "B" });
    const docs = await find(ctx);
    expect(docs).toHaveLength(2);
  });

  it("update modifies a document", async () => {
    const doc = await create(ctx, { title: "Old" });
    const updated = await update(ctx, doc.id as string, { title: "New" });
    expect(updated.title).toBe("New");
  });

  it("remove deletes a document", async () => {
    const doc = await create(ctx, { title: "Gone" });
    await remove(ctx, doc.id as string);
    const after = await findOne(ctx, doc.id as string);
    expect(after).toBeUndefined();
  });
});

describe("query operations call hooks", () => {
  it("beforeChange hook modifies data on create", async () => {
    const hookCollection: CollectionConfig = {
      ...collection,
      hooks: {
        beforeChange: [(args) => ({ ...args, data: { ...args.data, title: "Hooked" } })],
      },
    };
    const hookCtx: QueryContext = { db: rdb, collection: hookCollection };
    const doc = await create(hookCtx, { title: "Original" });
    expect(doc.title).toBe("Hooked");
  });

  it("afterChange hook is called on create", async () => {
    const tracker = vi.fn();
    const hookCollection: CollectionConfig = {
      ...collection,
      hooks: { afterChange: [tracker] },
    };
    const hookCtx: QueryContext = { db: rdb, collection: hookCollection };
    await create(hookCtx, { title: "Tracked" });
    expect(tracker).toHaveBeenCalledOnce();
  });
});
