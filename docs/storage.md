# Storage System

The storage system handles file uploads with a contract-based adapter pattern. V1 ships with a local filesystem adapter; future versions can add S3 or cloud storage.

## Storage Adapter Contract

All storage implementations conform to:

```ts
interface StorageAdapter {
  upload(file: File | Buffer, opts: UploadOptions): Promise<StoredFile>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
  getStream(path: string): ReadableStream | null;
  exists(path: string): Promise<boolean>;
}

interface UploadOptions {
  filename: string;
  mimeType: string;
  folder?: string;
}

interface StoredFile {
  path: string; // Relative path within storage
  filename: string; // Original filename
  mimeType: string; // MIME type
  size: number; // File size in bytes
  url: string; // Public URL for the file
}
```

## Local Filesystem Adapter

```ts
import { createLocalStorage } from "@flaming-codes/sveltekit-runelayer";

const storage = createLocalStorage({
  directory: "./uploads", // Default: './uploads'
  urlPrefix: "/uploads", // Default: '/uploads'
});
```

### Behavior

- **Upload**: Generates a unique filename using `crypto.randomUUID()` + original extension. Creates subdirectories as needed.
- **Delete**: Removes the file from disk.
- **getUrl**: Returns `{urlPrefix}/{path}`.
- **getStream**: Returns a Node.js `ReadableStream` converted from `fs.createReadStream`. Returns `null` when the target is missing or not a file, and throws on path traversal attempts.
- **exists**: Checks file existence via `fs.stat`.

### Security: Path Traversal Protection

All storage operations validate that resolved paths stay within the configured directory:

```ts
// These will throw "Path traversal detected":
storage.delete("../../etc/passwd");
storage.getStream("../secret");
```

The `safePath()` function resolves the full path and verifies it does not escape the storage directory using `path.relative()`.

## Upload Handler

Creates a SvelteKit-compatible POST handler for file uploads:

```ts
import { createUploadHandler } from "@flaming-codes/sveltekit-runelayer";

const uploadHandler = createUploadHandler({
  storage,
  maxFileSize: 10 * 1024 * 1024, // 10MB default
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
});

// In +server.ts:
export const POST = uploadHandler;
```

### Request Format

```
POST /api/upload
Content-Type: multipart/form-data

file: <binary>
folder: images  (optional)
```

### Response

```json
{
  "path": "images/a1b2c3d4-e5f6.jpg",
  "filename": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 245760,
  "url": "/uploads/images/a1b2c3d4-e5f6.jpg"
}
```

### Validation

- Missing `file` field: `400`
- File exceeds `maxFileSize`: `413`
- MIME type not in `allowedMimeTypes`: `415`
- `folder` contains `..` or starts with `/`: `400`

Note: MIME type validation checks the client-provided `Content-Type`, not the actual file bytes. For sensitive deployments, add magic-byte validation.

## Serve Handler

Creates a SvelteKit-compatible GET handler for serving uploaded files:

```ts
import { createServeHandler } from "@flaming-codes/sveltekit-runelayer";

const serveHandler = createServeHandler({
  storage,
  urlPrefix: "/uploads", // Must match storage urlPrefix
});

// In +server.ts:
export const GET = serveHandler;
```

### Behavior

1. Extracts the file path from the URL (after stripping the prefix)
2. Rejects paths containing `..` (path traversal)
3. Checks file existence
4. Streams the file with appropriate `Content-Type` header

When served via `createRunelayer()`, this handler runs inside the same auth `handle` boundary that strips spoofed `x-user-*` headers and resolves sessions.

### Content-Type Detection

Based on file extension:

| Extension | Content-Type             |
| --------- | ------------------------ |
| jpg, jpeg | image/jpeg               |
| png       | image/png                |
| gif       | image/gif                |
| webp      | image/webp               |
| svg       | image/svg+xml            |
| pdf       | application/pdf          |
| mp4       | video/mp4                |
| webm      | video/webm               |
| (other)   | application/octet-stream |

## Upload Collections

Collections with `upload: true` are designated as media collections:

```ts
const Media = defineCollection({
  slug: "media",
  fields: [{ name: "alt", ...text() }],
  upload: {
    mimeTypes: ["image/*", "application/pdf"],
    maxSize: 20 * 1024 * 1024, // 20MB
    imageSizes: [
      { name: "thumbnail", width: 200, height: 200 },
      { name: "medium", width: 800 },
    ],
  },
});
```

```ts
interface UploadConfig {
  mimeTypes?: string[]; // Allowed MIME types
  maxSize?: number; // Max file size in bytes
  imageSizes?: {
    // Auto-generated image variants
    name: string;
    width: number;
    height?: number;
  }[];
}
```

Note: Image resizing is not yet implemented in v1. The `imageSizes` config is stored for future use with Sharp or similar library.
