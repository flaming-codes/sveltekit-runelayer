import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { join, extname, resolve, relative } from "node:path";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import type { StorageAdapter } from "./types.js";

export interface LocalStorageConfig {
  directory?: string;
  urlPrefix?: string;
}

/** Resolve path within directory; throws if it escapes. */
function safePath(directory: string, userPath: string): string {
  const resolved = resolve(directory, userPath);
  const rel = relative(resolve(directory), resolved);
  if (rel.startsWith("..") || (resolve(resolved) !== resolved && rel.includes(".."))) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

export function createLocalStorage(config: LocalStorageConfig = {}): StorageAdapter {
  const directory = resolve(config.directory ?? "./uploads");
  const urlPrefix = config.urlPrefix ?? "/uploads";

  return {
    async upload(file, opts) {
      const folder = opts.folder ?? "";
      if (folder.includes("..")) throw new Error("Invalid folder path");
      const ext = extname(opts.filename);
      const uniqueName = `${randomUUID()}${ext}`;
      const dir = safePath(directory, folder);
      await mkdir(dir, { recursive: true });

      const filePath = join(dir, uniqueName);
      const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await (file as File).arrayBuffer());
      await writeFile(filePath, buffer);

      const relativePath = folder ? `${folder}/${uniqueName}` : uniqueName;
      return {
        path: relativePath,
        filename: opts.filename,
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
      if (!existsSync(resolved)) return null;
      const nodeStream = createReadStream(resolved);
      return Readable.toWeb(nodeStream) as ReadableStream;
    },

    async exists(path) {
      try {
        await stat(safePath(directory, path));
        return true;
      } catch {
        return false;
      }
    },
  };
}
