/**
 * E2E Journey: File Upload & Media Management
 *
 * Simulates a media library workflow:
 * - Upload various file types (images, PDFs, etc.)
 * - Reference uploaded files from document fields
 * - Serve uploaded files back via the serve handler
 * - Organize files in folders
 * - Delete files and verify cleanup
 * - Test security (path traversal protection)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createLocalStorage,
  createUploadHandler,
  createServeHandler,
  type StorageAdapter,
} from "../storage/index.js";

describe("File Upload & Media Management — Full Journey", () => {
  let storage: StorageAdapter;
  let tmpDir: string;
  let storageDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "runelayer-storage-e2e-"));
    storageDir = join(tmpDir, "uploads");

    storage = createLocalStorage({
      directory: storageDir,
      urlPrefix: "/media",
    });
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // --- Phase 1: Upload files ---

  let imageFile: { path: string; filename: string; url: string; size: number };
  let pdfFile: { path: string; filename: string; url: string; size: number };
  let textFile: { path: string; filename: string; url: string; size: number };

  it("uploads an image file", async () => {
    const content = Buffer.from("fake-png-content-for-testing");
    const result = await storage.upload(content, {
      filename: "hero-image.png",
      mimeType: "image/png",
    });

    imageFile = result;
    expect(result.filename).toBe("hero-image.png");
    expect(result.mimeType).toBe("image/png");
    expect(result.size).toBe(content.byteLength);
    expect(result.url).toMatch(/^\/media\//);
    expect(result.path).toMatch(/\.png$/);
  });

  it("uploads a PDF to a subfolder", async () => {
    const content = Buffer.from("%PDF-1.4 fake pdf content");
    const result = await storage.upload(content, {
      filename: "report-2026.pdf",
      mimeType: "application/pdf",
      folder: "documents",
    });

    pdfFile = result;
    expect(result.filename).toBe("report-2026.pdf");
    expect(result.path).toContain("documents/");
    expect(result.url).toMatch(/^\/media\/documents\//);
  });

  it("uploads a text file to a nested subfolder", async () => {
    const content = Buffer.from("Hello, world! This is a test file.");
    const result = await storage.upload(content, {
      filename: "readme.txt",
      mimeType: "text/plain",
      folder: "misc/text",
    });

    textFile = result;
    expect(result.path).toContain("misc/text/");
  });

  // --- Phase 2: Verify files exist on disk ---

  it("files are actually written to the filesystem", async () => {
    const rootFiles = await readdir(storageDir);
    expect(rootFiles.length).toBeGreaterThanOrEqual(1);

    const exists = await storage.exists(imageFile.path);
    expect(exists).toBe(true);

    const pdfExists = await storage.exists(pdfFile.path);
    expect(pdfExists).toBe(true);

    const textExists = await storage.exists(textFile.path);
    expect(textExists).toBe(true);
  });

  it("subfolder structure is created correctly", async () => {
    const docFiles = await readdir(join(storageDir, "documents"));
    expect(docFiles.length).toBeGreaterThanOrEqual(1);

    const textFiles = await readdir(join(storageDir, "misc", "text"));
    expect(textFiles.length).toBeGreaterThanOrEqual(1);
  });

  // --- Phase 3: Retrieve files ---

  it("getStream returns file content", async () => {
    const stream = storage.getStream(imageFile.path);
    expect(stream).not.toBeNull();

    // Read the stream
    const reader = stream!.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      if (result.value) chunks.push(result.value);
      done = result.done;
    }
    const content = Buffer.concat(chunks).toString();
    expect(content).toBe("fake-png-content-for-testing");
  });

  it("getStream returns null for non-existent files", () => {
    const stream = storage.getStream("nonexistent-file.jpg");
    expect(stream).toBeNull();
  });

  it("getUrl returns correct URLs", () => {
    expect(storage.getUrl(imageFile.path)).toMatch(/^\/media\//);
    expect(storage.getUrl(pdfFile.path)).toContain("/media/documents/");
  });

  // --- Phase 4: Serve handler ---

  it("serve handler returns file with correct content type", async () => {
    const serve = createServeHandler({ storage, urlPrefix: "/media" });

    const req = new Request(`http://localhost/media/${imageFile.path}`);
    const res = await serve({ request: req });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("serve handler returns PDF with correct content type", async () => {
    const serve = createServeHandler({ storage, urlPrefix: "/media" });

    const req = new Request(`http://localhost/media/${pdfFile.path}`);
    const res = await serve({ request: req });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("serve handler returns 404 for non-existent files", async () => {
    const serve = createServeHandler({ storage, urlPrefix: "/media" });
    const req = new Request("http://localhost/media/does-not-exist.jpg");
    const res = await serve({ request: req });
    expect(res.status).toBe(404);
  });

  it("serve handler blocks path traversal", async () => {
    const serve = createServeHandler({ storage, urlPrefix: "/media" });
    const req = new Request("http://localhost/media/../../../etc/passwd");
    const res = await serve({ request: req });
    expect(res.status).toBe(404);
  });

  // --- Phase 5: Upload handler ---

  it("upload handler accepts valid file uploads", async () => {
    const handler = createUploadHandler({
      storage,
      maxFileSize: 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg"],
    });

    const formData = new FormData();
    formData.append("file", new File(["image-bytes"], "test.png", { type: "image/png" }));

    const res = await handler({
      request: new Request("http://localhost/upload", { method: "POST", body: formData }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.filename).toBe("test.png");
    expect(body.url).toMatch(/^\/media\//);
  });

  it("upload handler rejects oversized files", async () => {
    const handler = createUploadHandler({
      storage,
      maxFileSize: 10, // 10 bytes
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File(["this is definitely more than 10 bytes of content"], "big.txt", {
        type: "text/plain",
      }),
    );

    const res = await handler({
      request: new Request("http://localhost/upload", { method: "POST", body: formData }),
    });
    expect(res.status).toBe(413);
  });

  it("upload handler rejects disallowed MIME types", async () => {
    const handler = createUploadHandler({
      storage,
      allowedMimeTypes: ["image/png"],
    });

    const formData = new FormData();
    formData.append(
      "file",
      new File(["exe-content"], "virus.exe", { type: "application/x-msdownload" }),
    );

    const res = await handler({
      request: new Request("http://localhost/upload", { method: "POST", body: formData }),
    });
    expect(res.status).toBe(415);
  });

  it("upload handler rejects path traversal in folder", async () => {
    const handler = createUploadHandler({ storage });

    const formData = new FormData();
    formData.append("file", new File(["data"], "test.txt", { type: "text/plain" }));
    formData.append("folder", "../../etc");

    const res = await handler({
      request: new Request("http://localhost/upload", { method: "POST", body: formData }),
    });
    expect(res.status).toBe(400);
  });

  // --- Phase 6: Delete files ---

  it("deletes a file from storage", async () => {
    const existsBefore = await storage.exists(textFile.path);
    expect(existsBefore).toBe(true);

    await storage.delete(textFile.path);

    const existsAfter = await storage.exists(textFile.path);
    expect(existsAfter).toBe(false);
  });

  it("storage.delete blocks path traversal", async () => {
    await expect(storage.delete("../../etc/passwd")).rejects.toThrow();
  });

  // --- Phase 7: Multiple uploads in sequence (batch simulation) ---

  it("handles batch upload of multiple files", async () => {
    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = await storage.upload(Buffer.from(`batch-file-${i}-content`), {
        filename: `batch-${i}.txt`,
        mimeType: "text/plain",
        folder: "batch",
      });
      results.push(result);
    }

    expect(results).toHaveLength(10);

    // All files should have unique paths
    const paths = new Set(results.map((r) => r.path));
    expect(paths.size).toBe(10);

    // All should exist
    for (const r of results) {
      expect(await storage.exists(r.path)).toBe(true);
    }
  });
});
