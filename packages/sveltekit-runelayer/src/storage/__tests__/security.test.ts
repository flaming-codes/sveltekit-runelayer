import { describe, it, expect } from "vitest";
import { detectMimeType, normalizeMimeType, sanitizeFilename } from "../security.js";

describe("detectMimeType", () => {
  it("detects PNG magic bytes", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(detectMimeType(buf, "image.bin")).toBe("image/png");
  });

  it("detects JPEG magic bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(detectMimeType(buf, "photo.bin")).toBe("image/jpeg");
  });

  it("detects GIF magic bytes", () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(detectMimeType(buf, "anim.bin")).toBe("image/gif");
  });

  it("detects WebP magic bytes (RIFF + WEBP)", () => {
    const buf = Buffer.alloc(16);
    // RIFF header
    buf[0] = 0x52;
    buf[1] = 0x49;
    buf[2] = 0x46;
    buf[3] = 0x46;
    // file size (ignored)
    buf[4] = 0x00;
    buf[5] = 0x00;
    buf[6] = 0x00;
    buf[7] = 0x00;
    // WEBP marker
    buf.write("WEBP", 8);
    expect(detectMimeType(buf, "image.bin")).toBe("image/webp");
  });

  it("detects PDF magic bytes", () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
    expect(detectMimeType(buf, "doc.bin")).toBe("application/pdf");
  });

  it("detects SVG content starting with <svg", () => {
    const buf = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    expect(detectMimeType(buf, "icon.bin")).toBe("image/svg+xml");
  });

  it("detects SVG content starting with <?xml followed by <svg", () => {
    const buf = Buffer.from('<?xml version="1.0"?><svg></svg>');
    expect(detectMimeType(buf, "icon.bin")).toBe("image/svg+xml");
  });

  it("falls back to extension for unknown magic bytes", () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(detectMimeType(buf, "photo.jpg")).toBe("image/jpeg");
    expect(detectMimeType(buf, "photo.png")).toBe("image/png");
  });

  it("returns undefined for unknown bytes and unknown extension", () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(detectMimeType(buf, "data.xyz")).toBeUndefined();
  });

  it("returns undefined for empty buffer with unknown extension", () => {
    const buf = Buffer.alloc(0);
    expect(detectMimeType(buf, "empty.xyz")).toBeUndefined();
  });
});

describe("normalizeMimeType", () => {
  it("normalizes image/jpg to image/jpeg", () => {
    expect(normalizeMimeType("image/jpg")).toBe("image/jpeg");
  });

  it("passes through image/jpeg unchanged", () => {
    expect(normalizeMimeType("image/jpeg")).toBe("image/jpeg");
  });

  it("passes through unknown types", () => {
    expect(normalizeMimeType("application/octet-stream")).toBe("application/octet-stream");
  });

  it("lowercases and trims", () => {
    expect(normalizeMimeType("  IMAGE/PNG  ")).toBe("image/png");
  });

  it("returns undefined for undefined input", () => {
    expect(normalizeMimeType(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(normalizeMimeType("")).toBeUndefined();
  });

  it("returns undefined for whitespace-only string", () => {
    expect(normalizeMimeType("   ")).toBeUndefined();
  });
});

describe("sanitizeFilename", () => {
  it("passes through simple filenames", () => {
    expect(sanitizeFilename("photo.jpg")).toBe("photo.jpg");
  });

  it("strips path separators", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
  });

  it("replaces spaces and special chars with underscores", () => {
    expect(sanitizeFilename("my file (1).jpg")).toBe("my_file__1_.jpg");
  });

  it("handles null bytes", () => {
    expect(sanitizeFilename("file\0name.txt")).toBe("filename.txt");
  });

  it("returns upload.bin for empty string", () => {
    expect(sanitizeFilename("")).toBe("upload.bin");
  });

  it("returns upload.bin for whitespace-only", () => {
    expect(sanitizeFilename("   ")).toBe("upload.bin");
  });

  it("preserves dots and dashes", () => {
    expect(sanitizeFilename("my-file.v2.tar.gz")).toBe("my-file.v2.tar.gz");
  });

  it("preserves underscores", () => {
    expect(sanitizeFilename("my_file_name.txt")).toBe("my_file_name.txt");
  });
});
