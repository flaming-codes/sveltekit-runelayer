import type { Actions, Handle, RequestEvent } from "@sveltejs/kit";
import type { Component } from "svelte";
import { defineConfig } from "../config.js";
import { createRunelayer } from "../plugin.js";
import type { RunelayerInstance } from "../plugin.js";
import { create, find, findOne, remove, update } from "../query/index.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { FindArgs } from "../query/types.js";
import type { GlobalConfig } from "../schema/globals.js";
import { getGlobalBySlug, readGlobalDocument, updateGlobalDocument } from "./globals.js";
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
  | { kind: "create-first-user" }
  | { kind: "logout" }
  | { kind: "profile" }
  | { kind: "health" }
  | { kind: "users-list" }
  | { kind: "users-create" }
  | { kind: "users-edit"; id: string }
  | { kind: "collection-list"; slug: string }
  | { kind: "collection-create"; slug: string }
  | { kind: "collection-edit"; slug: string; id: string }
  | { kind: "global-edit"; slug: string };

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
  if (segments.length === 1 && segments[0] === "create-first-user") {
    return { kind: "create-first-user" };
  }
  if (segments.length === 1 && segments[0] === "logout") return { kind: "logout" };
  if (segments.length === 1 && segments[0] === "profile") return { kind: "profile" };
  if (segments.length === 1 && segments[0] === "health") return { kind: "health" };
  if (segments.length === 1 && segments[0] === "users") return { kind: "users-list" };
  if (segments.length === 2 && segments[0] === "users" && segments[1] === "create") {
    return { kind: "users-create" };
  }
  if (segments.length === 2 && segments[0] === "users") {
    return { kind: "users-edit", id: segments[1] };
  }

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

  if (segments[0] === "globals" && segments.length === 2) {
    return { kind: "global-edit", slug: segments[1] };
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

async function countUsers(runelayer: RunelayerInstance): Promise<number> {
  const result = await runelayer.database.client.execute(`SELECT COUNT(*) AS count FROM "user"`);
  return getCountValue(result.rows[0]);
}

async function promoteSingleUserToAdmin(runelayer: RunelayerInstance): Promise<number> {
  const totalUsers = await countUsers(runelayer);
  if (totalUsers !== 1) {
    return 0;
  }

  await runelayer.database.client.execute(`
    UPDATE "user"
    SET role = 'admin'
    WHERE id IN (
      SELECT id
      FROM "user"
      ORDER BY createdAt ASC
      LIMIT 1
    )
  `);

  const result = await runelayer.database.client.execute(
    `SELECT COUNT(*) AS count FROM "user" WHERE (',' || LOWER(COALESCE(role, '')) || ',') LIKE '%,admin,%'`,
  );
  return getCountValue(result.rows[0]);
}

async function countAdminUsers(runelayer: RunelayerInstance): Promise<number> {
  try {
    const result = await runelayer.database.client.execute(
      `SELECT COUNT(*) AS count FROM "user" WHERE (',' || LOWER(COALESCE(role, '')) || ',') LIKE '%,admin,%'`,
    );
    const adminCount = getCountValue(result.rows[0]);
    if (adminCount > 0) {
      return adminCount;
    }

    // Compatibility path: early first-user bootstrap could create exactly one non-admin user.
    return await promoteSingleUserToAdmin(runelayer);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // If Better Auth tables are not migrated yet, treat this as "no admins".
    if (message.toLowerCase().includes(`no such table`) && message.toLowerCase().includes(`user`)) {
      return 0;
    }
    throw error;
  }
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

interface AdminUser {
  id: string;
  email: string;
  role: string;
  name: string;
  image: string | null;
}

function getUser(event: RequestEvent): AdminUser | null {
  const user = (event.locals as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;

  const record = user as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  const email = typeof record.email === "string" ? record.email : "";
  const role = typeof record.role === "string" ? record.role : "user";
  const name = typeof record.name === "string" ? record.name : "";
  const image = typeof record.image === "string" ? record.image : null;
  return { id, email, role, name, image };
}

function formField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

interface ManagedUser {
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

interface ManagedUserList {
  users: ManagedUser[];
  total: number;
  limit: number;
  offset: number;
}

const SUPPORTED_USER_ROLES = new Set(["admin", "editor", "user"]);

function normalizeUserRole(input: string): string {
  const role = input.trim().toLowerCase();
  return SUPPORTED_USER_ROLES.has(role) ? role : "user";
}

function parseAuthErrorMessage(payload: unknown, fallback: string): string {
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

function parseManagedUser(payload: unknown): ManagedUser | null {
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

export function createRunelayerRuntime(
  config: RunelayerAppConfig,
  page: Component<any>,
): RunelayerApp {
  const { redirect, error, fail } = config.kit;

  function getCollectionBySlug(runelayer: RunelayerInstance, slug: string): CollectionConfig {
    const collection = runelayer.collections.find((entry) => entry.slug === slug);
    if (!collection) {
      throw error(404, `Unknown collection: ${slug}`);
    }
    return collection;
  }

  function resolveGlobalBySlug(runelayer: RunelayerInstance, slug: string): GlobalConfig {
    const global = getGlobalBySlug(runelayer.globals, slug);
    if (!global) {
      throw error(404, `Unknown global: ${slug}`);
    }
    return global;
  }

  async function guardAdminRoute(
    event: RequestEvent,
    route: AdminRoute,
    adminPath: string,
    adminExists: boolean,
  ): Promise<void> {
    const user = getUser(event);

    if (route.kind === "create-first-user") {
      if (adminExists) {
        if (user?.role === "admin") {
          throw redirect(303, adminPath);
        }
        throw redirect(303, `${adminPath}/login`);
      }
      return;
    }

    if (route.kind === "login") {
      if (!adminExists) {
        throw redirect(303, `${adminPath}/create-first-user`);
      }
      if (user?.role === "admin") {
        throw redirect(303, adminPath);
      }
      return;
    }

    if (!adminExists) {
      throw redirect(303, `${adminPath}/create-first-user`);
    }

    if (!user) {
      throw redirect(303, `${adminPath}/login`);
    }

    if (user.role !== "admin") {
      throw error(403, "Admin access required");
    }
  }
  const adminPath = normalizeAdminPath(config.admin?.path ?? "/admin");
  const ui = {
    appName: config.admin?.ui?.appName ?? "Runelayer",
    productName: config.admin?.ui?.productName ?? "CMS",
    footerText: config.admin?.ui?.footerText ?? "Powered by Runelayer",
  };
  const authBasePath = config.auth.basePath ?? "/api/auth";

  const { admin: _admin, kit: _kit, ...runelayerConfig } = config;
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

  const authAdminPath = (suffix: string, searchParams?: URLSearchParams): string => {
    const query = searchParams?.toString();
    const path = `${authBasePath}/admin/${suffix}`;
    return query && query.length > 0 ? `${path}?${query}` : path;
  };

  const callAuthAdmin = async (
    event: RequestEvent,
    suffix: string,
    init?: RequestInit,
  ): Promise<{
    ok: boolean;
    status: number;
    payload: unknown;
  }> => {
    const headers = new Headers(init?.headers);
    headers.set("content-type", "application/json");
    const response = await event.fetch(authAdminPath(suffix), {
      ...init,
      headers,
    });
    const payload = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  };

  const fetchManagedUserList = async (event: RequestEvent): Promise<ManagedUserList> => {
    const page = Math.max(1, Number(event.url.searchParams.get("page") ?? "1"));
    const limit = Math.max(1, Number(event.url.searchParams.get("limit") ?? "20"));
    const offset = (page - 1) * limit;
    const role = normalizeUserRole(event.url.searchParams.get("role") ?? "");
    const search = (event.url.searchParams.get("q") ?? "").trim();

    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    params.set("sortBy", "createdAt");
    params.set("sortDirection", "desc");
    if (event.url.searchParams.get("role")) {
      params.set("filterField", "role");
      params.set("filterOperator", "contains");
      params.set("filterValue", role);
    }
    if (search.length > 0) {
      params.set("searchValue", search);
      params.set("searchField", search.includes("@") ? "email" : "name");
      params.set("searchOperator", "contains");
    }

    const response = await event.fetch(authAdminPath("list-users", params), {
      method: "GET",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw error(response.status, parseAuthErrorMessage(payload, "Unable to load users."));
    }

    const record =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const usersRaw = Array.isArray(record.users) ? record.users : [];
    const users = usersRaw.map((entry) => parseManagedUser(entry)).filter(Boolean) as ManagedUser[];
    const total = typeof record.total === "number" ? record.total : users.length;
    return {
      users,
      total,
      limit,
      offset,
    };
  };

  const fetchManagedUser = async (event: RequestEvent, id: string): Promise<ManagedUser> => {
    const params = new URLSearchParams({ id });
    const response = await event.fetch(authAdminPath("get-user", params), { method: "GET" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw error(response.status, parseAuthErrorMessage(payload, "Unable to load user."));
    }

    const user = parseManagedUser(payload);
    if (!user) {
      throw error(500, "Auth provider returned an invalid user payload.");
    }
    return user;
  };

  const load = async (event: RequestEvent): Promise<Record<string, unknown>> => {
    const route = parseAdminRoute(event.params.path);
    if (!route) {
      throw error(404, "Admin route not found");
    }

    // Health endpoint is public — no auth guard.
    if (route.kind === "health") {
      let dbOk = false;
      try {
        await runelayer.database.client.execute("SELECT 1");
        dbOk = true;
      } catch {
        // database unreachable
      }
      const status = dbOk ? "ok" : "degraded";
      return {
        basePath: adminPath,
        currentPath: event.url.pathname,
        ui,
        collections: [],
        globals: [],
        user: null,
        view: "health",
        health: {
          status,
          database: dbOk,
          collections: runelayer.collections.length,
          globals: runelayer.globals.length,
          timestamp: new Date().toISOString(),
        },
      };
    }

    const adminExists = (await countAdminUsers(runelayer)) > 0;
    await guardAdminRoute(event, route, adminPath, adminExists);

    const user = getUser(event);
    const baseData = {
      basePath: adminPath,
      currentPath: event.url.pathname,
      ui,
      collections: toSerializable(runelayer.collections),
      globals: toSerializable(runelayer.globals),
      user: user
        ? { id: user.id, email: user.email, role: user.role, name: user.name, image: user.image }
        : null,
    };

    if (route.kind === "login") {
      return {
        ...baseData,
        view: "login",
      };
    }

    if (route.kind === "create-first-user") {
      return {
        ...baseData,
        view: "create-first-user",
      };
    }

    if (route.kind === "logout") {
      throw redirect(303, adminPath);
    }

    if (route.kind === "profile") {
      return {
        ...baseData,
        view: "profile",
      };
    }

    if (route.kind === "dashboard") {
      const dashboardCollections = await Promise.all(
        runelayer.collections.map(async (collection) => ({
          slug: collection.slug,
          label: collection.labels?.plural ?? collection.slug,
          count: await countDocuments(runelayer, collection.slug),
        })),
      );
      const dashboardGlobals = runelayer.globals.map((global) => ({
        slug: global.slug,
        label: global.label ?? global.slug,
      }));

      return {
        ...baseData,
        view: "dashboard",
        dashboardCollections,
        dashboardGlobals,
      };
    }

    if (route.kind === "users-list") {
      const users = await fetchManagedUserList(event);
      const page = Math.max(1, Math.floor(users.offset / users.limit) + 1);
      const totalPages = Math.max(1, Math.ceil(users.total / users.limit));
      return toSerializable({
        ...baseData,
        view: "users-list",
        users: users.users,
        totalUsers: users.total,
        page,
        limit: users.limit,
        totalPages,
        searchTerm: event.url.searchParams.get("q") ?? "",
        roleFilter: event.url.searchParams.get("role") ?? "",
      });
    }

    if (route.kind === "users-create") {
      return toSerializable({
        ...baseData,
        view: "users-create",
        roles: ["admin", "editor", "user"],
      });
    }

    if (route.kind === "users-edit") {
      const managedUser = await fetchManagedUser(event, route.id);
      return toSerializable({
        ...baseData,
        view: "users-edit",
        managedUser,
        roles: ["admin", "editor", "user"],
      });
    }

    if (route.kind === "collection-list") {
      const collection = getCollectionBySlug(runelayer, route.slug);
      const query = withRequest(event);

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
        limit,
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

    if (route.kind === "global-edit") {
      const global = resolveGlobalBySlug(runelayer, route.slug);
      const document = await readGlobalDocument(runelayer, global, event.request);

      return toSerializable({
        ...baseData,
        view: "global-edit",
        global,
        document,
      });
    }

    const collection = getCollectionBySlug(runelayer, route.slug);
    const query = withRequest(event);
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

      if ((await countAdminUsers(runelayer)) === 0) {
        throw redirect(303, `${adminPath}/create-first-user`);
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

    createFirstUser: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "create-first-user") {
        throw error(404, "Create-first-user action is only valid on /admin/create-first-user");
      }

      if ((await countAdminUsers(runelayer)) > 0) {
        throw redirect(303, `${adminPath}/login`);
      }

      const formData = await event.request.formData();
      const name = formField(formData, "name").trim();
      const email = formField(formData, "email").trim();
      const password = formField(formData, "password");

      if (!name || !email || !password) {
        return fail(400, { error: "Name, email, and password are required." });
      }

      const response = await event.fetch(`${authBasePath}/sign-up/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: "admin",
          callbackURL: adminPath,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : "Unable to create the first admin user.";

        return fail(400, { error: message });
      }

      // Ensure the bootstrap account is elevated to admin, even if the auth sign-up endpoint
      // ignores custom role input.
      await runelayer.database.client.execute({
        sql: `UPDATE "user" SET role = 'admin' WHERE LOWER(email) = LOWER(?)`,
        args: [email],
      });

      throw redirect(303, adminPath);
    },

    create: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "collection-create") {
        throw error(404, "Create action is only valid on collection create routes");
      }

      const adminExists = (await countAdminUsers(runelayer)) > 0;
      await guardAdminRoute(event, route, adminPath, adminExists);
      const collection = getCollectionBySlug(runelayer, route.slug);
      const query = withRequest(event);

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
      if (!route || (route.kind !== "collection-edit" && route.kind !== "global-edit")) {
        throw error(404, "Update action is only valid on collection/global edit routes");
      }

      const adminExists = (await countAdminUsers(runelayer)) > 0;
      await guardAdminRoute(event, route, adminPath, adminExists);
      const formData = await event.request.formData();
      const data = Object.fromEntries(formData.entries()) as Record<string, unknown>;

      let document: unknown;
      if (route.kind === "global-edit") {
        const global = resolveGlobalBySlug(runelayer, route.slug);
        document = await updateGlobalDocument(runelayer, global, event.request, data);
      } else {
        const collection = getCollectionBySlug(runelayer, route.slug);
        const query = withRequest(event);
        const id = typeof data.id === "string" ? data.id : route.id;
        delete data.id;
        document = await query.update(collection, id, data);
      }

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

      const adminExists = (await countAdminUsers(runelayer)) > 0;
      await guardAdminRoute(event, route, adminPath, adminExists);
      const collection = getCollectionBySlug(runelayer, route.slug);
      const query = withRequest(event);

      const formData = await event.request.formData();
      const formId = formData.get("id");
      const id = typeof formId === "string" && formId.length > 0 ? formId : route.id;
      const document = await query.remove(collection, id);

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    createUser: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "users-create") {
        throw error(404, "Create-user action is only valid on /admin/users/create");
      }

      const adminExists = (await countAdminUsers(runelayer)) > 0;
      await guardAdminRoute(event, route, adminPath, adminExists);
      const formData = await event.request.formData();
      const name = formField(formData, "name").trim();
      const email = formField(formData, "email").trim().toLowerCase();
      const role = normalizeUserRole(formField(formData, "role"));
      const password = formField(formData, "password");

      if (!name || !email || !password) {
        return fail(400, { error: "Name, email, and password are required." });
      }

      const result = await callAuthAdmin(event, "create-user", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          role,
          password,
        }),
      });

      if (!result.ok) {
        return fail(result.status, {
          error: parseAuthErrorMessage(result.payload, "Unable to create user."),
        });
      }

      const payloadRecord =
        result.payload && typeof result.payload === "object"
          ? (result.payload as Record<string, unknown>)
          : null;
      const createdUser = parseManagedUser(payloadRecord?.user);
      if (!createdUser) {
        return fail(500, { error: "Auth provider returned an invalid user payload." });
      }

      throw redirect(303, `${adminPath}/users/${createdUser.id}`);
    },

    updateUser: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "users-edit") {
        throw error(404, "Update-user action is only valid on /admin/users/:id");
      }

      const adminExists = (await countAdminUsers(runelayer)) > 0;
      await guardAdminRoute(event, route, adminPath, adminExists);
      const formData = await event.request.formData();
      const name = formField(formData, "name").trim();
      const email = formField(formData, "email").trim().toLowerCase();
      const role = normalizeUserRole(formField(formData, "role"));
      const password = formField(formData, "password");

      if (!name || !email) {
        return fail(400, { error: "Name and email are required." });
      }

      const updateResult = await callAuthAdmin(event, "update-user", {
        method: "POST",
        body: JSON.stringify({
          userId: route.id,
          data: {
            name,
            email,
            role,
          },
        }),
      });

      if (!updateResult.ok) {
        return fail(updateResult.status, {
          error: parseAuthErrorMessage(updateResult.payload, "Unable to update user."),
        });
      }

      if (password.length > 0) {
        const passwordResult = await callAuthAdmin(event, "set-user-password", {
          method: "POST",
          body: JSON.stringify({
            userId: route.id,
            newPassword: password,
          }),
        });

        if (!passwordResult.ok) {
          return fail(passwordResult.status, {
            error: parseAuthErrorMessage(passwordResult.payload, "Unable to set user password."),
          });
        }
      }

      const updatedUser = parseManagedUser(updateResult.payload);
      return {
        success: true,
        user: toSerializable(updatedUser),
      };
    },

    deleteUser: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "users-edit") {
        throw error(404, "Delete-user action is only valid on /admin/users/:id");
      }

      const adminExists = (await countAdminUsers(runelayer)) > 0;
      await guardAdminRoute(event, route, adminPath, adminExists);
      const currentUser = getUser(event);
      if (currentUser?.id === route.id) {
        return fail(400, { error: "You cannot delete your own account." });
      }

      const targetUser = await fetchManagedUser(event, route.id);
      if (targetUser.role === "admin" && (await countAdminUsers(runelayer)) <= 1) {
        return fail(400, { error: "At least one admin account must remain." });
      }

      const removeResult = await callAuthAdmin(event, "remove-user", {
        method: "POST",
        body: JSON.stringify({ userId: route.id }),
      });

      if (!removeResult.ok) {
        return fail(removeResult.status, {
          error: parseAuthErrorMessage(removeResult.payload, "Unable to delete user."),
        });
      }

      throw redirect(303, `${adminPath}/users`);
    },

    logout: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "logout") {
        throw error(405, "Unsupported admin action");
      }

      if (getUser(event)) {
        await event.fetch(`${authBasePath}/sign-out`, { method: "POST" }).catch(() => null);
      }

      throw redirect(303, `${adminPath}/login`);
    },
  };

  const healthPath = `${adminPath}/health`;

  const handle: Handle = async ({ event, resolve }) => {
    // Intercept /admin/health for JSON API consumers (CI/CD, monitoring).
    if (
      event.url.pathname === healthPath &&
      event.request.method === "GET" &&
      event.request.headers.get("accept")?.includes("application/json")
    ) {
      let dbOk = false;
      try {
        await runelayer.database.client.execute("SELECT 1");
        dbOk = true;
      } catch {
        // database unreachable
      }
      const status = dbOk ? "ok" : "degraded";
      return new Response(
        JSON.stringify({
          status,
          database: dbOk,
          collections: runelayer.collections.length,
          globals: runelayer.globals.length,
          timestamp: new Date().toISOString(),
        }),
        {
          status: dbOk ? 200 : 503,
          headers: { "content-type": "application/json" },
        },
      );
    }

    return (runelayer.handle as Handle)({ event, resolve });
  };

  return {
    handle,
    admin: {
      load,
      actions,
      Page: page,
    },
    withRequest,
    system,
  };
}
