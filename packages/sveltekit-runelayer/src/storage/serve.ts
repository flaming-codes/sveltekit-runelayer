import type { StorageAdapter } from "./types.js";
import { normalizeRelativePath } from "./security.js";

export interface ServeHandlerConfig {
  storage: StorageAdapter;
  urlPrefix?: string;
  allowInlineSvg?: boolean;
  accessCheck?: (request: Request) => Promise<boolean>;
}

export function createServeHandler(config: ServeHandlerConfig) {
  const { storage, urlPrefix = "/uploads", allowInlineSvg = false, accessCheck } = config;
  const prefix = urlPrefix.endsWith("/") ? urlPrefix : `${urlPrefix}/`;
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    mp4: "video/mp4",
    webm: "video/webm",
  };
  const inlineSafeExtensions = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf", "mp4", "webm"]);

  return async ({ request }: { request: Request }) => {
    if (accessCheck) {
      const allowed = await accessCheck(request);
      if (!allowed) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith(prefix)) {
      return new Response("Not found", { status: 404 });
    }
    const pathFragment = url.pathname.slice(prefix.length);

    let filePath: string | undefined;
    try {
      filePath = normalizeRelativePath(decodeURIComponent(pathFragment), "file path");
    } catch {
      return new Response("Not found", { status: 404 });
    }

    if (!filePath) {
      return new Response("Not found", { status: 404 });
    }

    const exists = await storage.exists(filePath);
    if (!exists) {
      return new Response("Not found", { status: 404 });
    }

    const stream = storage.getStream(filePath);
    if (!stream) {
      return new Response("Not found", { status: 404 });
    }

    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = mimeTypes[ext] ?? "application/octet-stream";
    const baseName = filePath.split("/").pop() ?? "download";
    const escapedFilename = baseName.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const shouldForceAttachment = ext === "svg" ? !allowInlineSvg : !inlineSafeExtensions.has(ext);
    const disposition = shouldForceAttachment ? "attachment" : "inline";

    const headers = new Headers({
      "Content-Type": mimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `${disposition}; filename="${escapedFilename}"`,
    });

    if (ext === "svg" && allowInlineSvg) {
      headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
    }

    return new Response(stream, { headers });
  };
}
