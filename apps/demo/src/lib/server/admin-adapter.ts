import {
  create as rkCreate,
  find as rkFind,
  findOne as rkFindOne,
  remove as rkRemove,
  update as rkUpdate,
  type QueryContext,
  type RunekitInstance,
} from "@flaming-codes/sveltekit-runelayer";
import type { QueryAdapter } from "@flaming-codes/sveltekit-runelayer/admin";
import type { CollectionConfig } from "@flaming-codes/sveltekit-runelayer";

function quoteIdent(name: string): string {
  return `"${name.replaceAll(`"`, `""`)}"`;
}

function getCountValue(row: unknown): number {
  if (!row || typeof row !== "object") return 0;
  const rec = row as Record<string, unknown>;
  if ("count" in rec) return Number(rec.count ?? 0);
  const first = Object.values(rec)[0];
  return Number(first ?? 0);
}

function adminRequest(): Request {
  return new Request("http://localhost/admin", {
    headers: {
      "x-user-id": "demo-admin",
      "x-user-role": "admin",
      "x-user-email": "admin@demo.local",
    },
  });
}

export function getCollectionBySlug(
  runekit: RunekitInstance,
  slug: string,
): CollectionConfig | undefined {
  return runekit.collections.find((collection) => collection.slug === slug);
}

export function createAdminQueryAdapter(runekit: RunekitInstance): QueryAdapter {
  const ctx = (collection: CollectionConfig): QueryContext => ({
    db: runekit.database,
    collection,
    req: adminRequest(),
  });

  const getCollection = (slug: string): CollectionConfig => {
    const collection = getCollectionBySlug(runekit, slug);
    if (!collection) {
      throw new Error(`Unknown collection: ${slug}`);
    }
    return collection;
  };

  return {
    async find(collection, opts) {
      const col = getCollection(collection);
      const page = Math.max(1, opts.page ?? 1);
      const limit = Math.max(1, opts.limit ?? 20);
      const offset = (page - 1) * limit;
      const docs = await rkFind(ctx(col), {
        limit,
        offset,
        sort: opts.sort,
        sortOrder: "asc",
      });

      const totalDocs = await this.count(collection);
      const totalPages = Math.max(1, Math.ceil(totalDocs / limit));

      return {
        docs,
        totalDocs,
        totalPages,
        page,
      };
    },

    async findById(collection, id) {
      const col = getCollection(collection);
      const doc = await rkFindOne(ctx(col), id);
      return doc ?? null;
    },

    async create(collection, data) {
      const col = getCollection(collection);
      return await rkCreate(ctx(col), data);
    },

    async update(collection, id, data) {
      const col = getCollection(collection);
      return await rkUpdate(ctx(col), id, data);
    },

    async deleteDoc(collection, id) {
      const col = getCollection(collection);
      await rkRemove(ctx(col), id);
    },

    async count(collection) {
      const result = await runekit.database.client.execute(
        `SELECT COUNT(*) AS count FROM ${quoteIdent(collection)}`,
      );
      return getCountValue(result.rows[0]);
    },
  };
}
