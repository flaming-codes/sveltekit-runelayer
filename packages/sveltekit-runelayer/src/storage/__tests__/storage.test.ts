import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createLocalStorage } from "../local.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import type { StorageAdapter } from "../types.js";

let storage: StorageAdapter;
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `runelayer-test-${randomUUID()}`);
  storage = createLocalStorage({ directory: testDir, urlPrefix: "/files" });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("createLocalStorage", () => {
  it("upload writes a file and returns metadata", async () => {
    const buf = Buffer.from("hello world");
    const result = await storage.upload(buf, {
      filename: "test.txt",
      mimeType: "text/plain",
    });
    expect(result.filename).toBe("test.txt");
    expect(result.mimeType).toBe("text/plain");
    expect(result.size).toBe(buf.byteLength);
    expect(result.url).toMatch(/^\/files\//);
    expect(result.path).toBeTypeOf("string");
  });

  it("upload supports folder option", async () => {
    const buf = Buffer.from("data");
    const result = await storage.upload(buf, {
      filename: "doc.pdf",
      mimeType: "application/pdf",
      folder: "documents",
    });
    expect(result.path).toContain("documents/");
    expect(result.url).toContain("documents/");
  });

  it("upload sanitizes unsafe filenames", async () => {
    const buf = Buffer.from("data");
    const result = await storage.upload(buf, {
      filename: "../../unsafe<>name?.pdf",
      mimeType: "application/pdf",
    });
    expect(result.filename).toBe("unsafe__name_.pdf");
    expect(result.path).not.toContain("..");
  });

  it("upload rejects invalid folder paths", async () => {
    const buf = Buffer.from("data");
    await expect(
      storage.upload(buf, {
        filename: "file.txt",
        mimeType: "text/plain",
        folder: "../escape",
      }),
    ).rejects.toThrow("Invalid folder");
  });

  it("exists returns true for uploaded file", async () => {
    const buf = Buffer.from("check");
    const result = await storage.upload(buf, {
      filename: "exists.txt",
      mimeType: "text/plain",
    });
    expect(await storage.exists(result.path)).toBe(true);
  });

  it("exists returns false for missing file", async () => {
    expect(await storage.exists("no-such-file.txt")).toBe(false);
  });

  it("delete removes a file", async () => {
    const buf = Buffer.from("delete me");
    const result = await storage.upload(buf, {
      filename: "gone.txt",
      mimeType: "text/plain",
    });
    await storage.delete(result.path);
    expect(await storage.exists(result.path)).toBe(false);
  });

  it("delete rejects traversal paths", async () => {
    await expect(storage.delete("../etc/passwd")).rejects.toThrow();
  });

  it("getUrl returns prefixed path", () => {
    const url = storage.getUrl("some/path.jpg");
    expect(url).toBe("/files/some/path.jpg");
  });

  it("getStream returns stream content for existing file", async () => {
    const expectedContent = "stream me";
    const uploaded = await storage.upload(Buffer.from(expectedContent), {
      filename: "stream.txt",
      mimeType: "text/plain",
    });

    const stream = storage.getStream(uploaded.path);
    expect(stream).not.toBeNull();

    const reader = stream!.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      if (chunk.value) chunks.push(chunk.value);
      done = chunk.done;
    }

    expect(Buffer.concat(chunks).toString("utf8")).toBe(expectedContent);
  });

  it("getStream returns a stream for missing file (caller checks existence)", () => {
    const stream = storage.getStream("missing.txt");
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it("getStream returns a stream for directories (caller checks existence)", async () => {
    await storage.upload(Buffer.from("doc"), {
      filename: "doc.txt",
      mimeType: "text/plain",
      folder: "documents",
    });

    const stream = storage.getStream("documents");
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it("getStream rejects traversal paths", () => {
    expect(() => storage.getStream("../etc/passwd")).toThrow();
  });
});
