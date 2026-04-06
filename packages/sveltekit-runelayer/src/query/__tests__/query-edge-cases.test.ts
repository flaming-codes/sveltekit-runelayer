import { describe, it, expect, beforeEach } from "vitest";
import { createDatabase, type RunelayerDatabase } from "../../db/init.js";
import { email, text, number } from "../../schema/fields.js";
import type { CollectionConfig } from "../../schema/collections.js";
import { checkAccess } from "../access.js";
import { create, find, findOne } from "../operations.js";
import type { QueryContext } from "../types.js";
import { applySchemaForTests } from "../../__testutils__/migrations.js";

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

// ---------------------------------------------------------------------------
// Email field: type coercion and storage
// ---------------------------------------------------------------------------

describe("email field behavior", () => {
  const emailCollection: CollectionConfig = {
    slug: "contacts",
    fields: [{ name: "contactEmail", ...email({ required: true }) }],
  };

  it("accepts a valid email and stores it", async () => {
    const ctx = await makeContext(emailCollection);
    const doc = await create(ctx, { contactEmail: "user@example.com" });
    expect(doc.contactEmail).toBe("user@example.com");
  });

  it("rejects a non-string value for email field", async () => {
    const ctx = await makeContext(emailCollection);
    await expect(create(ctx, { contactEmail: 12345 } as any)).rejects.toThrow(
      'Field "contactEmail" must be a string',
    );
  });

  it("enforces required on email field", async () => {
    const ctx = await makeContext(emailCollection);
    await expect(create(ctx, {})).rejects.toThrow('Field "contactEmail" is required');
  });

  it("accepts email with custom validate callback", async () => {
    const validatedEmailCollection: CollectionConfig = {
      slug: "validated_contacts",
      fields: [
        {
          name: "contactEmail",
          ...email({
            validate: (value) => value.includes("@company.com") || "Must be a company email",
          }),
        },
      ],
    };
    const ctx = await makeContext(validatedEmailCollection);
    await expect(create(ctx, { contactEmail: "user@other.com" })).rejects.toThrow(
      "Must be a company email",
    );
    const doc = await create(ctx, { contactEmail: "user@company.com" });
    expect(doc.contactEmail).toBe("user@company.com");
  });
});

// ---------------------------------------------------------------------------
// checkAccess with async access function
// ---------------------------------------------------------------------------

describe("checkAccess with async access function", () => {
  it("passes when async accessFn resolves to true", async () => {
    const fn = async () => true;
    await expect(checkAccess(fn, new Request("http://x"))).resolves.toBeUndefined();
  });

  it("throws 403 when async accessFn resolves to false", async () => {
    const fn = async () => false;
    await expect(checkAccess(fn, new Request("http://x"))).rejects.toThrow("Forbidden");
  });

  it("propagates rejection from async accessFn", async () => {
    const fn = async () => {
      throw new Error("Access check failed");
    };
    await expect(checkAccess(fn, new Request("http://x"))).rejects.toThrow("Access check failed");
  });

  it("passes data and id arguments through to the access function", async () => {
    let receivedData: unknown;
    let receivedId: unknown;
    const fn = async ({ data, id }: { req: Request; data?: unknown; id?: string }) => {
      receivedData = data;
      receivedId = id;
      return true;
    };
    await checkAccess(fn, new Request("http://x"), { title: "test" }, "doc-123");
    expect(receivedData).toEqual({ title: "test" });
    expect(receivedId).toBe("doc-123");
  });
});

// ---------------------------------------------------------------------------
// find with offset
// ---------------------------------------------------------------------------

describe("find with offset", () => {
  let ctx: QueryContext;

  beforeEach(async () => {
    const collection: CollectionConfig = {
      slug: "items",
      fields: [{ name: "title", ...text() }],
    };
    ctx = await makeContext(collection);
    await create(ctx, { title: "A" });
    await create(ctx, { title: "B" });
    await create(ctx, { title: "C" });
  });

  it("offset 0 with explicit limit returns all documents", async () => {
    const docs = await find(ctx, { offset: 0, limit: 100 });
    expect(docs).toHaveLength(3);
  });

  it("offset with limit returns the correct slice", async () => {
    const docs = await find(ctx, { offset: 1, limit: 1 });
    expect(docs).toHaveLength(1);
  });

  it("limit alone restricts the result count", async () => {
    const docs = await find(ctx, { limit: 2 });
    expect(docs).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Access function receives correct id and data arguments
// ---------------------------------------------------------------------------

describe("access function receives correct arguments", () => {
  it("collection-level create access receives data", async () => {
    let receivedData: unknown;
    let receivedId: unknown;

    const collection: CollectionConfig = {
      slug: "guarded_posts",
      fields: [{ name: "title", ...text({ required: true }) }],
      access: {
        create: ({ data, id }) => {
          receivedData = data;
          receivedId = id;
          return true;
        },
      },
    };

    const ctx = await makeContext(collection, new Request("http://x"));
    await create(ctx, { title: "Guarded" });

    expect(receivedData).toBeDefined();
    expect((receivedData as Record<string, unknown>).title).toBe("Guarded");
    expect(receivedId).toBeUndefined();
  });

  it("collection-level read access receives id on findOne", async () => {
    let receivedId: unknown;

    const collection: CollectionConfig = {
      slug: "readable_posts",
      fields: [{ name: "title", ...text() }],
      access: {
        read: ({ id }) => {
          receivedId = id;
          return true;
        },
      },
    };

    const ctx = await makeContext(collection, new Request("http://x"));
    const doc = await create(ctx, { title: "Test" });
    await findOne(ctx, doc.id as string);
    expect(receivedId).toBe(doc.id);
  });

  it("collection-level update access receives both data and id", async () => {
    let receivedData: unknown;
    let receivedId: unknown;

    const collection: CollectionConfig = {
      slug: "updatable_posts",
      fields: [{ name: "title", ...text() }],
      access: {
        update: ({ data, id }) => {
          receivedData = data;
          receivedId = id;
          return true;
        },
      },
    };

    const ctx = await makeContext(collection, new Request("http://x"));
    const doc = await create(ctx, { title: "Original" });
    const { update } = await import("../operations.js");
    await update(ctx, doc.id as string, { title: "Changed" });

    expect(receivedId).toBe(doc.id);
    expect(receivedData).toBeDefined();
    expect((receivedData as Record<string, unknown>).title).toBe("Changed");
  });
});

// ---------------------------------------------------------------------------
// Number field edge cases
// ---------------------------------------------------------------------------

describe("number field edge cases", () => {
  it("rejects NaN string", async () => {
    const collection: CollectionConfig = {
      slug: "num_posts",
      fields: [{ name: "count", ...number() }],
    };
    const ctx = await makeContext(collection);
    await expect(create(ctx, { count: "not-a-number" })).rejects.toThrow(
      'Field "count" must be a number',
    );
  });

  it("rejects Infinity", async () => {
    const collection: CollectionConfig = {
      slug: "inf_posts",
      fields: [{ name: "count", ...number() }],
    };
    const ctx = await makeContext(collection);
    await expect(create(ctx, { count: Infinity })).rejects.toThrow(
      'Field "count" must be a number',
    );
  });

  it("accepts zero", async () => {
    const collection: CollectionConfig = {
      slug: "zero_posts",
      fields: [{ name: "count", ...number() }],
    };
    const ctx = await makeContext(collection);
    const doc = await create(ctx, { count: 0 });
    expect(doc.count).toBe(0);
  });
});
