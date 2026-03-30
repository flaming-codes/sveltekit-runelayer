import type { Handle, RequestEvent } from "@sveltejs/kit";
import type { Component } from "svelte";
import { defineConfig } from "../config.js";
import { createRunelayer } from "../plugin.js";
import type { RunelayerInstance } from "../plugin.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { GlobalConfig } from "../schema/globals.js";
import { getGlobalBySlug, readGlobalDocument } from "./globals.js";
import { toSerializable } from "./serializable.js";
import { normalizeAdminPath, parseAdminRoute } from "./admin-routing.js";
import type { AdminRoute } from "./admin-routing.js";
import {
  countAdminUsers,
  countDocuments,
  createQueryApi,
  getUser,
  systemRequest,
  toRequest,
  normalizeUserRole,
  parseAuthErrorMessage,
  parseManagedUser,
} from "./admin-queries.js";
import type { ManagedUser, ManagedUserList } from "./admin-queries.js";
import { createAdminActions } from "./admin-actions.js";
import type { RunelayerApp, RunelayerAppConfig, RunelayerQueryApi } from "./types.js";

export function createRunelayerRuntime(
  config: RunelayerAppConfig,
  page: Component<any>,
): RunelayerApp {
  const { redirect, error } = config.kit;

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

  const safeInt = (value: string | null, fallback: number, max?: number): number => {
    const parsed = Number.parseInt(value ?? "", 10);
    const clamped = Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
    return max ? Math.min(clamped, max) : clamped;
  };

  const fetchManagedUserList = async (event: RequestEvent): Promise<ManagedUserList> => {
    const page = safeInt(event.url.searchParams.get("page"), 1);
    const limit = safeInt(event.url.searchParams.get("limit"), 20, 100);
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

      const page = safeInt(event.url.searchParams.get("page"), 1);
      const limit = safeInt(event.url.searchParams.get("limit"), 20, 100);
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

  const actions = createAdminActions({
    kit: config.kit,
    runelayer,
    adminPath,
    authBasePath,
    getCollectionBySlug,
    resolveGlobalBySlug,
    guardAdminRoute,
    withRequest,
  });

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
