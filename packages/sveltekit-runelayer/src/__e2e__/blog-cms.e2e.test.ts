/**
 * E2E Journey: Blog CMS Platform
 *
 * Simulates a real-world blog CMS setup from scratch:
 * - Define a full blog schema (posts, authors, categories)
 * - Initialize the CMS with database, storage, and hooks
 * - Create content across multiple related collections
 * - Query content with pagination and sorting
 * - Update and delete content
 * - Verify cross-collection relationships work
 * - Test the full lifecycle from schema definition to content delivery
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  defineConfig,
  createRunelayer,
  defineCollection,
  text,
  textarea,
  number,
  select,
  checkbox,
  date,
  relationship,
  email,
  slug,
  richText,
  json,
  find,
  findOne,
  create,
  update,
  remove,
  type RunelayerInstance,
  type QueryContext,
  type CollectionConfig,
} from "../index.js";
import { migrateDatabaseForTests } from "../__testutils__/migrations.js";

// --- Schema Definition (as a real user would define it) ---

const Authors: CollectionConfig = defineCollection({
  slug: "authors",
  labels: { singular: "Author", plural: "Authors" },
  fields: [
    { name: "name", label: "Full Name", ...text({ required: true }) },
    { name: "email", label: "Email", ...email({ required: true }) },
    { name: "bio", label: "Biography", ...textarea() },
    {
      name: "role",
      label: "Role",
      ...select({
        options: [
          { label: "Staff Writer", value: "staff" },
          { label: "Guest", value: "guest" },
          { label: "Editor", value: "editor" },
        ],
        defaultValue: "staff",
      }),
    },
    { name: "active", label: "Active", ...checkbox({ defaultValue: true }) },
  ],
  admin: { useAsTitle: "name", defaultColumns: ["name", "email", "role"] },
  timestamps: true,
});

const Categories: CollectionConfig = defineCollection({
  slug: "categories",
  labels: { singular: "Category", plural: "Categories" },
  fields: [
    { name: "name", label: "Name", ...text({ required: true }) },
    { name: "slug", label: "Slug", ...slug({ from: "name" }) },
    { name: "description", label: "Description", ...textarea() },
    { name: "color", label: "Color", ...text() },
  ],
  admin: { useAsTitle: "name" },
});

const Posts: CollectionConfig = defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", label: "Title", ...text({ required: true, maxLength: 200 }) },
    { name: "slug", label: "Slug", ...slug({ from: "title" }) },
    { name: "content", label: "Content", ...richText() },
    { name: "excerpt", label: "Excerpt", ...textarea({ maxLength: 500 }) },
    { name: "author", label: "Author", ...relationship({ relationTo: "authors" }) },
    { name: "category", label: "Category", ...relationship({ relationTo: "categories" }) },
    {
      name: "status",
      label: "Status",
      ...select({
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
          { label: "Archived", value: "archived" },
        ],
        defaultValue: "draft",
      }),
    },
    { name: "publishedAt", label: "Published At", ...date({ includeTime: true }) },
    { name: "featured", label: "Featured", ...checkbox() },
    { name: "readTime", label: "Read Time (min)", ...number({ min: 1 }) },
    { name: "metadata", label: "SEO Metadata", ...json() },
  ],
  admin: { useAsTitle: "title", defaultColumns: ["title", "status", "author"] },
  timestamps: true,
  versions: { drafts: true },
});

// --- Test Suite ---

describe("Blog CMS Platform — Full User Journey", () => {
  let kit: RunelayerInstance;
  let tmpDir: string;
  let dbUrl: string;
  let authorCtx: QueryContext;
  let categoryCtx: QueryContext;
  let postCtx: QueryContext;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "runelayer-blog-e2e-"));
    dbUrl = `file:${join(tmpDir, "blog.db")}`;
    await migrateDatabaseForTests(dbUrl, [Authors, Categories, Posts]);

    kit = createRunelayer(
      defineConfig({
        collections: [Authors, Categories, Posts],
        database: { url: dbUrl },
        auth: { secret: "e2e-test-secret-minimum-32-chars!", baseURL: "http://localhost:3000" },
        storage: { directory: join(tmpDir, "uploads") },
      }),
    );

    authorCtx = { db: kit.database, collection: Authors };
    categoryCtx = { db: kit.database, collection: Categories };
    postCtx = { db: kit.database, collection: Posts };
  });

  afterAll(async () => {
    kit.database.client.close();
    await rm(tmpDir, { recursive: true, force: true });
  });

  // --- Phase 1: Verify CMS initialized correctly ---

  it("initializes with all three collections", () => {
    expect(kit.collections).toHaveLength(3);
    expect(kit.collections.map((c) => c.slug)).toEqual(["authors", "categories", "posts"]);
  });

  it("created database tables for all collections", async () => {
    const tables = await kit.database.client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const names = tables.rows.map((row) => String((row as Record<string, unknown>).name));
    expect(names).toContain("authors");
    expect(names).toContain("categories");
    expect(names).toContain("posts");
  });

  it("posts table has version columns due to versions config", async () => {
    const cols = await kit.database.client.execute("PRAGMA table_info('posts')");
    const colNames = cols.rows.map((row) => String((row as Record<string, unknown>).name));
    expect(colNames).toContain("_status");
    expect(colNames).toContain("_version");
  });

  // --- Phase 2: Create content across collections ---

  let authorAlice: Record<string, unknown>;
  let authorBob: Record<string, unknown>;
  let catTech: Record<string, unknown>;
  let catDesign: Record<string, unknown>;

  it("creates authors", async () => {
    authorAlice = await create(authorCtx, {
      name: "Alice Johnson",
      email: "alice@blog.com",
      bio: "Senior tech writer covering web development.",
      role: "editor",
      active: true,
    });
    authorBob = await create(authorCtx, {
      name: "Bob Smith",
      email: "bob@blog.com",
      bio: "Guest contributor and designer.",
      role: "guest",
      active: true,
    });

    expect(authorAlice.id).toBeDefined();
    expect(authorAlice.name).toBe("Alice Johnson");
    expect(authorAlice.email).toBe("alice@blog.com");
    expect(authorAlice.createdAt).toBeDefined();

    expect(authorBob.id).toBeDefined();
    expect(authorBob.role).toBe("guest");
  });

  it("creates categories", async () => {
    catTech = await create(categoryCtx, {
      name: "Technology",
      slug: "technology",
      description: "Tech articles and tutorials",
      color: "#3B82F6",
    });
    catDesign = await create(categoryCtx, {
      name: "Design",
      slug: "design",
      description: "UI/UX and visual design",
      color: "#EC4899",
    });

    expect(catTech.slug).toBe("technology");
    expect(catDesign.color).toBe("#EC4899");
  });

  let postSvelte: Record<string, unknown>;
  let _postReact: Record<string, unknown>;
  let _postTailwind: Record<string, unknown>;
  let postFigma: Record<string, unknown>;
  let postRust: Record<string, unknown>;

  it("creates posts with relationships to authors and categories", async () => {
    postSvelte = await create(postCtx, {
      title: "Getting Started with Svelte 5",
      slug: "getting-started-svelte-5",
      excerpt: "A comprehensive guide to Svelte 5 runes.",
      author: authorAlice.id,
      category: catTech.id,
      status: "published",
      publishedAt: "2026-03-01T10:00:00Z",
      featured: true,
      readTime: 12,
      metadata: JSON.stringify({ keywords: ["svelte", "runes", "web"] }),
    });

    _postReact = await create(postCtx, {
      title: "React vs Svelte in 2026",
      slug: "react-vs-svelte-2026",
      excerpt: "A detailed comparison of the two frameworks.",
      author: authorAlice.id,
      category: catTech.id,
      status: "published",
      publishedAt: "2026-03-15T14:30:00Z",
      featured: false,
      readTime: 8,
    });

    _postTailwind = await create(postCtx, {
      title: "Tailwind CSS v4 Deep Dive",
      slug: "tailwind-v4-deep-dive",
      excerpt: "Everything new in Tailwind CSS v4.",
      author: authorBob.id,
      category: catDesign.id,
      status: "published",
      publishedAt: "2026-03-20T09:00:00Z",
      featured: true,
      readTime: 15,
    });

    postFigma = await create(postCtx, {
      title: "Figma to Code Workflows",
      slug: "figma-to-code",
      author: authorBob.id,
      category: catDesign.id,
      status: "draft",
      readTime: 6,
    });

    postRust = await create(postCtx, {
      title: "Why Rust for Web Tooling",
      slug: "rust-for-web-tooling",
      author: authorAlice.id,
      category: catTech.id,
      status: "draft",
    });

    expect(postSvelte.title).toBe("Getting Started with Svelte 5");
    expect(postSvelte.author).toBe(authorAlice.id);
    expect(postSvelte.category).toBe(catTech.id);
    expect(postSvelte.featured).toBe(true);
    expect(postFigma.status).toBe("draft");
  });

  // --- Phase 3: Query content ---

  it("finds all posts (5 total)", async () => {
    const allPosts = await find(postCtx);
    expect(allPosts).toHaveLength(5);
  });

  it("finds posts with pagination", async () => {
    const page1 = await find(postCtx, { limit: 2 });
    expect(page1).toHaveLength(2);

    const page2 = await find(postCtx, { limit: 2, offset: 2 });
    expect(page2).toHaveLength(2);

    const page3 = await find(postCtx, { limit: 2, offset: 4 });
    expect(page3).toHaveLength(1);
  });

  it("finds posts sorted by title", async () => {
    const sorted = await find(postCtx, { sort: "title", sortOrder: "asc" });
    const titles = sorted.map((p: any) => p.title);
    expect(titles[0]).toBe("Figma to Code Workflows");
    expect(titles[4]).toBe("Why Rust for Web Tooling");
  });

  it("finds a single post by ID", async () => {
    const found = await findOne(postCtx, postSvelte.id as string);
    expect(found).toBeDefined();
    expect(found!.title).toBe("Getting Started with Svelte 5");
    expect(found!.author).toBe(authorAlice.id);
  });

  it("finds all authors (2 total)", async () => {
    const authors = await find(authorCtx);
    expect(authors).toHaveLength(2);
  });

  // --- Phase 4: Update content ---

  it("updates a post status from draft to published", async () => {
    const updated = await update(postCtx, postFigma.id as string, {
      status: "published",
      publishedAt: "2026-03-25T11:00:00Z",
      excerpt: "Step by step guide to converting Figma designs to code.",
    });
    expect(updated.status).toBe("published");
    expect(updated.excerpt).toContain("Figma designs");
    expect(updated.updatedAt).not.toBe(postFigma.updatedAt);
  });

  it("updates an author bio", async () => {
    const updated = await update(authorCtx, authorAlice.id as string, {
      bio: "Lead tech writer and editor. 10+ years in web development.",
    });
    expect(updated.bio).toContain("Lead tech writer");
  });

  // --- Phase 5: Delete content ---

  it("deletes a draft post", async () => {
    const deleted = await remove(postCtx, postRust.id as string);
    expect(deleted!.id).toBe(postRust.id);

    const found = await findOne(postCtx, postRust.id as string);
    expect(found).toBeUndefined();
  });

  it("now has 4 posts after deletion", async () => {
    const allPosts = await find(postCtx);
    expect(allPosts).toHaveLength(4);
  });

  // --- Phase 6: Cross-collection relationship integrity ---

  it("posts reference valid author IDs", async () => {
    const posts = await find(postCtx);
    for (const post of posts) {
      const p = post as Record<string, unknown>;
      if (p.author) {
        const author = await findOne(authorCtx, p.author as string);
        expect(author).toBeDefined();
      }
    }
  });

  it("posts reference valid category IDs", async () => {
    const posts = await find(postCtx);
    for (const post of posts) {
      const p = post as Record<string, unknown>;
      if (p.category) {
        const cat = await findOne(categoryCtx, p.category as string);
        expect(cat).toBeDefined();
      }
    }
  });

  // --- Phase 7: Verify timestamps and metadata ---

  it("all documents have valid timestamps", async () => {
    const posts = await find(postCtx);
    for (const post of posts) {
      const p = post as Record<string, unknown>;
      expect(p.createdAt).toBeDefined();
      expect(p.updatedAt).toBeDefined();
      const created = new Date(p.createdAt as string);
      const updated = new Date(p.updatedAt as string);
      expect(created.getTime()).toBeGreaterThan(0);
      expect(updated.getTime()).toBeGreaterThanOrEqual(created.getTime());
    }
  });

  it("JSON metadata is stored and retrievable", async () => {
    const post = await findOne(postCtx, postSvelte.id as string);
    expect(post).toBeDefined();
    const meta =
      typeof post!.metadata === "string" ? JSON.parse(post!.metadata as string) : post!.metadata;
    expect(meta.keywords).toContain("svelte");
  });
});
