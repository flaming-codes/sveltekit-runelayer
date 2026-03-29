// Server-side handler factories for admin routes.
// Each returns a function compatible with SvelteKit load/actions patterns.
// The host app calls these from their own +page.server.ts files.

import type { CollectionConfig } from "../schema/collections.js";

export type QueryAdapter = {
  find(
    collection: string,
    opts: { page?: number; limit?: number; sort?: string; where?: Record<string, unknown> },
  ): Promise<{
    docs: Record<string, unknown>[];
    totalDocs: number;
    totalPages: number;
    page: number;
  }>;
  findById(collection: string, id: string): Promise<Record<string, unknown> | null>;
  create(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(
    collection: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  deleteDoc(collection: string, id: string): Promise<void>;
  count(collection: string): Promise<number>;
};

/** Returns a load function that lists documents for a collection. */
export function handleCollectionList(collection: CollectionConfig, db: QueryAdapter) {
  return async ({ url }: { url: URL }) => {
    const page = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "20");
    const result = await db.find(collection.slug, { page, limit });
    return { collection, ...result };
  };
}

/** Returns a load function that gets a single document. */
export function handleCollectionGet(collection: CollectionConfig, db: QueryAdapter) {
  return async ({ params }: { params: { id: string } }) => {
    const doc = await db.findById(collection.slug, params.id);
    return { collection, document: doc };
  };
}

/** Returns an action that creates a document. */
export function handleCollectionCreate(collection: CollectionConfig, db: QueryAdapter) {
  return async ({ request }: { request: Request }) => {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    const doc = await db.create(collection.slug, data);
    return { success: true, document: doc };
  };
}

/** Returns an action that updates a document. */
export function handleCollectionUpdate(collection: CollectionConfig, db: QueryAdapter) {
  return async ({ request }: { request: Request }) => {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    const id = data.id as string;
    delete data.id;
    const doc = await db.update(collection.slug, id, data);
    return { success: true, document: doc };
  };
}

/** Returns an action that deletes a document. */
export function handleCollectionDelete(collection: CollectionConfig, db: QueryAdapter) {
  return async ({ request }: { request: Request }) => {
    const formData = await request.formData();
    const id = formData.get("id") as string;
    await db.deleteDoc(collection.slug, id);
    return { success: true };
  };
}
