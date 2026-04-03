/**
 * Unit tests for blocks field enforcement and relationship sentinel normalization.
 */
import { describe, it, expect } from "vitest";
import { enforceWritePayload } from "../enforcement.js";
import { blocks, defineBlock, relationship, text, textarea } from "../../schema/fields.js";
import type { CollectionConfig } from "../../schema/collections.js";
import { createDatabase } from "../../db/init.js";
import { applySchemaForTests } from "../../__testutils__/migrations.js";
import { find, findOne, create, update } from "../operations.js";
import type { QueryContext } from "../types.js";

// ---------------------------------------------------------------------------
// Shared block configs
// ---------------------------------------------------------------------------

const HeroBlock = defineBlock({
  slug: "hero",
  label: "Hero Section",
  fields: [
    { name: "heading", ...text({ required: true }) },
    { name: "subheading", ...textarea() },
  ],
});

const CtaBlock = defineBlock({
  slug: "cta",
  label: "Call to Action",
  fields: [
    { name: "label", ...text({ required: true }) },
    { name: "url", ...text({ required: true }) },
  ],
});

const blocksCollection: CollectionConfig = {
  slug: "pages",
  fields: [
    { name: "title", ...text({ required: true }) },
    {
      name: "layout",
      ...blocks({
        blocks: [HeroBlock, CtaBlock],
        minBlocks: 1,
        maxBlocks: 5,
      }),
    },
  ],
};

// Collection with a relationship field for sentinel tests
const relCollection: CollectionConfig = {
  slug: "articles",
  fields: [
    { name: "title", ...text() },
    { name: "author", ...relationship({ relationTo: "authors" }) },
    { name: "tags", ...relationship({ relationTo: "tags", hasMany: true }) },
    {
      name: "related",
      ...relationship({ relationTo: ["posts", "pages"] }),
    },
  ],
};

// ---------------------------------------------------------------------------
// describe: blocks field enforcement
// ---------------------------------------------------------------------------

describe("blocks field enforcement", () => {
  it("rejects non-array value for a blocks field", async () => {
    await expect(
      enforceWritePayload(
        blocksCollection,
        "create",
        { title: "Page", layout: "not-an-array" },
        undefined,
      ),
    ).rejects.toThrow("must be an array");
  });

  it("enforces minBlocks — rejects when array is too short", async () => {
    await expect(
      enforceWritePayload(blocksCollection, "create", { title: "Page", layout: [] }, undefined),
    ).rejects.toThrow("Minimum 1 block");
  });

  it("enforces maxBlocks — rejects when array is too long", async () => {
    const tooMany = Array.from({ length: 6 }, (_, i) => ({
      blockType: "hero",
      heading: `Heading ${i}`,
    }));
    await expect(
      enforceWritePayload(
        blocksCollection,
        "create",
        { title: "Page", layout: tooMany },
        undefined,
      ),
    ).rejects.toThrow("Maximum 5 block");
  });

  it("rejects unknown blockType with a message listing allowed slugs", async () => {
    await expect(
      enforceWritePayload(
        blocksCollection,
        "create",
        {
          title: "Page",
          layout: [{ blockType: "unknown-type", heading: "Hello" }],
        },
        undefined,
      ),
    ).rejects.toThrow(/unknown blockType.*unknown-type.*Allowed:.*hero.*cta/i);
  });

  it("accepts valid block with correct blockType", async () => {
    const result = await enforceWritePayload(
      blocksCollection,
      "create",
      {
        title: "Page",
        layout: [{ blockType: "hero", heading: "Welcome" }],
      },
      undefined,
    );
    const layout = result.layout as Record<string, unknown>[];
    expect(layout).toHaveLength(1);
    expect(layout[0].blockType).toBe("hero");
    expect(layout[0].heading).toBe("Welcome");
  });

  it("generates _key when absent", async () => {
    const result = await enforceWritePayload(
      blocksCollection,
      "create",
      {
        title: "Page",
        layout: [{ blockType: "hero", heading: "Hello" }],
      },
      undefined,
    );
    const layout = result.layout as Record<string, unknown>[];
    expect(typeof layout[0]._key).toBe("string");
    expect((layout[0]._key as string).length).toBeGreaterThan(0);
  });

  it("preserves existing _key on update", async () => {
    const existingKey = "my-stable-key-abc123";
    const result = await enforceWritePayload(
      blocksCollection,
      "update",
      {
        layout: [{ blockType: "hero", _key: existingKey, heading: "Updated" }],
      },
      undefined,
    );
    const layout = result.layout as Record<string, unknown>[];
    expect(layout[0]._key).toBe(existingKey);
  });

  it("rejects blockType change on update for an existing block (_key match)", async () => {
    const existingKey = "stable-key-xyz";
    const existingDoc = {
      layout: [{ blockType: "hero", _key: existingKey, heading: "Original" }],
    };
    await expect(
      enforceWritePayload(
        blocksCollection,
        "update",
        { layout: [{ blockType: "cta", _key: existingKey, label: "Click me", url: "/go" }] },
        undefined,
        existingDoc,
      ),
    ).rejects.toThrow(`blockType cannot be changed`);
  });

  it("enforces required sub-fields on create", async () => {
    // hero requires "heading"
    await expect(
      enforceWritePayload(
        blocksCollection,
        "create",
        {
          title: "Page",
          layout: [{ blockType: "hero" }],
        },
        undefined,
      ),
    ).rejects.toThrow('Field "heading" is required');
  });

  it("does NOT enforce required sub-fields when relaxRequired is set (saveDraft path)", async () => {
    // saveDraft calls enforceWritePayload with relaxRequired: true; this exercises the
    // sub-field enforcement which always runs required checks on "create" operation.
    // For "update" operation (what saveDraft uses), required sub-fields are skipped.
    const result = await enforceWritePayload(
      blocksCollection,
      "update",
      {
        layout: [{ blockType: "hero" }], // no heading — required but update skips it
      },
      undefined,
      undefined,
      undefined,
      { relaxRequired: true },
    );
    const layout = result.layout as Record<string, unknown>[];
    expect(layout[0].blockType).toBe("hero");
  });
});

