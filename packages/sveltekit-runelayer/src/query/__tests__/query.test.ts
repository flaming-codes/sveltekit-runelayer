import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDatabase, type RunelayerDatabase } from "../../db/init.js";
import { group, number, select, text } from "../../schema/fields.js";
import type { CollectionConfig } from "../../schema/collections.js";
import { checkAccess } from "../access.js";
import { create, findOne, find, update, remove } from "../operations.js";
import type { QueryContext } from "../types.js";
import { applySchemaForTests } from "../../__testutils__/migrations.js";

const collection: CollectionConfig = {
  slug: "posts",
  fields: [{ name: "title", ...text({ required: true }) }],
};

let rdb: RunelayerDatabase;
let ctx: QueryContext;

beforeEach(async () => {
  rdb = createDatabase({ url: ":memory:", collections: [collection] });
  await applySchemaForTests(rdb);
  ctx = { db: rdb, collection };
});

async function makeContext(
  collectionConfig: CollectionConfig,
  req?: Request,
): Promise<QueryContext> {
  const db = createDatabase({
    url: ":memory:",
    collections: [collectionConfig],
  });
  await applySchemaForTests(db);
  return { db, collection: collectionConfig, req };
}

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

describe("runtime schema enforcement", () => {
  it("rejects unknown fields on create", async () => {
    await expect(
      create(ctx, { title: "Known", rogue: "x" } as Record<string, unknown>),
    ).rejects.toThrow('Unknown field "rogue"');
  });

  it("rejects reserved fields on create", async () => {
    await expect(create(ctx, { title: "Known", id: "forced-id" })).rejects.toThrow(
      'Field "id" is reserved and cannot be written',
    );
  });

  it("enforces required fields", async () => {
    await expect(create(ctx, {})).rejects.toThrow('Field "title" is required');
  });

  it("enforces validate callbacks", async () => {
    const validatedCollection: CollectionConfig = {
      slug: "validated_posts",
      fields: [
        {
          name: "title",
          ...text({
            validate: (value) => value.startsWith("ok-") || "Title must start with ok-",
          }),
        },
      ],
    };
    const validatedCtx = await makeContext(validatedCollection);
    await expect(create(validatedCtx, { title: "nope" })).rejects.toThrow(
      "Title must start with ok-",
    );
    await expect(create(validatedCtx, { title: "ok-title" })).resolves.toBeDefined();
  });

  it("coerces and validates number fields", async () => {
    const numericCollection: CollectionConfig = {
      slug: "numeric_posts",
      fields: [{ name: "rating", ...number({ min: 1, max: 5 }) }],
    };
    const numericCtx = await makeContext(numericCollection);

    const doc = await create(numericCtx, { rating: "3" });
    expect(doc.rating).toBe(3);

    await expect(create(numericCtx, { rating: "7" })).rejects.toThrow(
      'Field "rating" must be at most 5',
    );
  });

  it("enforces field-level write access", async () => {
    const secureCollection: CollectionConfig = {
      slug: "secure_posts",
      fields: [
        { name: "title", ...text() },
        {
          name: "internalNotes",
          ...text({
            access: {
              create: ({ req }) => req.headers.get("x-user-role") === "admin",
              update: ({ req }) => req.headers.get("x-user-role") === "admin",
            },
          }),
        },
      ],
    };

    const userReq = new Request("http://x", {
      headers: { "x-user-role": "editor" },
    });
    const adminReq = new Request("http://x", {
      headers: { "x-user-role": "admin" },
    });
    const userCtx = await makeContext(secureCollection, userReq);
    const adminCtx = await makeContext(secureCollection, adminReq);

    await expect(create(userCtx, { title: "A", internalNotes: "secret" })).rejects.toThrow(
      'Forbidden field "internalNotes"',
    );

    const created = await create(adminCtx, {
      title: "A",
      internalNotes: "secret",
    });
    expect(created.internalNotes).toBe("secret");
  });

  it("redacts field-level read access", async () => {
    const secureCollection: CollectionConfig = {
      slug: "secure_read_posts",
      fields: [
        { name: "title", ...text() },
        {
          name: "internalNotes",
          ...text({
            access: {
              read: ({ req }) => req.headers.get("x-user-role") === "admin",
            },
          }),
        },
      ],
    };

    const adminReq = new Request("http://x", {
      headers: { "x-user-role": "admin" },
    });
    const userReq = new Request("http://x", {
      headers: { "x-user-role": "editor" },
    });
    const adminCtx = await makeContext(secureCollection, adminReq);
    const userCtx: QueryContext = {
      db: adminCtx.db,
      collection: secureCollection,
      req: userReq,
    };

    const created = await create(adminCtx, {
      title: "A",
      internalNotes: "secret",
    });
    const visibleToUser = await findOne(userCtx, created.id as string);
    const visibleToAdmin = await findOne(adminCtx, created.id as string);

    expect(visibleToUser).toBeDefined();
    expect(visibleToUser?.internalNotes).toBeUndefined();
    expect(visibleToAdmin?.internalNotes).toBe("secret");
  });

  it("inherits parent group access for grouped writes and reads", async () => {
    const adminOnly = ({ req }: { req: Request }) => req.headers.get("x-user-role") === "admin";

    const secureCollection: CollectionConfig = {
      slug: "secure_group_posts",
      fields: [
        { name: "title", ...text() },
        {
          name: "seo",
          ...group({
            access: {
              create: adminOnly,
              update: adminOnly,
              read: adminOnly,
            },
            fields: [
              { name: "metaTitle", ...text() },
              { name: "metaDescription", ...text() },
            ],
          }),
        },
      ],
    };

    const adminReq = new Request("http://x", {
      headers: { "x-user-role": "admin" },
    });
    const editorReq = new Request("http://x", {
      headers: { "x-user-role": "editor" },
    });
    const adminCtx = await makeContext(secureCollection, adminReq);
    const editorCtx: QueryContext = {
      db: adminCtx.db,
      collection: secureCollection,
      req: editorReq,
    };

    await expect(
      create(editorCtx, {
        title: "A",
        seo: {
          metaTitle: "Blocked",
        },
      }),
    ).rejects.toThrow('Forbidden field "seo.metaTitle"');

    const created = await create(adminCtx, {
      title: "A",
      seo: {
        metaTitle: "Secret title",
        metaDescription: "Secret description",
      },
    });

    await expect(
      update(editorCtx, created.id as string, {
        seo: {
          metaTitle: "Still blocked",
        },
      }),
    ).rejects.toThrow('Forbidden field "seo.metaTitle"');

    const visibleToEditor = await findOne(editorCtx, created.id as string);
    const visibleToAdmin = await findOne(adminCtx, created.id as string);

    expect(visibleToEditor).toBeDefined();
    expect(visibleToEditor?.seo).toBeUndefined();
    expect(visibleToAdmin?.seo).toEqual({
      metaTitle: "Secret title",
      metaDescription: "Secret description",
    });
  });

  it("redacts restricted grouped children while preserving allowed siblings", async () => {
    const adminOnly = ({ req }: { req: Request }) => req.headers.get("x-user-role") === "admin";

    const secureCollection: CollectionConfig = {
      slug: "secure_group_child_posts",
      fields: [
        { name: "title", ...text() },
        {
          name: "seo",
          ...group({
            fields: [
              { name: "metaTitle", ...text() },
              {
                name: "internalNotes",
                ...text({
                  access: {
                    create: adminOnly,
                    update: adminOnly,
                    read: adminOnly,
                  },
                }),
              },
            ],
          }),
        },
      ],
    };

    const adminReq = new Request("http://x", {
      headers: { "x-user-role": "admin" },
    });
    const editorReq = new Request("http://x", {
      headers: { "x-user-role": "editor" },
    });
    const adminCtx = await makeContext(secureCollection, adminReq);
    const editorCtx: QueryContext = {
      db: adminCtx.db,
      collection: secureCollection,
      req: editorReq,
    };

    const created = await create(adminCtx, {
      title: "A",
      seo: {
        metaTitle: "Visible title",
        internalNotes: "Secret note",
      },
    });

    const editorUpdated = await update(editorCtx, created.id as string, {
      seo: {
        metaTitle: "Updated visible title",
      },
    });

    expect(editorUpdated.seo).toEqual({
      metaTitle: "Updated visible title",
    });

    await expect(
      update(editorCtx, created.id as string, {
        seo: {
          internalNotes: "Should fail",
        },
      }),
    ).rejects.toThrow('Forbidden field "seo.internalNotes"');

    const visibleToEditor = await findOne(editorCtx, created.id as string);
    const visibleToAdmin = await findOne(adminCtx, created.id as string);

    expect(visibleToEditor?.seo).toEqual({
      metaTitle: "Updated visible title",
    });
    expect(visibleToAdmin?.seo).toEqual({
      metaTitle: "Updated visible title",
      internalNotes: "Secret note",
    });
  });

  it("redacts auth-sensitive columns from read results", async () => {
    const usersCollection: CollectionConfig = {
      slug: "users",
      auth: true,
      fields: [{ name: "email", ...text({ required: true }) }],
    };
    const authCtx = await makeContext(usersCollection);
    const created = await create(authCtx, { email: "admin@example.com" });

    await authCtx.db.client.execute({
      sql: `UPDATE "users" SET hash = ?, salt = ?, token = ?, tokenExpiry = ? WHERE id = ?`,
      args: ["h", "s", "t", "te", created.id as string],
    });

    const found = await findOne(authCtx, created.id as string);
    expect(found).toBeDefined();
    expect(found?.hash).toBeUndefined();
    expect(found?.salt).toBeUndefined();
    expect(found?.token).toBeUndefined();
    expect(found?.tokenExpiry).toBeUndefined();
  });

  it("supports allowlisted where filters and rejects unsafe where keys", async () => {
    const filteredCollection: CollectionConfig = {
      slug: "filtered_posts",
      fields: [
        { name: "title", ...text() },
        {
          name: "status",
          ...select({
            options: [
              { label: "Draft", value: "draft" },
              { label: "Published", value: "published" },
            ],
          }),
        },
      ],
    };
    const filteredCtx = await makeContext(filteredCollection);
    await create(filteredCtx, { title: "A", status: "draft" });
    await create(filteredCtx, { title: "B", status: "published" });

    const draftDocs = await find(filteredCtx, { where: { status: "draft" } });
    expect(draftDocs).toHaveLength(1);
    expect(draftDocs[0]?.status).toBe("draft");

    await expect(find(filteredCtx, { where: { hash: "x" } })).rejects.toThrow(
      'Invalid where field "hash"',
    );
  });

  it("rejects unsafe sort columns", async () => {
    await expect(find(ctx, { sort: "hash", sortOrder: "asc" })).rejects.toThrow(
      'Invalid sort column "hash"',
    );
  });
});
