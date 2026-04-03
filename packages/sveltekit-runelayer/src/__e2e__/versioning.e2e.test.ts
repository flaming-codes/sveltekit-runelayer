/**
 * E2E Journey: Collection Versioning Operations
 *
 * Tests the full lifecycle of the versioning system for collections:
 * - Status transitions: create → publish → unpublish → saveDraft
 * - Draft/published visibility in find()
 * - Version history retrieval (findVersionHistory)
 * - Version restore (restoreVersion)
 * - Access control enforcement on publish/saveDraft when no request is supplied
 *
 * Uses a temporary file-based libsql DB so tests are isolated and deterministic.
 * No Docker required.
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
  isAdmin,
  find,
  findOne,
  create,
  update,
  remove,
  publish,
  unpublish,
  saveDraft,
  findVersionHistory,
  restoreVersion,
  type RunelayerInstance,
  type QueryContext,
  type CollectionConfig,
} from "../index.js";
import { migrateDatabaseForTests } from "../__testutils__/migrations.js";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const Articles: CollectionConfig = defineCollection({
  slug: "articles",
  labels: { singular: "Article", plural: "Articles" },
  fields: [
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "body", label: "Body", ...text() },
  ],
  versions: { drafts: true, maxPerDoc: 5 },
});

// A collection where publish and update both require admin access
const ProtectedArticles: CollectionConfig = defineCollection({
  slug: "protected_articles",
  labels: { singular: "Protected Article", plural: "Protected Articles" },
  fields: [{ name: "title", label: "Title", ...text({ required: true }) }],
  access: {
    read: () => true,
    create: () => true,
    update: isAdmin(),
    publish: isAdmin(),
  },
  versions: { drafts: true, maxPerDoc: 5 },
});

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

function adminReq(): Request {
  const h = new Headers();
  h.set("x-user-id", "admin-1");
  h.set("x-user-role", "admin");
  return new Request("http://localhost", { headers: h });
}

function anonReq(): Request {
  return new Request("http://localhost");
}

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------

describe("Collection Versioning — E2E Journey", () => {
  let kit: RunelayerInstance;
  let tmpDir: string;
  let dbUrl: string;

  function ctx(collection: CollectionConfig, req?: Request): QueryContext {
    return { db: kit.database, collection, req };
  }

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "runelayer-versioning-e2e-"));
    dbUrl = `file:${join(tmpDir, "versioning.db")}`;
    await migrateDatabaseForTests(dbUrl, [Articles, ProtectedArticles]);

    kit = createRunelayer(
      defineConfig({
        collections: [Articles, ProtectedArticles],
        database: { url: dbUrl },
        auth: {
          secret: "e2e-versioning-secret-minimum-32-chars!",
          baseURL: "http://localhost:3000",
        },
      }),
    );
  });

  afterAll(async () => {
    kit.database.client.close();
    await rm(tmpDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // Status transitions
  // -------------------------------------------------------------------------

  describe("Status transitions", () => {
    let articleId: string;

    it("create() sets _status to 'draft' and _version to 1", async () => {
      const doc = await create(ctx(Articles), {
        title: "Hello World",
        body: "Initial content.",
      });
      articleId = doc.id as string;

      expect(doc._status).toBe("draft");
      expect(doc._version).toBe(1);
    });

    it("publish() sets _status to 'published' and increments _version to 2", async () => {
      const doc = await publish(ctx(Articles), articleId);

      expect(doc._status).toBe("published");
      expect(doc._version).toBe(2);
    });

    it("publish() creates a version snapshot with status 'published'", async () => {
      const history = await findVersionHistory(ctx(Articles), articleId);
      const publishedSnap = history.find((v) => v._status === "published");
      expect(publishedSnap).toBeDefined();
    });

    it("unpublish() sets _status back to 'draft' and increments _version to 3", async () => {
      const doc = await unpublish(ctx(Articles), articleId);

      expect(doc._status).toBe("draft");
      expect(doc._version).toBe(3);
    });

    it("saveDraft() on a document updates content, keeps _status 'draft', increments _version", async () => {
      const before = await findVersionHistory(ctx(Articles), articleId);
      const versionBefore = (before[0] as Record<string, unknown>)._version as number;

      const doc = await saveDraft(ctx(Articles), articleId, { body: "Updated draft body." });

      expect(doc._status).toBe("draft");
      expect(doc._version as number).toBe(versionBefore + 1);
      expect(doc.body).toBe("Updated draft body.");
    });
  });

  // -------------------------------------------------------------------------
  // find() draft / published visibility
  // -------------------------------------------------------------------------

  describe("find() draft/published filtering", () => {
    let draftId: string;
    let publishedId: string;

    beforeAll(async () => {
      // Create a draft article (never publish it)
      const d = await create(ctx(Articles), { title: "Draft Article" });
      draftId = d.id as string;

      // Create and publish an article
      const p = await create(ctx(Articles), { title: "Published Article" });
      publishedId = p.id as string;
      await publish(ctx(Articles), publishedId);
    });

    it("find() without draft:true returns only published documents", async () => {
      const results = await find(ctx(Articles));
      const ids = results.map((r) => (r as Record<string, unknown>).id);
      expect(ids).toContain(publishedId);
      expect(ids).not.toContain(draftId);
    });

    it("find({ draft: true }) returns all documents including drafts", async () => {
      const results = await find(ctx(Articles), { draft: true });
      const ids = results.map((r) => (r as Record<string, unknown>).id);
      expect(ids).toContain(publishedId);
      expect(ids).toContain(draftId);
    });
  });

  // -------------------------------------------------------------------------
  // findVersionHistory
  // -------------------------------------------------------------------------

  describe("findVersionHistory", () => {
    let histId: string;

    beforeAll(async () => {
      const doc = await create(ctx(Articles), { title: "History Test" });
      histId = doc.id as string;
      // create → v1 draft, publish → v2 published, unpublish → v3 draft
      await publish(ctx(Articles), histId);
      await unpublish(ctx(Articles), histId);
    });

    it("returns version list in descending order (newest first)", async () => {
      const history = await findVersionHistory(ctx(Articles), histId);
      expect(history.length).toBeGreaterThanOrEqual(3);
      // Descending: each subsequent version number is <= the previous
      for (let i = 1; i < history.length; i++) {
        expect(history[i]._version).toBeLessThanOrEqual(history[i - 1]._version);
      }
    });

    it("each history entry has id, _version, _status, and createdAt", async () => {
      const history = await findVersionHistory(ctx(Articles), histId);
      for (const entry of history) {
        expect(entry.id).toBeTypeOf("string");
        expect(entry.id.length).toBeGreaterThan(0);
        expect(entry._version).toBeTypeOf("number");
        expect(["draft", "published"]).toContain(entry._status);
        expect(entry.createdAt).toBeTypeOf("string");
      }
    });

    it("history reflects the correct status at each snapshot", async () => {
      const history = await findVersionHistory(ctx(Articles), histId);
      // Newest first: v3=draft, v2=published, v1=draft
      const statuses = history.map((v) => v._status);
      expect(statuses[0]).toBe("draft"); // unpublish → draft
      expect(statuses[1]).toBe("published"); // publish → published
      expect(statuses[2]).toBe("draft"); // create → draft
    });

    it("findVersionHistory with read:isAdmin and no request throws 403", async () => {
      // Build a collection with admin-gated read to trigger the deny-by-default path
      const AdminOnly: CollectionConfig = defineCollection({
        slug: "admin_only",
        fields: [{ name: "title", ...text({ required: true }) }],
        access: { read: isAdmin() },
        versions: { drafts: true },
      });
      // Don't run against the real DB — just test the access check throws
      const fakeCtx: QueryContext = {
        db: kit.database,
        collection: AdminOnly,
        req: undefined,
      };
      await expect(findVersionHistory(fakeCtx, "any-id")).rejects.toMatchObject({ status: 403 });
    });
  });

  // -------------------------------------------------------------------------
  // restoreVersion
  // -------------------------------------------------------------------------

  describe("restoreVersion", () => {
    let docId: string;
    let v1SnapshotId: string;

    beforeAll(async () => {
      const doc = await create(ctx(Articles), { title: "Original Title", body: "Original body." });
      docId = doc.id as string;

      // Record v1 snapshot id before any further mutations
      const historyAfterCreate = await findVersionHistory(ctx(Articles), docId);
      v1SnapshotId = historyAfterCreate[0].id; // newest = v1 (only one at this point)

      // Publish → v2, then saveDraft with different content → v3
      await publish(ctx(Articles), docId);
      await saveDraft(ctx(Articles), docId, { title: "Modified Title", body: "Modified body." });
    });

    it("restoreVersion() reverts content to snapshot, sets _status to 'draft', increments _version", async () => {
      const historyBefore = await findVersionHistory(ctx(Articles), docId);
      const versionBefore = historyBefore[0]._version;

      const restored = await restoreVersion(ctx(Articles), docId, v1SnapshotId);

      expect(restored._status).toBe("draft");
      expect(restored._version as number).toBe(versionBefore + 1);
      expect(restored.title).toBe("Original Title");
      expect(restored.body).toBe("Original body.");
    });

    it("restoreVersion() creates a new version snapshot after restore", async () => {
      // Create another article and restore — ensures snapshot count increases
      const doc2 = await create(ctx(Articles), { title: "Doc2", body: "b" });
      const h2 = await findVersionHistory(ctx(Articles), doc2.id as string);
      await restoreVersion(ctx(Articles), doc2.id as string, h2[0].id);

      const historyAfter = await findVersionHistory(ctx(Articles), doc2.id as string);
      expect(historyAfter.length).toBe(h2.length + 1);
    });

    it("restoreVersion() with a nonexistent version ID throws 404", async () => {
      await expect(
        restoreVersion(ctx(Articles), docId, "nonexistent-version-id"),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("restoreVersion() with a version ID from a different document throws 400", async () => {
      // Create a second document and get its version ID
      const otherDoc = await create(ctx(Articles), { title: "Other Doc" });
      const otherHistory = await findVersionHistory(ctx(Articles), otherDoc.id as string);
      const otherVersionId = otherHistory[0].id;

      // Attempt to restore other doc's version onto docId — must be rejected
      await expect(restoreVersion(ctx(Articles), docId, otherVersionId)).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  // -------------------------------------------------------------------------
  // Access control enforcement
  // -------------------------------------------------------------------------

  describe("Access control on versioning operations", () => {
    let protectedDocId: string;

    beforeAll(async () => {
      // Create the protected article as admin
      const doc = await create(ctx(ProtectedArticles, adminReq()), { title: "Protected Doc" });
      protectedDocId = doc.id as string;
    });

    it("publish() without a Request when access.publish is defined throws 403", async () => {
      await expect(publish(ctx(ProtectedArticles), protectedDocId)).rejects.toMatchObject({
        status: 403,
      });
    });

    it("publish() with a non-admin request when access.publish is defined throws 403", async () => {
      await expect(
        publish(ctx(ProtectedArticles, anonReq()), protectedDocId),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("publish() with admin request succeeds", async () => {
      const doc = await publish(ctx(ProtectedArticles, adminReq()), protectedDocId);
      expect(doc._status).toBe("published");
    });

    it("saveDraft() without a Request when access.update is defined throws 403", async () => {
      await expect(
        saveDraft(ctx(ProtectedArticles), protectedDocId, { title: "Attempted Draft" }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("saveDraft() with a non-admin request when access.update requires admin throws 403", async () => {
      await expect(
        saveDraft(ctx(ProtectedArticles, anonReq()), protectedDocId, { title: "Attempted" }),
      ).rejects.toMatchObject({ status: 403 });
    });

    it("saveDraft() with admin request succeeds", async () => {
      const doc = await saveDraft(ctx(ProtectedArticles, adminReq()), protectedDocId, {
        title: "Admin Draft Update",
      });
      expect(doc._status).toBe("draft");
      expect(doc.title).toBe("Admin Draft Update");
    });
  });

  // -------------------------------------------------------------------------
  // update() on versioned collections
  // -------------------------------------------------------------------------

  describe("update() creates version snapshots", () => {
    let docId: string;

    beforeAll(async () => {
      const doc = await create(ctx(Articles), { title: "Update Test", body: "Initial." });
      docId = doc.id as string;
    });

    it("update() increments _version", async () => {
      const before = await findOne(ctx(Articles), docId);
      const versionBefore = (before as Record<string, unknown>)._version as number;

      const updated = await update(ctx(Articles), docId, { body: "Updated via update()." });

      expect(updated._version as number).toBe(versionBefore + 1);
    });

    it("update() preserves the current _status", async () => {
      // Doc was created as draft and never published — status should remain 'draft'
      const updated = await update(ctx(Articles), docId, { body: "Another update." });
      expect(updated._status).toBe("draft");

      // Now publish, then update — status should remain 'published'
      await publish(ctx(Articles), docId);
      const updatedAfterPublish = await update(ctx(Articles), docId, {
        body: "Update while published.",
      });
      expect(updatedAfterPublish._status).toBe("published");
    });

    it("update() creates a version snapshot in history", async () => {
      const historyBefore = await findVersionHistory(ctx(Articles), docId);
      const countBefore = historyBefore.length;

      await update(ctx(Articles), docId, { body: "Snapshot check." });

      const historyAfter = await findVersionHistory(ctx(Articles), docId);
      expect(historyAfter.length).toBe(countBefore + 1);
    });

    it("update() snapshot captures the correct status at time of write", async () => {
      // Doc is currently published from the test above
      await update(ctx(Articles), docId, { body: "Published snapshot." });

      const history = await findVersionHistory(ctx(Articles), docId);
      // Newest snapshot should reflect the 'published' status
      expect(history[0]._status).toBe("published");
    });
  });

  // -------------------------------------------------------------------------
  // remove() cascade-deletes version snapshots
  // -------------------------------------------------------------------------

  describe("remove() cascade-deletes versions", () => {
    it("deleting a versioned document removes all its version snapshots", async () => {
      // Create a document and build up version history
      const doc = await create(ctx(Articles), { title: "Doomed Doc", body: "Will be deleted." });
      const docId = doc.id as string;
      await publish(ctx(Articles), docId);
      await saveDraft(ctx(Articles), docId, { body: "Draft update." });

      // Verify versions exist before removal
      const historyBefore = await findVersionHistory(ctx(Articles), docId);
      expect(historyBefore.length).toBeGreaterThanOrEqual(3);

      // Remove the document
      await remove(ctx(Articles), docId);

      // The document itself should be gone
      const found = await findOne(ctx(Articles), docId);
      expect(found).toBeUndefined();

      // All version snapshots should be gone too (no orphans)
      const historyAfter = await findVersionHistory(ctx(Articles), docId);
      expect(historyAfter).toHaveLength(0);
    });

    it("deleting one document does not affect another document's versions", async () => {
      const keepDoc = await create(ctx(Articles), { title: "Keeper" });
      const deleteDoc = await create(ctx(Articles), { title: "Deleter" });
      await publish(ctx(Articles), keepDoc.id as string);
      await publish(ctx(Articles), deleteDoc.id as string);

      const keepHistoryBefore = await findVersionHistory(ctx(Articles), keepDoc.id as string);

      await remove(ctx(Articles), deleteDoc.id as string);

      const keepHistoryAfter = await findVersionHistory(ctx(Articles), keepDoc.id as string);
      expect(keepHistoryAfter.length).toBe(keepHistoryBefore.length);
    });
  });
});