// ---------------------------------------------------------------------------
// describe: relationship sentinel normalization
// ---------------------------------------------------------------------------

describe("relationship sentinel normalization", () => {
  it("bare string ID is wrapped to { _ref, _collection } for single relationship", async () => {
    const result = await enforceWritePayload(
      relCollection,
      "create",
      { title: "Art", author: "user-abc" },
      undefined,
    );
    expect(result.author).toEqual({ _ref: "user-abc", _collection: "authors" });
  });

  it("existing sentinel is passed through unchanged", async () => {
    const sentinel = { _ref: "user-abc", _collection: "authors" };
    const result = await enforceWritePayload(
      relCollection,
      "create",
      { title: "Art", author: sentinel },
      undefined,
    );
    expect(result.author).toEqual(sentinel);
  });

  it("hasMany: true — array of bare strings → array of sentinels", async () => {
    const result = await enforceWritePayload(
      relCollection,
      "create",
      { title: "Art", tags: ["tag-1", "tag-2"] },
      undefined,
    );
    expect(result.tags).toEqual([
      { _ref: "tag-1", _collection: "tags" },
      { _ref: "tag-2", _collection: "tags" },
    ]);
  });

  it("hasMany: true — array of existing sentinels is passed through unchanged", async () => {
    const sentinels = [
      { _ref: "tag-1", _collection: "tags" },
      { _ref: "tag-2", _collection: "tags" },
    ];
    const result = await enforceWritePayload(
      relCollection,
      "create",
      { title: "Art", tags: sentinels },
      undefined,
    );
    expect(result.tags).toEqual(sentinels);
  });

  it("polymorphic relationTo: string[] — requires sentinel (rejects bare string)", async () => {
    await expect(
      enforceWritePayload(relCollection, "create", { title: "Art", related: "some-id" }, undefined),
    ).rejects.toThrow(/polymorphic.*sentinel/i);
  });

  it("invalid value (object without _ref/_collection) is rejected", async () => {
    await expect(
      enforceWritePayload(
        relCollection,
        "create",
        { title: "Art", author: { id: "user-abc" } },
        undefined,
      ),
    ).rejects.toThrow(/invalid relationship value/i);
  });

  it("sentinel with empty _ref is rejected", async () => {
    // Empty _ref means isRefSentinel() returns false → falls through to bare-string path
    // which requires typeof val === "string" — so an object with empty _ref is also invalid.
    await expect(
      enforceWritePayload(
        relCollection,
        "create",
        { title: "Art", author: { _ref: "", _collection: "authors" } },
        undefined,
      ),
    ).rejects.toThrow(/invalid relationship value/i);
  });

  it("sentinel with empty _collection is rejected (fails COLLECTION_SLUG_RE)", async () => {
    await expect(
      enforceWritePayload(
        relCollection,
        "create",
        { title: "Art", author: { _ref: "user-abc", _collection: "" } },
        undefined,
      ),
    ).rejects.toThrow(/invalid relationship value/i);
  });
});

// ---------------------------------------------------------------------------
// describe: populateRefs / depth parameter
// ---------------------------------------------------------------------------

