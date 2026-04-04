import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  blocks,
  create,
  createRunelayer,
  defineBlock,
  defineCollection,
  defineConfig,
  defineGlobal,
  find,
  findOne,
  group,
  publish,
  relationship,
  restoreVersion,
  saveDraft,
  text,
  textarea,
  update,
  type CollectionConfig,
  type GlobalConfig,
  type QueryContext,
  type RunelayerInstance,
} from "../index.js";
import {
  findGlobalVersions,
  readGlobalDocument,
  restoreGlobalVersion,
  updateGlobalDocument,
} from "../sveltekit/globals.js";
import { migrateDatabaseForTests } from "../__testutils__/migrations.js";

const HeroBlock = defineBlock({
  slug: "hero",
  label: "Hero",
  fields: [
    { name: "heading", ...text({ required: true }) },
    {
      name: "cta",
      ...group({
        fields: [
          { name: "label", ...text({ required: true }) },
          { name: "url", ...text({ required: true }) },
        ],
      }),
    },
  ],
});

const Authors: CollectionConfig = defineCollection({
  slug: "authors",
  fields: [{ name: "name", ...text({ required: true }) }],
});

const Articles: CollectionConfig = defineCollection({
  slug: "articles",
  fields: [
    { name: "title", ...text({ required: true }) },
    {
      name: "seo",
      ...group({
        fields: [
          { name: "metaTitle", ...text() },
          { name: "metaDescription", ...textarea() },
        ],
      }),
    },
    {
      name: "authorInfo",
      ...group({
        fields: [
          { name: "author", ...relationship({ relationTo: "authors" }) },
        ],
      }),
    },
  ],
  versions: { drafts: true, maxPerDoc: 10 },
});

const Pages: CollectionConfig = defineCollection({
  slug: "pages",
  fields: [
    { name: "title", ...text({ required: true }) },
    { name: "layout", ...blocks({ blocks: [HeroBlock] }) },
  ],
});

const SiteSettings: GlobalConfig = defineGlobal({
  slug: "site-settings",
  label: "Site Settings",
  fields: [
    {
      name: "seo",
      ...group({
        fields: [
          { name: "title", ...text() },
          { name: "description", ...textarea() },
        ],
      }),
    },
  ],
  versions: { drafts: true, maxPerDoc: 10 },
});

type HookSnapshot = {
  id?: string;
  data?: Record<string, unknown>;
  existingDoc?: Record<string, unknown>;
  doc?: Record<string, unknown>;
};

const collectionHookEvents = {
  beforeChange: [] as HookSnapshot[],
  afterChange: [] as HookSnapshot[],
  beforeRead: [] as HookSnapshot[],
  afterRead: [] as HookSnapshot[],
};

const globalHookEvents = {
  beforeChange: [] as HookSnapshot[],
  afterChange: [] as HookSnapshot[],
  beforeRead: [] as HookSnapshot[],
  afterRead: [] as HookSnapshot[],
};

function cloneRecord(
  value: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return value ? structuredClone(value) : undefined;
}

function captureHookSnapshot(ctx: {
  id?: string;
  data?: Record<string, unknown>;
  existingDoc?: Record<string, unknown>;
  doc?: Record<string, unknown>;
}): HookSnapshot {
  return {
    id: ctx.id,
    data: cloneRecord(ctx.data),
    existingDoc: cloneRecord(ctx.existingDoc),
    doc: cloneRecord(ctx.doc),
  };
}

function resetHookEvents(): void {
  for (const events of [collectionHookEvents, globalHookEvents]) {
    events.beforeChange.length = 0;
    events.afterChange.length = 0;
    events.beforeRead.length = 0;
    events.afterRead.length = 0;
  }
}

const HookedArticles: CollectionConfig = defineCollection({
  slug: "hooked_articles",
  fields: [
    { name: "title", ...text({ required: true }) },
    {
      name: "seo",
      ...group({
        fields: [
          { name: "metaTitle", ...text() },
          { name: "metaDescription", ...textarea() },
        ],
      }),
    },
  ],
  hooks: {
    beforeChange: [
      (ctx) => {
        collectionHookEvents.beforeChange.push(captureHookSnapshot(ctx));
        return ctx;
      },
    ],
    afterChange: [
      (ctx) => {
        collectionHookEvents.afterChange.push(captureHookSnapshot(ctx));
      },
    ],
    beforeRead: [
      (ctx) => {
        collectionHookEvents.beforeRead.push(captureHookSnapshot(ctx));
        return ctx;
      },
    ],
    afterRead: [
      (ctx) => {
        collectionHookEvents.afterRead.push(captureHookSnapshot(ctx));
      },
    ],
  },
});

