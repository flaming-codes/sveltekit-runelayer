import { basename, extname } from "node:path";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain",
};

function startsWithBytes(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((value, index) => buffer[index] === value);
}

function detectSvg(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 1024).toString("utf8").trimStart().toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}

function fromExtension(filename: string): string | undefined {
  const extension = extname(filename).toLowerCase();
  return MIME_BY_EXTENSION[extension];
}

export function normalizeRelativePath(
  rawPath: string | undefined,
  valueName = "path",
): string | undefined {
  if (!rawPath) return undefined;
  const normalized = rawPath.replaceAll("\\", "/").trim();
  if (!normalized.length) return undefined;
  if (normalized.startsWith("/") || normalized.includes("\0")) {
    throw new Error(`Invalid ${valueName}`);
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Invalid ${valueName}`);
  }

  return segments.join("/");
}

export function sanitizeFilename(rawFilename: string): string {
  const base = basename(rawFilename).replaceAll("\0", "").trim();
  const cleaned = base.replace(/[^\w.-]/g, "_");
  return cleaned.length > 0 ? cleaned : "upload.bin";
}

export function detectMimeType(buffer: Buffer, filename: string): string | undefined {
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (startsWithBytes(buffer, [0x47, 0x49, 0x46, 0x38])) {
    return "image/gif";
  }
  if (startsWithBytes(buffer, [0x25, 0x50, 0x44, 0x46])) {
    return "application/pdf";
  }
  if (
    startsWithBytes(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.subarray(8, 12).toString() === "WEBP"
  ) {
    return "image/webp";
  }
  if (startsWithBytes(buffer, [0x1a, 0x45, 0xdf, 0xa3])) {
    return "video/webm";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString() === "ftyp" &&
    buffer.subarray(8, 12).toString().toLowerCase().includes("mp4")
  ) {
    return "video/mp4";
  }
  if (detectSvg(buffer)) {
    return "image/svg+xml";
  }

  return fromExtension(filename);
}

export function normalizeMimeType(rawMimeType: string | undefined): string | undefined {
  if (!rawMimeType) return undefined;
  const normalized = rawMimeType.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "image/jpg") return "image/jpeg";
  return normalized;
}
