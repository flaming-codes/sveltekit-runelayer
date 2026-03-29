import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, Handle, RequestEvent } from "@sveltejs/kit";
import { defineConfig } from "../config.js";
import { createRunelayer } from "../plugin.js";
import { create, find, findOne, remove, update } from "../query/index.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { RunelayerInstance } from "../plugin.js";
import type { FindArgs } from "../query/types.js";
import type { ComponentType } from "svelte";
import { toSerializable } from "./serializable.js";
import type {
  CollectionInput,
  RunelayerApp,
  RunelayerAppConfig,
  RunelayerQueryApi,
} from "./types.js";

type AdminRoute =
  | { kind: "dashboard" }
  | { kind: "login" }
  | { kind: "logout" }
  | { kind: "collection-list"; slug: string }
  | { kind: "collection-create"; slug: string }
  | { kind: "collection-edit"; slug: string; id: string };

function normalizeAdminPath(path: string): string {
  if (!path.startsWith("/")) return `/${path}`;
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function parseAdminRoute(path: string | undefined): AdminRoute | null {
  const segments = (path ?? "")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) return { kind: "dashboard" };
  if (segments.length === 1 && segments[0] === "login") return { kind: "login" };
  if (segments.length === 1 && segments[0] === "logout") return { kind: "logout" };

  if (segments[0] === "collections") {
    if (segments.length === 2) {
      return { kind: "collection-list", slug: segments[1] };
    }

    if (segments.length === 3 && segments[2] === "create") {
      return { kind: "collection-create", slug: segments[1] };
    }

    if (segments.length === 3) {
      return {
        kind: "collection-edit",
        slug: segments[1],
        id: segments[2],
      };
    }
  }

  return null;
}

function quoteIdent(name: string): string {
  return `"${name.replaceAll(`"`, `""`)}"`;
}

function getCountValue(row: unknown): number {
  if (!row || typeof row !== "object") return 0;
  const record = row as Record<string, unknown>;
  if ("count" in record) return Number(record.count ?? 0);
  const firstValue = Object.values(record)[0];
  return Number(firstValue ?? 0);
}

async function countDocuments(runelayer: RunelayerInstance, collection: string): Promise<number> {
  const result = await runelayer.database.client.execute(
    `SELECT COUNT(*) AS count FROM ${quoteIdent(collection)}`,
  );
  return getCountValue(result.rows[0]);
}

function resolveCollection(
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

function toRequest(eventOrRequest: RequestEvent | Request): Request {
  if (eventOrRequest instanceof Request) return eventOrRequest;
  if ("request" in eventOrRequest) return eventOrRequest.request;
  throw new Error("Expected Request or RequestEvent");
}

function systemRequest(adminPath: string): Request {
  return new Request(`http://localhost${adminPath}`, {
    headers: {
      "x-user-id": "runelayer-system",
      "x-user-role": "admin",
      "x-user-email": "system@runelayer.local",
    },
  });
}

