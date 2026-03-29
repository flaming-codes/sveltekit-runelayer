import { json } from "@sveltejs/kit";
import type { StorageAdapter } from "./types.js";

export interface UploadHandlerConfig {
  storage: StorageAdapter;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}

export function createUploadHandler(config: UploadHandlerConfig) {
  const { storage, maxFileSize = 10 * 1024 * 1024, allowedMimeTypes } = config;

  return async ({ request }: { request: Request }) => {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > maxFileSize) {
      return json({ error: `File exceeds max size of ${maxFileSize} bytes` }, { status: 413 });
    }

    if (allowedMimeTypes && !allowedMimeTypes.includes(file.type)) {
      return json({ error: `Mime type ${file.type} not allowed` }, { status: 415 });
    }

    const folder = (formData.get("folder") as string) || undefined;
    if (folder && (folder.includes("..") || folder.startsWith("/"))) {
      return json({ error: "Invalid folder path" }, { status: 400 });
    }

    const stored = await storage.upload(file, {
      filename: file.name,
      mimeType: file.type,
      folder,
    });

    return json(stored, { status: 201 });
  };
}
