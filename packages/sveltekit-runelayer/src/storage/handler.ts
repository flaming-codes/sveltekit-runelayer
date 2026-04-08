import { json } from "@sveltejs/kit";
import {
  detectMimeType,
  normalizeMimeType,
  normalizeRelativePath,
  sanitizeFilename,
} from "./security.js";
import type { StorageAdapter } from "./types.js";

export interface UploadHandlerConfig {
  storage: StorageAdapter;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  accessCheck?: (request: Request) => Promise<boolean>;
}

export function createUploadHandler(config: UploadHandlerConfig) {
  const { storage, maxFileSize = 10 * 1024 * 1024, allowedMimeTypes, accessCheck } = config;
  const allowed = allowedMimeTypes?.map((entry) => normalizeMimeType(entry)).filter(Boolean) as
    | string[]
    | undefined;

  return async ({ request }: { request: Request }) => {
    if (accessCheck) {
      const hasAccess = await accessCheck(request);
      if (!hasAccess) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > maxFileSize) {
      return json({ error: `File exceeds max size of ${maxFileSize} bytes` }, { status: 413 });
    }

    const folderField = formData.get("folder");
    const folderValue = typeof folderField === "string" ? folderField : undefined;
    let folder: string | undefined;
    try {
      folder = normalizeRelativePath(folderValue, "folder path");
    } catch {
      return json({ error: "Invalid folder path" }, { status: 400 });
    }

    const safeFilename = sanitizeFilename(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.byteLength > maxFileSize) {
      return json({ error: `File exceeds max size of ${maxFileSize} bytes` }, { status: 413 });
    }

    const detectedMime = normalizeMimeType(detectMimeType(buffer, safeFilename));
    const declaredMime = normalizeMimeType(file.type);

    if (detectedMime && declaredMime && detectedMime !== declaredMime) {
      return json(
        { error: `Uploaded file content does not match declared MIME type ${file.type}` },
        { status: 415 },
      );
    }

    if (allowed && !detectedMime) {
      return json({ error: "Could not verify file type" }, { status: 415 });
    }

    const effectiveMime = detectedMime ?? declaredMime ?? "application/octet-stream";

    if (allowed && !allowed.includes(effectiveMime)) {
      return json({ error: `Mime type ${effectiveMime} not allowed` }, { status: 415 });
    }

    const stored = await storage.upload(buffer, {
      filename: safeFilename,
      mimeType: effectiveMime,
      folder,
    });

    return json(stored, { status: 201 });
  };
}
