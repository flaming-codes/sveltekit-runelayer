import type { StorageAdapter } from "./types.js";

export interface ServeHandlerConfig {
  storage: StorageAdapter;
  urlPrefix?: string;
}

export function createServeHandler(config: ServeHandlerConfig) {
  const { storage, urlPrefix = "/uploads" } = config;
  const prefix = urlPrefix.endsWith("/") ? urlPrefix : `${urlPrefix}/`;

  return async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    const filePath = url.pathname.slice(prefix.length);

    if (!filePath || filePath.includes("..")) {
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

    return new Response(stream, {
      headers: { "Content-Type": mimeTypes[ext] ?? "application/octet-stream" },
    });
  };
}