async function makeBlocksCtx(): Promise<{
  pagesCtx: QueryContext;
  authorsCtx: QueryContext;
}> {
  const AuthorBlock = defineBlock({
    slug: "section",
    label: "Section",
    fields: [
      { name: "heading", ...text() },
      { name: "author", ...relationship({ relationTo: "authors" }) },
      { name: "coauthors", ...relationship({ relationTo: "authors", hasMany: true }) },
    ],
  });

  const PagesCollection: CollectionConfig = {
    slug: "pages",
    fields: [
      { name: "title", ...text() },
      { name: "owner", ...relationship({ relationTo: "authors" }) },
      {
        name: "layout",
        ...blocks({ blocks: [AuthorBlock] }),
      },
    ],
  };

  const AuthorsCollection: CollectionConfig = {
    slug: "authors",
    fields: [{ name: "name", ...text({ required: true }) }],
  };

  const db = createDatabase({ url: ":memory:", collections: [PagesCollection, AuthorsCollection] });
  await applySchemaForTests(db);

  return {
    pagesCtx: { db, collection: PagesCollection },
    authorsCtx: { db, collection: AuthorsCollection },
  };
}

describe("populateRefs / depth parameter", () => {
  it("depth: 0 (default) returns raw sentinels unchanged", async () => {
    const { pagesCtx, authorsCtx } = await makeBlocksCtx();

    const author = await create(authorsCtx, { name: "Alice" });
    const page = await create(pagesCtx, {
      title: "About",
      owner: author.id as string,
      layout: [{ blockType: "section", heading: "Intro", author: author.id as string }],
    });

    const found = await findOne(pagesCtx, page.id as string); // default depth 0
    const ownerVal = found!.owner as Record<string, unknown>;
    expect(ownerVal._ref).toBe(author.id);
    expect(ownerVal._collection).toBe("authors");

    const layout = found!.layout as Record<string, unknown>[];
    const authorVal = layout[0].author as Record<string, unknown>;
    expect(authorVal._ref).toBe(author.id);
    expect(authorVal._collection).toBe("authors");
  });

  it("depth: 1 replaces a single-relationship sentinel with the full referenced document", async () => {
    const { pagesCtx, authorsCtx } = await makeBlocksCtx();

    const author = await create(authorsCtx, { name: "Bob" });
    const page = await create(pagesCtx, {
      title: "Contact",
      owner: author.id as string,
      layout: [],
    });

    const found = await findOne(pagesCtx, page.id as string, { depth: 1 });
    const ownerVal = found!.owner as Record<string, unknown>;
    expect(ownerVal.id).toBe(author.id);
    expect(ownerVal.name).toBe("Bob");
  });

  it("depth: 1 replaces a hasMany-relationship sentinel array with populated documents", async () => {
    const { pagesCtx, authorsCtx } = await makeBlocksCtx();

    const a1 = await create(authorsCtx, { name: "Carol" });
    const a2 = await create(authorsCtx, { name: "Dave" });

    const page = await create(pagesCtx, {
      title: "Team",
      layout: [
        {
          blockType: "section",
          heading: "Team",
          coauthors: [a1.id as string, a2.id as string],
        },
      ],
    });

    const found = await findOne(pagesCtx, page.id as string, { depth: 1 });
    const layout = found!.layout as Record<string, unknown>[];
    const coauthors = layout[0].coauthors as Record<string, unknown>[];
    expect(coauthors).toHaveLength(2);
    const names = coauthors.map((a) => a.name);
    expect(names).toContain("Carol");
    expect(names).toContain("Dave");
  });

  it("depth: 1 returns null for a sentinel that references a missing/deleted document", async () => {
    const { pagesCtx } = await makeBlocksCtx();

    // Insert page with a dangling ref (author doesn't exist)
    const page = await create(pagesCtx, {
      title: "Orphan",
      owner: { _ref: "nonexistent-id", _collection: "authors" },
      layout: [],
    });

    const found = await findOne(pagesCtx, page.id as string, { depth: 1 });
    expect(found!.owner).toBeNull();
  });

  it("depth: 1 with unknown _collection (no table) returns null gracefully", async () => {
    const { pagesCtx } = await makeBlocksCtx();

    // Insert page with a sentinel pointing to a collection that has no table
    const page = await create(pagesCtx, {
      title: "Unknown ref",
      owner: { _ref: "some-id", _collection: "no-such-collection" },
      layout: [],
    });

    const found = await findOne(pagesCtx, page.id as string, { depth: 1 });
    expect(found!.owner).toBeNull();
  });

  it("depth: 1 on a document with NO relationship fields — same result, no extra queries", async () => {
    const simpleCollection: CollectionConfig = {
      slug: "notes",
      fields: [{ name: "body", ...text() }],
    };

    const db = createDatabase({ url: ":memory:", collections: [simpleCollection] });
    await applySchemaForTests(db);
    const ctx: QueryContext = { db, collection: simpleCollection };

    const note = await create(ctx, { body: "Hello" });
    const found = await findOne(ctx, note.id as string, { depth: 1 });
    expect(found!.body).toBe("Hello");
  });
});
