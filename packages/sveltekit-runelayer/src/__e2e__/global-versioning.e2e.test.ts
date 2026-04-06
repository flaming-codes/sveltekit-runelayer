/**
 * E2E Journey: Global Versioning Operations
 *
 * Tests the full lifecycle of the versioning system for globals:
 * - updateGlobalDocument() creates snapshots and increments _version
 * - forceDraft flag demotes a published global back to draft
 * - publishGlobal() and unpublishGlobal() transition _status correctly
 * - publishGlobal() when no row exists yet (never saved) creates the row
 * - findGlobalVersions() returns list in descending order
 * - restoreGlobalVersion() reverts content and increments _version
 * - restoreGlobalVersion() with a version from a different global throws 400
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
  defineGlobal,
  text,
  type RunelayerInstance,
  type GlobalConfig,
} from "../index.js";
import {
  updateGlobalDocument,
  publishGlobal,
  unpublishGlobal,
  findGlobalVersions,
  restoreGlobalVersion,
} from "../sveltekit/globals.js";
import { migrateDatabaseForTests } from "../__testutils__/migrations.js";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SiteSettings: GlobalConfig = defineGlobal({
  slug: "site-settings",
  label: "Site Settings",
  fields: [
    { name: "siteName", label: "Site Name", ...text({ required: true }) },
    { name: "tagline", label: "Tagline", ...text() },
  ],
  versions: { drafts: true, maxPerDoc: 5 },
});

const OtherGlobal: GlobalConfig = defineGlobal({
  slug: "other-global",
  label: "Other Global",
  fields: [{ name: "value", label: "Value", ...text() }],
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

// ---------------------------------------------------------------------------
// Suite setup
// ---------------------------------------------------------------------------

describe("Global Versioning — E2E Journey", () => {
  let kit: RunelayerInstance;
  let tmpDir: string;
  let dbUrl: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "runelayer-global-versioning-e2e-"));
    dbUrl = `file:${join(tmpDir, "global-versioning.db")}`;
    await migrateDatabaseForTests(dbUrl, [], [SiteSettings, OtherGlobal]);

    kit = createRunelayer(
      defineConfig({
        collections: [],
        globals: [SiteSettings, OtherGlobal],
        database: { url: dbUrl },
        auth: {
          secret: "e2e-global-versioning-secret-32-chars!",
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
  // updateGlobalDocument
  // -------------------------------------------------------------------------

  describe("updateGlobalDocument()", () => {
    it("creates a version snapshot on first update, _version=1, _status='draft'", async () => {
      const doc = await updateGlobalDocument(kit, SiteSettings, adminReq(), {
        siteName: "My Site",
        tagline: "Hello World",
      });

      expect(doc._status).toBe("draft");
      expect(doc._version).toBe(1);
      expect(doc.siteName).toBe("My Site");
    });

    it("increments _version on subsequent update", async () => {
      const doc = await updateGlobalDocument(kit, SiteSettings, adminReq(), {
        siteName: "My Updated Site",
      });

      expect(doc._version).toBe(2);
      expect(doc.siteName).toBe("My Updated Site");
    });

    it("a version snapshot is created for each update call", async () => {
      // After the two updates above, there should be at least 2 version snapshots
      const versions = await findGlobalVersions(kit, SiteSettings, adminReq());
      expect(versions.length).toBeGreaterThanOrEqual(2);
    });

    it("forceDraft:true on a published global demotes _status to 'draft'", async () => {
      // Publish first
      await publishGlobal(kit, SiteSettings, adminReq());

      // Now update with forceDraft — should go back to draft
      const doc = await updateGlobalDocument(
        kit,
        SiteSettings,
        adminReq(),
        { tagline: "Back to draft" },
        { forceDraft: true },
      );

      expect(doc._status).toBe("draft");
    });
  });

  // -------------------------------------------------------------------------
  // publishGlobal
  // -------------------------------------------------------------------------

  describe("publishGlobal()", () => {
    it("sets _status to 'published' and increments _version", async () => {
      const beforeVersions = await findGlobalVersions(kit, SiteSettings, adminReq());
      const versionBefore = beforeVersions[0]._version;

      const doc = await publishGlobal(kit, SiteSettings, adminReq());

      expect(doc._status).toBe("published");
      expect(doc._version as number).toBe(versionBefore + 1);
    });

    it("creates a version snapshot with status 'published'", async () => {
      const versions = await findGlobalVersions(kit, SiteSettings, adminReq());
      const publishedSnap = versions.find((v) => v._status === "published");
      expect(publishedSnap).toBeDefined();
    });

    it("publishing a global that has never been saved creates the row without crashing", async () => {
      // OtherGlobal has never been written — publishGlobal should create it as published
      const doc = await publishGlobal(kit, OtherGlobal, adminReq());
      expect(doc._status).toBe("published");
      expect(doc._version).toBeTypeOf("number");
    });
  });

  // -------------------------------------------------------------------------
  // unpublishGlobal
  // -------------------------------------------------------------------------

  describe("unpublishGlobal()", () => {
    it("sets _status to 'draft' and increments _version", async () => {
      // Ensure it is published first
      await publishGlobal(kit, SiteSettings, adminReq());
      const beforeVersions = await findGlobalVersions(kit, SiteSettings, adminReq());
      const versionBefore = beforeVersions[0]._version;

      const doc = await unpublishGlobal(kit, SiteSettings, adminReq());

      expect(doc._status).toBe("draft");
      expect(doc._version as number).toBe(versionBefore + 1);
    });

    it("creates a version snapshot with status 'draft'", async () => {
      const versions = await findGlobalVersions(kit, SiteSettings, adminReq());
      // The most recent snapshot should be 'draft' (from the unpublish above)
      expect(versions[0]._status).toBe("draft");
    });
  });

  // -------------------------------------------------------------------------
  // findGlobalVersions
  // -------------------------------------------------------------------------

  describe("findGlobalVersions()", () => {
    it("returns version list in descending order (newest first)", async () => {
      const versions = await findGlobalVersions(kit, SiteSettings, adminReq());
      expect(versions.length).toBeGreaterThanOrEqual(1);

      for (let i = 1; i < versions.length; i++) {
        // createdAt strings are ISO 8601 — lexicographic comparison is chronological
        expect(versions[i].createdAt <= versions[i - 1].createdAt).toBe(true);
      }
    });

    it("each entry has id, _version (number), _status, and createdAt", async () => {
      const versions = await findGlobalVersions(kit, SiteSettings, adminReq());
      for (const v of versions) {
        expect(v.id).toBeTypeOf("string");
        expect(v.id.length).toBeGreaterThan(0);
        expect(v._version).toBeTypeOf("number");
        expect(["draft", "published"]).toContain(v._status);
        expect(v.createdAt).toBeTypeOf("string");
      }
    });

    it("respects limit option", async () => {
      const limited = await findGlobalVersions(kit, SiteSettings, adminReq(), { limit: 2 });
      expect(limited.length).toBeLessThanOrEqual(2);
    });
  });

  // -------------------------------------------------------------------------
  // restoreGlobalVersion
  // -------------------------------------------------------------------------

  describe("restoreGlobalVersion()", () => {
    let initialVersionId: string;

    beforeAll(async () => {
      // Write the "initial" state and immediately capture the snapshot ID
      await updateGlobalDocument(kit, OtherGlobal, adminReq(), { value: "initial value" });
      const versionsAfterInitial = await findGlobalVersions(kit, OtherGlobal, adminReq());
      // Newest-first: the first entry is the snapshot we just created
      initialVersionId = versionsAfterInitial[0].id;

      // Now modify so that the document no longer holds "initial value"
      await updateGlobalDocument(kit, OtherGlobal, adminReq(), { value: "modified value" });
    });

    it("restores content to the snapshot and sets _status to 'draft'", async () => {
      const doc = await restoreGlobalVersion(kit, OtherGlobal, adminReq(), initialVersionId);

      expect(doc._status).toBe("draft");
      expect(doc.value).toBe("initial value");
    });

    it("increments _version after restore", async () => {
      const versionsBefore = await findGlobalVersions(kit, OtherGlobal, adminReq());
      const versionBefore = versionsBefore[0]._version;

      // Restore once more — should bump version again
      await restoreGlobalVersion(kit, OtherGlobal, adminReq(), initialVersionId);

      const versionsAfter = await findGlobalVersions(kit, OtherGlobal, adminReq());
      expect(versionsAfter[0]._version).toBe(versionBefore + 1);
    });

    it("creates a new version snapshot after restore", async () => {
      const versionsBefore = await findGlobalVersions(kit, OtherGlobal, adminReq());
      const countBefore = versionsBefore.length;

      await restoreGlobalVersion(kit, OtherGlobal, adminReq(), initialVersionId);

      const versionsAfter = await findGlobalVersions(kit, OtherGlobal, adminReq());
      expect(versionsAfter.length).toBe(countBefore + 1);
    });

    it("restoreGlobalVersion() with a nonexistent version ID throws 404", async () => {
      await expect(
        restoreGlobalVersion(kit, OtherGlobal, adminReq(), "nonexistent-version-id"),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("restoreGlobalVersion() with a version ID from a different global throws 400", async () => {
      // Get a version ID that belongs to SiteSettings
      const siteVersions = await findGlobalVersions(kit, SiteSettings, adminReq());
      const siteVersionId = siteVersions[0].id;

      // Try to restore it as if it belonged to OtherGlobal
      await expect(
        restoreGlobalVersion(kit, OtherGlobal, adminReq(), siteVersionId),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
