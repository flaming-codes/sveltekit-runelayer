import type { RequestEvent } from "@sveltejs/kit";
import type { RunelayerInstance } from "../plugin.js";
import { create, find, findOne, remove, update } from "../query/index.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { FindArgs } from "../query/types.js";
import type { CollectionInput, RunelayerQueryApi } from "./types.js";
import { assertSafeIdentifier, quoteIdent } from "../db/sql-utils.js";

export { assertSafeIdentifier, quoteIdent };

export function getCountValue(row: unknown): number {
  if (!row || typeof row !== "object") return 0;
  const record = row as Record<string, unknown>;
  if ("count" in record) return Number(record.count ?? 0);
  const firstValue = Object.values(record)[0];
  return Number(firstValue ?? 0);
}

export async function countDocuments(
  runelayer: RunelayerInstance,
  collection: string,
): Promise<number> {
  const result = await runelayer.database.client.execute(
    `SELECT COUNT(*) AS count FROM ${quoteIdent(collection)}`,
  );
  return getCountValue(result.rows[0]);
}

export async function countAdminUsers(runelayer: RunelayerInstance): Promise<number> {
  try {
    const result = await runelayer.database.client.execute(
      `SELECT COUNT(*) AS count FROM "user" WHERE (',' || LOWER(COALESCE(role, '')) || ',') LIKE '%,admin,%'`,
    );
    return getCountValue(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // If Better Auth tables are not migrated yet, treat this as "no admins".
    if (message.toLowerCase().includes(`no such table`) && message.toLowerCase().includes(`user`)) {
      return 0;
    }
    throw error;
  }
}

export function resolveCollection(
  collections: CollectionConfig[],
  input: CollectionInput,
): CollectionConfig {
  if (typeof input !== "string") return input;
  const resolved = collections.find((collection) => collection.slug === input);
  if (!resolved) {
    throw new Error(`Unknown collection: ${input}`);
  }
  return resolved;
}

export function toRequest(eventOrRequest: RequestEvent | Request): Request {
  if (eventOrRequest instanceof Request) return eventOrRequest;
  if ("request" in eventOrRequest) return eventOrRequest.request;
  throw new Error("Expected Request or RequestEvent");
}

export function systemRequest(adminPath: string): Request {
  return new Request(`http://localhost${adminPath}`, {
    headers: {
      "x-user-id": "runelayer-system",
      "x-user-role": "admin",
      "x-user-email": "system@runelayer.local",
    },
  });
}

export function createQueryApi(
  runelayer: RunelayerInstance,
  requestFactory: () => Request,
): RunelayerQueryApi {
  return {
    async find(collectionInput: CollectionInput, args: FindArgs = {}) {
      const collection = resolveCollection(runelayer.collections, collectionInput);
      return await find(
        {
          db: runelayer.database,
          collection,
          req: requestFactory(),
        },
        args,
      );
    },

    async findOne(collectionInput: CollectionInput, id: string) {
      const collection = resolveCollection(runelayer.collections, collectionInput);
      return await findOne({ db: runelayer.database, collection, req: requestFactory() }, id);
    },

    async create(collectionInput: CollectionInput, data: Record<string, unknown>) {
      const collection = resolveCollection(runelayer.collections, collectionInput);
      return await create({ db: runelayer.database, collection, req: requestFactory() }, data);
    },

    async update(collectionInput: CollectionInput, id: string, data: Record<string, unknown>) {
      const collection = resolveCollection(runelayer.collections, collectionInput);
      return await update({ db: runelayer.database, collection, req: requestFactory() }, id, data);
    },

    async remove(collectionInput: CollectionInput, id: string) {
      const collection = resolveCollection(runelayer.collections, collectionInput);
      return await remove({ db: runelayer.database, collection, req: requestFactory() }, id);
    },
  };
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  name: string;
  image: string | null;
}

export function getUser(event: RequestEvent): AdminUser | null {
  const user = (event.locals as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;

  const record = user as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  if (!id) return null;
  const email = typeof record.email === "string" ? record.email : "";
  const role = typeof record.role === "string" ? record.role : "user";
  const name = typeof record.name === "string" ? record.name : "";
  const image = typeof record.image === "string" ? record.image : null;
  return { id, email, role, name, image };
}

export function formField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  image: string | null;
  emailVerified: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: string | null;
}

export interface ManagedUserList {
  users: ManagedUser[];
  total: number;
  limit: number;
  offset: number;
}

export const SUPPORTED_USER_ROLES = new Set(["admin", "editor", "user"]);

export function normalizeUserRole(input: string): string {
  const role = input.trim().toLowerCase();
  return SUPPORTED_USER_ROLES.has(role) ? role : "user";
}

export function parseAuthErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    if (typeof data.message === "string" && data.message.trim().length > 0) {
      return data.message;
    }
    if (typeof data.error === "string" && data.error.trim().length > 0) {
      return data.error;
    }
  }
  return fallback;
}

export function parseManagedUser(payload: unknown): ManagedUser | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.id !== "string") return null;
  if (typeof record.email !== "string") return null;
  if (typeof record.name !== "string") return null;
  const role =
    typeof record.role === "string" && record.role.length > 0
      ? record.role.split(",")[0]!.trim().toLowerCase()
      : "user";

  return {
    id: record.id,
    email: record.email,
    name: record.name,
    role: SUPPORTED_USER_ROLES.has(role) ? role : "user",
    image: typeof record.image === "string" ? record.image : null,
    emailVerified: Boolean(record.emailVerified),
    createdAt: typeof record.createdAt === "string" ? record.createdAt : null,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
    banned: typeof record.banned === "boolean" ? record.banned : null,
    banReason: typeof record.banReason === "string" ? record.banReason : null,
    banExpires: typeof record.banExpires === "string" ? record.banExpires : null,
  };
}
