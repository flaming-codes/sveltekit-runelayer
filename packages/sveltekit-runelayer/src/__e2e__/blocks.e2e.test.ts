/**
 * E2E Journey: Blocks field — create / read / update / publish
 *
 * Uses a temporary file-based libsql DB — no Docker required.
 * Covers:
 *  - Creating a collection with a blocks field (two block types)
 *  - Creating a document; verifying blockType and _key are set
 *  - Updating a document; verifying _key is preserved
 *  - find() at depth 0 returns sentinel objects for relationship fields inside blocks
 *  - find() at depth 1 returns populated documents for relationship fields inside blocks
 *  - Publishing a versioned document; blocks data survives publish
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defineCollection,
  defineBlock,
  blocks,
  text,
  textarea,
  relationship,
  find,
  findOne,
  create,
  update,
  type QueryContext,
  type CollectionConfig,
} from "../index.js";
import { createDatabase } from "../db/init.js";
import { applySchemaForTests } from "../__testutils__/migrations.js";
import { publish } from "../query/operations.js";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const HeroBlock = defineBlock({
  slug: "hero",
  label: "Hero Section",
  fields: [
    { name: "heading", ...text({ required: true }) },
    { name: "subheading", ...textarea() },
    { name: "author", ...relationship({ relationTo: "authors" }) },
    { name: "coauthors", ...relationship({ relationTo: "authors", hasMany: true }) },
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

const Authors: CollectionConfig = defineCollection({
  slug: "authors",
  fields: [
    { name: "name", ...text({ required: true }) },
    { name: "bio", ...textarea() },
  ],
  admin: { useAsTitle: "name" },
});

const Pages: CollectionConfig = defineCollection({
  slug: "pages",
  fields: [
    { name: "title", ...text({ required: true }) },
    {
      name: "layout",
      ...blocks({
        blocks: [HeroBlock, CtaBlock],
        minBlocks: 0,
        maxBlocks: 20,
      }),
    },
  ],
  versions: { drafts: true },
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Blocks field — E2E journey", () => {
  let authorsCtx: QueryContext;
  let pagesCtx: QueryContext;
  let tmpDir: string;

  let authorAlice: Record<string, unknown>;
  let authorBob: Record<string, unknown>;
  let page: Record<string, unknown>;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "runelayer-blocks-e2e-"));
    const dbUrl = `file:${join(tmpDir, "blocks.db")}`;
    const db = createDatabase({ url: dbUrl, collections: [Authors, Pages] });
    await applySchemaForTests(db);

    authorsCtx = { db, collection: Authors };
    pagesCtx = { db, collection: Pages };

    // Create reference documents used by relationship sub-fields
    authorAlice = await create(authorsCtx, { name: "Alice" });
    authorBob = await create(authorsCtx, { name: "Bob" });
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // --- 26. Create a document with a blocks array ---

  it("creates a document with two block types via create()", async () => {
    page = await create(pagesCtx, {
      title: "Home",
      layout: [
        {
          blockType: "hero",
          heading: "Welcome",
          subheading: "Great site",
          author: authorAlice.id as string,
          coauthors: [authorBob.id as string],
        },
        {
          blockType: "cta",
          label: "Get Started",
          url: "/docs",
        },
      ],
    });

    expect(page.title).toBe("Home");
    const layout = page.layout as Record<string, unknown>[];
    expect(layout).toHaveLength(2);
  });

  // --- 27. Verify blockType and _key are set correctly ---

  it("sets blockType correctly for each block", async () => {
    const layout = page.layout as Record<string, unknown>[];
    expect(layout[0].blockType).toBe("hero");
    expect(layout[1].blockType).toBe("cta");
  });

  it("generates a _key for each block", async () => {
    const layout = page.layout as Record<string, unknown>[];
    expect(typeof layout[0]._key).toBe("string");
    expect((layout[0]._key as string).length).toBeGreaterThan(0);
    expect(typeof layout[1]._key).toBe("string");
    expect((layout[1]._key as string).length).toBeGreaterThan(0);
  });

  it("two blocks have distinct _key values", async () => {
    const layout = page.layout as Record<string, unknown>[];
    expect(layout[0]._key).not.toBe(layout[1]._key);
  });

  // --- 28. Update the document, verify _key is preserved ---

  it("preserves existing _key values on update", async () => {
    const layout = page.layout as Record<string, unknown>[];
    const originalHeroKey = layout[0]._key as string;
    const originalCtaKey = layout[1]._key as string;

    const updated = await update(pagesCtx, page.id as string, {
      layout: [
        {
          blockType: "hero",
          _key: originalHeroKey,
          heading: "Updated Welcome",
          author: authorAlice.id as string,
          coauthors: [authorBob.id as string],
        },
        {
          blockType: "cta",
          _key: originalCtaKey,
          label: "Start Now",
          url: "/start",
        },
      ],
    });

    const updatedLayout = updated.layout as Record<string, unknown>[];
    expect(updatedLayout[0]._key).toBe(originalHeroKey);
    expect(updatedLayout[1]._key).toBe(originalCtaKey);
    expect(updatedLayout[0].heading).toBe("Updated Welcome");
    expect(updatedLayout[1].label).toBe("Start Now");
  });

  // --- 29. find() at depth 0 returns sentinel objects ---

  it("find() at depth: 0 returns sentinel objects for relationship fields inside blocks", async () => {
    const docs = await find(pagesCtx, { draft: true, depth: 0 });
    const found = docs.find((d) => d.id === page.id) as Record<string, unknown>;
    expect(found).toBeDefined();

    const layout = found.layout as Record<string, unknown>[];
    const heroBlock = layout[0] as Record<string, unknown>;

    const authorSentinel = heroBlock.author as Record<string, unknown>;
    expect(authorSentinel._ref).toBe(authorAlice.id);
    expect(authorSentinel._collection).toBe("authors");

    const coauthorsSentinels = heroBlock.coauthors as Record<string, unknown>[];
    expect(coauthorsSentinels).toHaveLength(1);
    expect(coauthorsSentinels[0]._ref).toBe(authorBob.id);
    expect(coauthorsSentinels[0]._collection).toBe("authors");
  });

  // --- 30. find() at depth 1 returns populated documents ---

  it("find() at depth: 1 returns populated documents for relationship fields inside blocks", async () => {
    const docs = await find(pagesCtx, { draft: true, depth: 1 });
    const found = docs.find((d) => d.id === page.id) as Record<string, unknown>;
    expect(found).toBeDefined();

    const layout = found.layout as Record<string, unknown>[];
    const heroBlock = layout[0] as Record<string, unknown>;

    const authorDoc = heroBlock.author as Record<string, unknown>;
    expect(authorDoc.id).toBe(authorAlice.id);
    expect(authorDoc.name).toBe("Alice");

    const coauthorDocs = heroBlock.coauthors as Record<string, unknown>[];
    expect(coauthorDocs).toHaveLength(1);
    expect(coauthorDocs[0].id).toBe(authorBob.id);
    expect(coauthorDocs[0].name).toBe("Bob");
  });

  // --- 31. Publish the document — blocks data survives ---

  it("publishes the document and blocks data is preserved", async () => {
    const published = await publish(pagesCtx, page.id as string);
    expect(published._status).toBe("published");

    const layout = published.layout as Record<string, unknown>[];
    expect(layout).toHaveLength(2);
    expect(layout[0].blockType).toBe("hero");
    expect(layout[0].heading).toBe("Updated Welcome");
    expect(layout[1].blockType).toBe("cta");
    expect(layout[1].label).toBe("Start Now");
  });

  it("published document is returned by find() without draft flag", async () => {
    // Without draft:true, versioned collections filter to published only
    const docs = await find(pagesCtx);
    const found = docs.find((d) => d.id === page.id);
    expect(found).toBeDefined();
    expect((found as Record<string, unknown>)._status).toBe("published");
  });

  it("published document blocks contain sentinel refs at depth 0", async () => {
    const found = await findOne(pagesCtx, page.id as string, { depth: 0 });
    expect(found).toBeDefined();

    const layout = found!.layout as Record<string, unknown>[];
    const heroBlock = layout[0] as Record<string, unknown>;
    const authorSentinel = heroBlock.author as Record<string, unknown>;
    expect(authorSentinel._ref).toBe(authorAlice.id);
  });

  it("published document blocks populate refs at depth 1", async () => {
    const found = await findOne(pagesCtx, page.id as string, { depth: 1 });
    expect(found).toBeDefined();

    const layout = found!.layout as Record<string, unknown>[];
    const heroBlock = layout[0] as Record<string, unknown>;
    const authorDoc = heroBlock.author as Record<string, unknown>;
    expect(authorDoc.id).toBe(authorAlice.id);
    expect(authorDoc.name).toBe("Alice");
  });

  // --- Additional edge cases ---

  it("a document with an empty blocks array is stored correctly", async () => {
    const emptyPage = await create(pagesCtx, {
      title: "Empty Layout",
      layout: [],
    });
    expect(emptyPage.layout).toEqual([]);
  });

  it("a cta block without relationships passes through unchanged at depth 1", async () => {
    const ctaOnlyPage = await create(pagesCtx, {
      title: "CTA Only",
      layout: [{ blockType: "cta", label: "Click", url: "/go" }],
    });
    const found = await findOne(pagesCtx, ctaOnlyPage.id as string, { depth: 1 });
    const layout = found!.layout as Record<string, unknown>[];
    expect(layout[0].label).toBe("Click");
    expect(layout[0].url).toBe("/go");
  });
});
