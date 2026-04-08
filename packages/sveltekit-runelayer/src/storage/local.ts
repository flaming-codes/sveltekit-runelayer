import { mkdir, writeFile, unlink, stat, rename, rm } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join, extname, resolve, relative } from "node:path";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { normalizeRelativePath, sanitizeFilename } from "./security.js";
import type { StorageAdapter } from "./types.js";

export interface LocalStorageConfig {
  directory?: string;
  urlPrefix?: string;
}

/** Resolve path within directory; throws if it escapes. */
function safePath(directory: string, userPath?: string): string {
  const normalizedPath = normalizeRelativePath(userPath, "file path");
  const resolved = resolve(directory, normalizedPath ?? ".");
  const rel = relative(resolve(directory), resolved);
  if (rel.startsWith("..")) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

export function createLocalStorage(config: LocalStorageConfig = {}): StorageAdapter {
  const directory = resolve(config.directory ?? "./uploads");
  const urlPrefix = config.urlPrefix ?? "/uploads";

  return {
    async upload(file, opts) {
      const folder = normalizeRelativePath(opts.folder, "folder");
      const safeFilename = sanitizeFilename(opts.filename);
      const ext = extname(safeFilename);
      const uniqueName = `${randomUUID()}${ext}`;
      const dir = safePath(directory, folder);
      await mkdir(dir, { recursive: true });

      const filePath = join(dir, uniqueName);
      const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await (file as File).arrayBuffer());
      const tmpPath = filePath + ".tmp";
      try {
        await writeFile(tmpPath, buffer);
        await rename(tmpPath, filePath);
      } finally {
        await rm(tmpPath, { force: true }).catch(() => {});
      }

      const relativePath = folder ? `${folder}/${uniqueName}` : uniqueName;
      return {
        path: relativePath,
        filename: safeFilename,
        mimeType: opts.mimeType,
        size: buffer.byteLength,
        url: `${urlPrefix}/${relativePath}`,
      };
    },

    async delete(path) {
      await unlink(safePath(directory, path));
    },

    getUrl(path) {
      return `${urlPrefix}/${path}`;
    },

    getStream(path) {
      const resolved = safePath(directory, path);
      const nodeStream = createReadStream(resolved);
      return Readable.toWeb(nodeStream) as ReadableStream;
    },

    async exists(path) {
      try {
        const s = await stat(safePath(directory, path));
        return s.isFile();
      } catch {
        return false;
      }
    },
  };
}
