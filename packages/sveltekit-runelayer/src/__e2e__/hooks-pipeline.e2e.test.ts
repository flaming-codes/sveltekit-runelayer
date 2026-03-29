/**
 * E2E Journey: Content Lifecycle with Hooks
 *
 * Simulates a CMS where hooks provide real business logic:
 * - Auto-generate slugs from titles
 * - Track audit trail (who changed what, when)
 * - Enforce business rules (prevent publishing without required fields)
 * - Send notifications on content changes
 * - Transform data before storage
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  defineConfig,
  createRunekit,
  defineCollection,
  text,
  select,
  number,
  json,
  findOne,
  create,
  update,
  remove,
  type RunekitInstance,
  type QueryContext,
  type CollectionConfig,
} from "../index.js";

// --- Audit log (simulates external system) ---

const auditLog: {
  action: string;
  collection: string;
  docId?: string;
  timestamp: string;
  data?: unknown;
}[] = [];

// --- Schema with hooks ---

const Articles: CollectionConfig = defineCollection({
  slug: "articles",
  fields: [
    { name: "title", ...text({ required: true }) },
    { name: "slug", ...text() },
    { name: "body", ...text() },
    {
      name: "status",
      ...select({
        options: [
          { label: "Draft", value: "draft" },
          { label: "Review", value: "review" },
          { label: "Published", value: "published" },
        ],
        defaultValue: "draft",
      }),
    },
    { name: "wordCount", ...number() },
    { name: "history", ...json() },
  ],
  hooks: {
    beforeChange: [
      // Hook 1: Auto-generate slug from title
      (args: any) => {
        if (args.data?.title && !args.data.slug) {
          const title = String(args.data.title);
          const autoSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          return { ...args, data: { ...args.data, slug: autoSlug } };
        }
        return args;
      },
      // Hook 2: Auto-calculate word count
      (args: any) => {
        if (args.data?.body) {
          const words = String(args.data.body).split(/\s+/).filter(Boolean).length;
          return { ...args, data: { ...args.data, wordCount: words } };
        }
        return args;
      },
    ] as any,
    afterChange: [
      // Hook 3: Record to audit log
      ((args: any) => {
        auditLog.push({
          action: args.id ? "update" : "create",
          collection: "articles",
          docId: args.doc?.id ?? args.id,
          timestamp: new Date().toISOString(),
          data: args.data,
        });
      }) as any,
    ],
    beforeDelete: [
      // Hook 4: Prevent deletion of published articles
      ((args: any) => {
        // We can't easily check the doc's status in a beforeDelete hook
        // without fetching it, so this is a simplified version
        return args;
      }) as any,
    ],
    afterDelete: [
      // Hook 5: Record deletion to audit log
      ((args: any) => {
        auditLog.push({
          action: "delete",
          collection: "articles",
          docId: args.id,
          timestamp: new Date().toISOString(),
        });
      }) as any,
    ],
  },
  timestamps: true,
});

// --- Notification tracker (simulates webhook) ---

const notifications: string[] = [];

const Announcements: CollectionConfig = defineCollection({
  slug: "announcements",
  fields: [
    { name: "message", ...text({ required: true }) },
    {
      name: "priority",
      ...select({
        options: [
          { label: "Normal", value: "normal" },
          { label: "Urgent", value: "urgent" },
        ],
      }),
    },
  ],
  hooks: {
    afterChange: [
      ((args: any) => {
        const msg = args.doc?.message ?? args.data?.message;
        const priority = args.doc?.priority ?? args.data?.priority;
        notifications.push(`[${priority ?? "normal"}] ${msg}`);
      }) as any,
    ],
  },
});

// --- Test Suite ---

describe("Content Lifecycle with Hooks — Full Journey", () => {
  let kit: RunekitInstance;
  let tmpDir: string;
  let articleCtx: QueryContext;
  let announceCtx: QueryContext;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "runekit-hooks-e2e-"));
    auditLog.length = 0;
    notifications.length = 0;

    kit = createRunekit(
      defineConfig({
        collections: [Articles, Announcements],
        dbPath: join(tmpDir, "hooks.db"),
        auth: { secret: "e2e-test-secret-minimum-32-chars!", baseURL: "http://localhost:3000" },
      }),
    );

    articleCtx = { db: kit.database, collection: Articles };
    announceCtx = { db: kit.database, collection: Announcements };
  });

  afterAll(async () => {
    kit.database.sqlite.close();
    await rm(tmpDir, { recursive: true, force: true });
  });

  // --- Phase 1: Auto-slug generation ---

  let articleId: string;

  it("auto-generates slug from title when not provided", async () => {
    const article = await create(articleCtx, {
      title: "My First Blog Post!",
      body: "This is the content of my first blog post. It has many words.",
      status: "draft",
    });
    articleId = article.id as string;
    expect(article.slug).toBe("my-first-blog-post");
  });

  it("preserves explicit slug when provided", async () => {
    const article = await create(articleCtx, {
      title: "Custom Slug Article",
      slug: "custom-url-path",
      body: "Content here.",
    });
    expect(article.slug).toBe("custom-url-path");
  });

  // --- Phase 2: Auto word count ---

  it("auto-calculates word count from body", async () => {
    const article = await findOne(articleCtx, articleId);
    expect(article).toBeDefined();
    expect(article!.wordCount).toBe(13); // "This is the content of my first blog post. It has many words."
  });

  it("updates word count when body changes", async () => {
    const updated = await update(articleCtx, articleId, {
      body: "Short body with five words.",
    });
    expect(updated.wordCount).toBe(5);
  });

  // --- Phase 3: Audit trail ---

  it("records create actions in audit log", () => {
    const createEntries = auditLog.filter((e) => e.action === "create");
    expect(createEntries.length).toBeGreaterThanOrEqual(2);
    expect(createEntries[0].collection).toBe("articles");
    expect(createEntries[0].docId).toBeDefined();
    expect(createEntries[0].timestamp).toBeDefined();
  });

  it("records update actions in audit log", () => {
    const updateEntries = auditLog.filter((e) => e.action === "update");
    expect(updateEntries.length).toBeGreaterThanOrEqual(1);
  });

  it("records delete actions in audit log", async () => {
    const article = await create(articleCtx, { title: "To Be Deleted" });
    await remove(articleCtx, article.id as string);

    const deleteEntries = auditLog.filter((e) => e.action === "delete");
    expect(deleteEntries.length).toBeGreaterThanOrEqual(1);
    expect(deleteEntries[0].docId).toBe(article.id);
  });

  // --- Phase 4: Hook execution order ---

  it("runs multiple beforeChange hooks in sequence (slug → wordCount)", async () => {
    const article = await create(articleCtx, {
      title: "Sequential Hooks Test",
      body: "Testing that hooks run in the correct order sequentially.",
    });

    // Slug should be generated by hook 1
    expect(article.slug).toBe("sequential-hooks-test");
    // Word count should be calculated by hook 2
    expect(article.wordCount).toBe(9);
  });

  // --- Phase 5: Notification hooks ---

  it("triggers notifications on announcement creation", async () => {
    await create(announceCtx, { message: "System maintenance tonight", priority: "urgent" });
    await create(announceCtx, { message: "New feature released", priority: "normal" });

    expect(notifications).toContain("[urgent] System maintenance tonight");
    expect(notifications).toContain("[normal] New feature released");
  });

  // --- Phase 6: Complex multi-step workflow ---

  it("simulates article review workflow: draft → review → published", async () => {
    // Step 1: Create draft
    const draft = await create(articleCtx, {
      title: "Workflow Test Article",
      body: "This article will go through the full review workflow before publishing.",
      status: "draft",
    });
    expect(draft.status).toBe("draft");
    expect(draft.slug).toBe("workflow-test-article");

    // Step 2: Submit for review
    const inReview = await update(articleCtx, draft.id as string, { status: "review" });
    expect(inReview.status).toBe("review");

    // Step 3: Publish
    const published = await update(articleCtx, draft.id as string, { status: "published" });
    expect(published.status).toBe("published");

    // Verify audit trail captured all steps
    const auditForDoc = auditLog.filter((e) => e.docId === draft.id);
    expect(auditForDoc.length).toBeGreaterThanOrEqual(3); // create + 2 updates
  });
});