function createQueryApi(
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

function getCollectionBySlug(runelayer: RunelayerInstance, slug: string): CollectionConfig {
  const collection = runelayer.collections.find((entry) => entry.slug === slug);
  if (!collection) {
    throw error(404, `Unknown collection: ${slug}`);
  }
  return collection;
}

function getUser(event: RequestEvent): { email: string; role: string } | null {
  const user = (event.locals as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;

  const record = user as Record<string, unknown>;
  const email = typeof record.email === "string" ? record.email : "";
  const role = typeof record.role === "string" ? record.role : "user";
  return { email, role };
}

function formField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function guardAdminRoute(
  event: RequestEvent,
  route: AdminRoute,
  strictAccess: boolean,
  adminPath: string,
): void {
  if (!strictAccess) return;

  const user = getUser(event);

  if (route.kind === "login") {
    if (user?.role === "admin") {
      throw redirect(303, adminPath);
    }
    return;
  }

  if (!user) {
    throw redirect(303, `${adminPath}/login`);
  }

  if (user.role !== "admin") {
    throw error(403, "Admin access required");
  }
}

function adminQueryApi(
  strictAccess: boolean,
  withRequest: (eventOrRequest: RequestEvent | Request) => RunelayerQueryApi,
  system: RunelayerQueryApi,
  event: RequestEvent,
): RunelayerQueryApi {
  return strictAccess ? withRequest(event) : system;
}

export function createRunelayerRuntime(
  config: RunelayerAppConfig,
  page: ComponentType,
): RunelayerApp {
  const adminPath = normalizeAdminPath(config.admin?.path ?? "/admin");
  const strictAccess = config.admin?.strictAccess ?? true;
  const authBasePath = config.auth.basePath ?? "/api/auth";

  const { admin: _admin, ...runelayerConfig } = config;
  const runelayer = createRunelayer(
    defineConfig({
      ...runelayerConfig,
      adminPath,
    }),
  );

  const system = createQueryApi(runelayer, () => systemRequest(adminPath));

  const withRequest = (eventOrRequest: RequestEvent | Request): RunelayerQueryApi => {
    const req = toRequest(eventOrRequest);
    return createQueryApi(runelayer, () => req);
  };

  const load = async (event: RequestEvent): Promise<Record<string, unknown>> => {
    const route = parseAdminRoute(event.params.path);
    if (!route) {
      throw error(404, "Admin route not found");
    }

    guardAdminRoute(event, route, strictAccess, adminPath);

    const user = getUser(event);
    const baseData = {
      basePath: adminPath,
      collections: toSerializable(runelayer.collections),
      globals: toSerializable(runelayer.globals),
      user: user ? { email: user.email } : null,
    };

    if (route.kind === "login") {
      return {
        ...baseData,
        view: "login",
      };
    }

    if (route.kind === "logout") {
      throw redirect(303, adminPath);
    }

    if (route.kind === "dashboard") {
      const dashboardCollections = await Promise.all(
        runelayer.collections.map(async (collection) => ({
          slug: collection.slug,
          label: collection.labels?.plural ?? collection.slug,
          count: await countDocuments(runelayer, collection.slug),
        })),
      );

      return {
        ...baseData,
        view: "dashboard",
        dashboardCollections,
      };
    }

    if (route.kind === "collection-list") {
      const collection = getCollectionBySlug(runelayer, route.slug);
      const query = adminQueryApi(strictAccess, withRequest, system, event);

      const page = Math.max(1, Number(event.url.searchParams.get("page") ?? "1"));
      const limit = Math.max(1, Number(event.url.searchParams.get("limit") ?? "20"));
      const offset = (page - 1) * limit;
      const docs = await query.find(collection, {
        limit,
        offset,
      });
      const totalDocs = await countDocuments(runelayer, collection.slug);
      const totalPages = Math.max(1, Math.ceil(totalDocs / limit));

      return toSerializable({
        ...baseData,
        view: "collection-list",
        collection,
        docs,
        page,
        totalPages,
        totalDocs,
      });
    }

    if (route.kind === "collection-create") {
      const collection = getCollectionBySlug(runelayer, route.slug);
      return toSerializable({
        ...baseData,
        view: "collection-create",
        collection,
      });
    }

    const collection = getCollectionBySlug(runelayer, route.slug);
    const query = adminQueryApi(strictAccess, withRequest, system, event);
    const document = await query.findOne(collection, route.id);

    if (!document) {
      throw error(404, `Document not found: ${route.id}`);
    }

    return toSerializable({
      ...baseData,
      view: "collection-edit",
      collection,
      document,
    });
  };

  const actions: Actions = {
    login: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "login") {
        throw error(404, "Login action is only valid on /admin/login");
      }

      if (!strictAccess) {
        throw redirect(303, adminPath);
      }

      const formData = await event.request.formData();
      const email = formField(formData, "email").trim();
      const password = formField(formData, "password");

      if (!email || !password) {
        return fail(400, { error: "Email and password are required." });
      }

      const response = await event.fetch(`${authBasePath}/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          callbackURL: adminPath,
        }),
      });

      if (!response.ok) {
        return fail(401, { error: "Invalid email or password." });
      }

      throw redirect(303, adminPath);
    },

    create: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "collection-create") {
        throw error(404, "Create action is only valid on collection create routes");
      }

      guardAdminRoute(event, route, strictAccess, adminPath);
      const collection = getCollectionBySlug(runelayer, route.slug);
      const query = adminQueryApi(strictAccess, withRequest, system, event);

      const formData = await event.request.formData();
      const data = Object.fromEntries(formData.entries()) as Record<string, unknown>;
      const document = await query.create(collection, data);

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    update: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "collection-edit") {
        throw error(404, "Update action is only valid on collection edit routes");
      }

      guardAdminRoute(event, route, strictAccess, adminPath);
      const collection = getCollectionBySlug(runelayer, route.slug);
      const query = adminQueryApi(strictAccess, withRequest, system, event);

      const formData = await event.request.formData();
      const data = Object.fromEntries(formData.entries()) as Record<string, unknown>;
      const id = typeof data.id === "string" ? data.id : route.id;
      delete data.id;

      const document = await query.update(collection, id, data);
      return {
        success: true,
        document: toSerializable(document),
      };
    },

    delete: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "collection-edit") {
        throw error(404, "Delete action is only valid on collection edit routes");
      }

      guardAdminRoute(event, route, strictAccess, adminPath);
      const collection = getCollectionBySlug(runelayer, route.slug);
      const query = adminQueryApi(strictAccess, withRequest, system, event);

      const formData = await event.request.formData();
      const formId = formData.get("id");
      const id = typeof formId === "string" && formId.length > 0 ? formId : route.id;
      const document = await query.remove(collection, id);

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    default: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "logout") {
        throw error(405, "Unsupported admin action");
      }

      if (strictAccess && getUser(event)) {
        await event.fetch(`${authBasePath}/sign-out`, { method: "POST" }).catch(() => null);
      }

      throw redirect(303, `${adminPath}/login`);
    },
  };

  return {
    handle: runelayer.handle as Handle,
    admin: {
      load,
      actions,
      Page: page,
    },
    withRequest,
    system,
  };
}