const HookedSettings: GlobalConfig = defineGlobal({
  slug: "hooked-settings",
  label: "Hooked Settings",
  fields: [
    {
      name: "seo",
      ...group({
        fields: [
          { name: "title", ...text() },
          { name: "description", ...textarea() },
        ],
      }),
    },
  ],
  hooks: {
    beforeChange: [
      (ctx) => {
        globalHookEvents.beforeChange.push(captureHookSnapshot(ctx));
        return ctx;
      },
    ],
    afterChange: [
      (ctx) => {
        globalHookEvents.afterChange.push(captureHookSnapshot(ctx));
      },
    ],
    beforeRead: [
      (ctx) => {
        globalHookEvents.beforeRead.push(captureHookSnapshot(ctx));
        return ctx;
      },
    ],
    afterRead: [
      (ctx) => {
        globalHookEvents.afterRead.push(captureHookSnapshot(ctx));
      },
    ],
  },
});

function adminReq(): Request {
  const headers = new Headers();
  headers.set("x-user-id", "admin-1");
  headers.set("x-user-role", "admin");
  return new Request("http://localhost", { headers });
}

describe("Grouped field contract", () => {
  let kit: RunelayerInstance;
  let tmpDir: string;
  let dbUrl: string;

  function ctx(collection: CollectionConfig, req?: Request): QueryContext {
    return {
      db: kit.database,
      collection,
      req,
      collections: kit.collections,
    };
  }

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "runelayer-group-contract-"));
    dbUrl = `file:${join(tmpDir, "group-contract.db")}`;
    await migrateDatabaseForTests(dbUrl, [
      Authors,
      Articles,
      Pages,
      HookedArticles,
    ]);

    kit = createRunelayer(
      defineConfig({
        collections: [Authors, Articles, Pages, HookedArticles],
        globals: [SiteSettings, HookedSettings],
        database: { url: dbUrl },
        auth: {
          secret: "group-contract-secret-32-chars!!",
          baseURL: "http://localhost:3000",
        },
      }),
    );
  });

  beforeEach(() => {
    resetHookEvents();
  });

  afterAll(async () => {
    kit.database.client.close();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("creates, reads, updates, filters, and sorts nested group fields", async () => {
    const author = await create(ctx(Authors), { name: "Alice" });

    const first = await create(ctx(Articles), {
      title: "First article",
      seo: {
        metaTitle: "Zulu",
        metaDescription: "Original description",
      },
      authorInfo: {
        author: author.id as string,
      },
    });

    await create(ctx(Articles), {
      title: "Second article",
      seo: {
        metaTitle: "Alpha",
      },
    });

    expect(first.seo).toEqual({
      metaTitle: "Zulu",
      metaDescription: "Original description",
    });

    const updated = await update(ctx(Articles), first.id as string, {
      seo: {
        metaTitle: "Bravo",
      },
    });

    expect(updated.seo).toEqual({
      metaTitle: "Bravo",
      metaDescription: "Original description",
    });

    const found = await findOne(ctx(Articles), first.id as string, {
      depth: 1,
    });
    expect(found?.seo).toEqual({
      metaTitle: "Bravo",
      metaDescription: "Original description",
    });
    expect(
      (found?.authorInfo as Record<string, unknown>)?.author,
    ).toMatchObject({
      id: author.id,
      name: "Alice",
    });

    const filtered = await find(ctx(Articles), {
      draft: true,
      where: { "seo.metaTitle": "Alpha" },
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe("Second article");

    const sorted = await find(ctx(Articles), {
      draft: true,
      sort: "seo.metaTitle",
      sortOrder: "asc",
    });
    expect(sorted.map((doc) => doc.title)).toEqual([
      "Second article",
      "First article",
    ]);
  });

  it("round-trips groups nested inside blocks", async () => {
    const page = await create(ctx(Pages), {
      title: "Home",
      layout: [
        {
          blockType: "hero",
          heading: "Welcome",
          cta: {
            label: "Get started",
            url: "/docs",
          },
        },
      ],
    });

    expect((page.layout as Array<Record<string, unknown>>)[0]?.cta).toEqual({
      label: "Get started",
      url: "/docs",
    });

    const found = await findOne(ctx(Pages), page.id as string);
    const foundLayout = Array.isArray(found?.layout)
      ? (found.layout[0] as Record<string, unknown> | undefined)
      : undefined;
    expect(foundLayout?.cta).toEqual({
      label: "Get started",
      url: "/docs",
    });
  });

  it("collection hooks receive nested grouped documents and patches", async () => {
    const created = await create(ctx(HookedArticles), {
      title: "Hooked article",
      seo: {
        metaTitle: "Initial title",
        metaDescription: "Initial description",
      },
    });

    expect(collectionHookEvents.beforeChange).toHaveLength(1);
    expect(collectionHookEvents.beforeChange[0]).toMatchObject({
      data: {
        title: "Hooked article",
        seo: {
          metaTitle: "Initial title",
          metaDescription: "Initial description",
        },
      },
    });
    expect(collectionHookEvents.afterChange).toHaveLength(1);
    expect(collectionHookEvents.afterChange[0]).toMatchObject({
      doc: {
        id: created.id,
        seo: {
          metaTitle: "Initial title",
          metaDescription: "Initial description",
        },
      },
    });

    const updated = await update(ctx(HookedArticles), created.id as string, {
      seo: {
        metaTitle: "Updated title",
      },
    });

    expect(collectionHookEvents.beforeChange).toHaveLength(2);
    expect(collectionHookEvents.beforeChange[1]).toMatchObject({
      id: created.id,
      data: {
        seo: {
          metaTitle: "Updated title",
        },
      },
      existingDoc: {
        id: created.id,
        seo: {
          metaTitle: "Initial title",
          metaDescription: "Initial description",
        },
      },
    });
    expect(collectionHookEvents.afterChange).toHaveLength(2);
    expect(collectionHookEvents.afterChange[1]).toMatchObject({
      doc: {
        id: created.id,
        seo: {
          metaTitle: "Updated title",
          metaDescription: "Initial description",
        },
      },
    });
    expect(updated.seo).toEqual({
      metaTitle: "Updated title",
      metaDescription: "Initial description",
    });

    resetHookEvents();
    const found = await findOne(ctx(HookedArticles), created.id as string);

    expect(found?.seo).toEqual({
      metaTitle: "Updated title",
      metaDescription: "Initial description",
    });
    expect(collectionHookEvents.beforeRead).toHaveLength(1);
    expect(collectionHookEvents.beforeRead[0]).toMatchObject({
      id: created.id,
    });
    expect(collectionHookEvents.afterRead).toHaveLength(1);
    expect(collectionHookEvents.afterRead[0]).toMatchObject({
      id: created.id,
      doc: {
        id: created.id,
        seo: {
          metaTitle: "Updated title",
          metaDescription: "Initial description",
        },
      },
    });
    expect(collectionHookEvents.afterRead[0]?.doc).not.toHaveProperty(
      "seo_metaTitle",
    );
  });

  it("global hooks receive nested grouped documents and patches", async () => {
    const req = adminReq();

    const first = await updateGlobalDocument(kit, HookedSettings, req, {
      seo: {
        title: "Initial global title",
        description: "Initial global description",
      },
    });

    expect(globalHookEvents.beforeChange).toHaveLength(1);
    expect(globalHookEvents.beforeChange[0]).toMatchObject({
      data: {
        seo: {
          title: "Initial global title",
          description: "Initial global description",
        },
      },
    });
    expect(globalHookEvents.afterChange).toHaveLength(1);
    expect(globalHookEvents.afterChange[0]).toMatchObject({
      doc: {
        id: HookedSettings.slug,
        seo: {
          title: "Initial global title",
          description: "Initial global description",
        },
      },
    });
    expect(first.seo).toEqual({
      title: "Initial global title",
      description: "Initial global description",
    });

    const second = await updateGlobalDocument(kit, HookedSettings, req, {
      seo: {
        title: "Updated global title",
      },
    });

    expect(globalHookEvents.beforeChange).toHaveLength(2);
    expect(globalHookEvents.beforeChange[1]).toMatchObject({
      id: HookedSettings.slug,
      data: {
        seo: {
          title: "Updated global title",
        },
      },
      existingDoc: {
        id: HookedSettings.slug,
        seo: {
          title: "Initial global title",
          description: "Initial global description",
        },
      },
    });
    expect(globalHookEvents.afterChange).toHaveLength(2);
    expect(globalHookEvents.afterChange[1]).toMatchObject({
      doc: {
        id: HookedSettings.slug,
        seo: {
          title: "Updated global title",
          description: "Initial global description",
        },
      },
    });
    expect(second.seo).toEqual({
      title: "Updated global title",
      description: "Initial global description",
    });

    resetHookEvents();
    const current = await readGlobalDocument(kit, HookedSettings, req);

    expect(current.seo).toEqual({
      title: "Updated global title",
      description: "Initial global description",
    });
    expect(globalHookEvents.beforeRead).toHaveLength(1);
    expect(globalHookEvents.beforeRead[0]).toMatchObject({
      id: HookedSettings.slug,
    });
    expect(globalHookEvents.afterRead).toHaveLength(1);
    expect(globalHookEvents.afterRead[0]).toMatchObject({
      id: HookedSettings.slug,
      doc: {
        id: HookedSettings.slug,
        seo: {
          title: "Updated global title",
          description: "Initial global description",
        },
      },
    });
    expect(globalHookEvents.afterRead[0]?.doc).not.toHaveProperty("seo_title");
  });

  it("stores new snapshots as nested documents and restores legacy flat snapshots", async () => {
    const article = await create(ctx(Articles), {
      title: "Versioned article",
      seo: {
        metaTitle: "Current title",
        metaDescription: "Current description",
      },
    });

    await publish(ctx(Articles), article.id as string);
    await saveDraft(ctx(Articles), article.id as string, {
      seo: { metaTitle: "Draft title" },
    });

    const nestedVersionRows = await kit.database.client.execute({
      sql: `SELECT id FROM "articles_versions" WHERE _parentId = ? ORDER BY createdAt ASC LIMIT 1`,
      args: [article.id as string],
    });
    const nestedVersionId = nestedVersionRows.rows[0]?.id;
    if (typeof nestedVersionId !== "string") {
      throw new Error(
        "Expected an initial version row for the published article",
      );
    }
    const restoredNested = await restoreVersion(
      ctx(Articles),
      article.id as string,
      nestedVersionId,
    );

    expect(restoredNested.seo).toMatchObject({
      metaTitle: "Current title",
      metaDescription: "Current description",
    });

    const legacyVersionId = crypto.randomUUID();
    await kit.database.client.execute({
      sql: `INSERT INTO "articles_versions" (id, _parentId, _version, _status, _snapshot, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        legacyVersionId,
        article.id as string,
        99,
        "draft",
        JSON.stringify({
          id: article.id,
          title: "Legacy snapshot",
          seo_metaTitle: "Legacy title",
          seo_metaDescription: "Legacy description",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _status: "draft",
          _version: 99,
        }),
        new Date().toISOString(),
      ],
    });

    const restoredLegacy = await restoreVersion(
      ctx(Articles),
      article.id as string,
      legacyVersionId,
    );
    expect(restoredLegacy.seo).toEqual({
      metaTitle: "Legacy title",
      metaDescription: "Legacy description",
    });
  });

  it("merges partial global updates and restores both new and legacy snapshot shapes", async () => {
    const req = adminReq();

    const first = await updateGlobalDocument(kit, SiteSettings, req, {
      seo: {
        title: "Site title",
        description: "Site description",
      },
    });
    expect(first.seo).toEqual({
      title: "Site title",
      description: "Site description",
    });

    const second = await updateGlobalDocument(kit, SiteSettings, req, {
      seo: {
        title: "Updated site title",
      },
    });
    expect(second.seo).toEqual({
      title: "Updated site title",
      description: "Site description",
    });

    const current = await readGlobalDocument(kit, SiteSettings, req);
    expect(current.seo).toEqual({
      title: "Updated site title",
      description: "Site description",
    });

    const versions = await findGlobalVersions(kit, SiteSettings, req, {
      limit: 10,
    });
    const oldestVersionId =
      versions[versions.length - 1]?.id ?? versions[0]?.id;
    const restoredNested = await restoreGlobalVersion(
      kit,
      SiteSettings,
      req,
      oldestVersionId,
    );
    expect(restoredNested.seo).toEqual({
      title: "Site title",
      description: "Site description",
    });

    const legacyVersionId = crypto.randomUUID();
    await kit.database.client.execute({
      sql: `INSERT INTO "__runelayer_global_versions" (id, _globalSlug, _version, _status, _snapshot, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        legacyVersionId,
        SiteSettings.slug,
        99,
        "draft",
        JSON.stringify({
          id: SiteSettings.slug,
          seo_title: "Legacy global title",
          seo_description: "Legacy global description",
          updatedAt: new Date().toISOString(),
          _status: "draft",
          _version: 99,
        }),
        new Date().toISOString(),
      ],
    });

    const restoredLegacy = await restoreGlobalVersion(
      kit,
      SiteSettings,
      req,
      legacyVersionId,
    );
    expect(restoredLegacy.seo).toEqual({
      title: "Legacy global title",
      description: "Legacy global description",
    });
  });
});
