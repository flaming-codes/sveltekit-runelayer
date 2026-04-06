import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createUploadHandler } from "../handler.js";
import { createServeHandler } from "../serve.js";
import { createLocalStorage } from "../local.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import type { StorageAdapter } from "../types.js";

let storage: StorageAdapter;
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `runelayer-handler-test-${randomUUID()}`);
  storage = createLocalStorage({ directory: testDir, urlPrefix: "/uploads" });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

function makeFormData(file: File, folder?: string): FormData {
  const fd = new FormData();
  fd.set("file", file);
  if (folder) fd.set("folder", folder);
  return fd;
}

function makeRequest(formData: FormData): Request {
  return new Request("http://localhost/upload", {
    method: "POST",
    body: formData,
  });
}

describe("createUploadHandler", () => {
  it("rejects file exceeding maxFileSize", async () => {
    const handler = createUploadHandler({ storage, maxFileSize: 10 });
    const content = "a".repeat(20);
    const file = new File([content], "big.txt", { type: "text/plain" });
    const request = makeRequest(makeFormData(file));

    const response = await handler({ request });
    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error).toContain("max size");
  });

  it("rejects MIME type not in allowedMimeTypes", async () => {
    const handler = createUploadHandler({
      storage,
      allowedMimeTypes: ["image/png"],
    });
    const file = new File([Buffer.from([0xff, 0xd8, 0xff, 0xe0])], "photo.jpg", {
      type: "image/jpeg",
    });
    const request = makeRequest(makeFormData(file));

    const response = await handler({ request });
    expect(response.status).toBe(415);
    const body = await response.json();
    expect(body.error).toContain("not allowed");
  });

  it("succeeds for valid upload", async () => {
    const handler = createUploadHandler({ storage });
    const file = new File(["hello world"], "test.txt", { type: "text/plain" });
    const request = makeRequest(makeFormData(file));

    const response = await handler({ request });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.filename).toBe("test.txt");
    expect(body.mimeType).toBe("text/plain");
    expect(body.size).toBe(11);
    expect(body.url).toMatch(/^\/uploads\//);
  });

  it("returns 400 when no file in form data", async () => {
    const handler = createUploadHandler({ storage });
    const fd = new FormData();
    const request = new Request("http://localhost/upload", {
      method: "POST",
      body: fd,
    });

    const response = await handler({ request });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("No file");
  });

  it("returns 400 for invalid folder path", async () => {
    const handler = createUploadHandler({ storage });
    const file = new File(["data"], "test.txt", { type: "text/plain" });
    const request = makeRequest(makeFormData(file, "../escape"));

    const response = await handler({ request });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("folder");
  });

  it("detects MIME mismatch between content and declared type", async () => {
    const handler = createUploadHandler({ storage });
    // PNG magic bytes but declared as JPEG
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const file = new File([pngBytes], "image.png", { type: "image/jpeg" });
    const request = makeRequest(makeFormData(file));

    const response = await handler({ request });
    expect(response.status).toBe(415);
    const body = await response.json();
    expect(body.error).toContain("does not match");
  });
});

describe("createServeHandler", () => {
  async function uploadFile(
    name: string,
    content: string,
    mime: string,
  ): Promise<{ path: string; url: string }> {
    const buf = Buffer.from(content);
    return storage.upload(buf, { filename: name, mimeType: mime });
  }

  it("rejects path traversal with ../", async () => {
    const handler = createServeHandler({ storage });
    const request = new Request("http://localhost/uploads/../../../etc/passwd");
    const response = await handler({ request });
    expect(response.status).toBe(404);
  });

  it("rejects encoded path traversal with %2e%2e", async () => {
    const handler = createServeHandler({ storage });
    const request = new Request("http://localhost/uploads/%2e%2e/%2e%2e/etc/passwd");
    const response = await handler({ request });
    expect(response.status).toBe(404);
  });

  it("returns 404 for non-existent file", async () => {
    const handler = createServeHandler({ storage });
    const request = new Request("http://localhost/uploads/no-such-file.txt");
    const response = await handler({ request });
    expect(response.status).toBe(404);
  });

  it("serves SVG as attachment by default", async () => {
    const result = await uploadFile("icon.svg", "<svg></svg>", "image/svg+xml");
    const handler = createServeHandler({ storage });
    const request = new Request(`http://localhost/uploads/${result.path}`);
    const response = await handler({ request });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
  });

  it("serves SVG inline when allowInlineSvg is true", async () => {
    const result = await uploadFile("icon.svg", "<svg></svg>", "image/svg+xml");
    const handler = createServeHandler({ storage, allowInlineSvg: true });
    const request = new Request(`http://localhost/uploads/${result.path}`);
    const response = await handler({ request });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("inline");
  });

  it("includes X-Content-Type-Options: nosniff header", async () => {
    const result = await uploadFile("doc.txt", "hello", "text/plain");
    const handler = createServeHandler({ storage });
    const request = new Request(`http://localhost/uploads/${result.path}`);
    const response = await handler({ request });

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("returns correct Content-Type for known extensions", async () => {
    const result = await uploadFile("photo.jpg", "fake-jpeg", "image/jpeg");
    const handler = createServeHandler({ storage });
    const request = new Request(`http://localhost/uploads/${result.path}`);
    const response = await handler({ request });

    expect(response.status).toBe(200);
    // The served file has a UUID name with .jpg extension
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns 404 when path does not match url prefix", async () => {
    const handler = createServeHandler({ storage, urlPrefix: "/files" });
    const request = new Request("http://localhost/uploads/something.txt");
    const response = await handler({ request });
    expect(response.status).toBe(404);
  });
});
