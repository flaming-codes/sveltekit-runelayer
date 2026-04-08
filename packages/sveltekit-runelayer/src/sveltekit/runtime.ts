import type { Handle, RequestEvent } from "@sveltejs/kit";
import { defineConfig } from "../config.js";
import { createRunelayer } from "../plugin.js";
import type { RunelayerInstance } from "../plugin.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { GlobalConfig } from "../schema/globals.js";
import { getGlobalBySlug } from "./globals.js";
import { normalizeAdminPath, parseAdminRoute } from "./admin-routing.js";
import type { AdminRoute } from "./admin-routing.js";
import {
  countAdminUsers,
  createQueryApi,
  getUser,
  normalizeUserRole,
  parseAuthErrorMessage,
  parseManagedUser,
  toRequest,
} from "./admin-queries.js";
import { createAdminActions } from "./admin-actions.js";
import { authAdminPath, safeInt, systemRequest } from "./admin-runtime-utils.js";
import type {
  RunelayerAdminPageComponent,
  RunelayerAdminPageData,
  RunelayerApp,
  RunelayerAppConfig,
  RunelayerManagedUserList,
  RunelayerManagedUser,
  RunelayerQueryApi,
} from "./types.js";
import { buildHealthPayload } from "./health.js";
import { dispatchLoader } from "./runtime-loaders.js";
import type { LoaderContext } from "./runtime-loaders.js";

export function createRunelayerRuntime(
  config: RunelayerAppConfig,
  page: RunelayerAdminPageComponent,
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

  const fetchManagedUserList = async (event: RequestEvent): Promise<RunelayerManagedUserList> => {
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

    const response = await event.fetch(authAdminPath(authBasePath, "list-users", params), {
      method: "GET",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw error(response.status, parseAuthErrorMessage(payload, "Unable to load users."));
    }

    const record =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const usersRaw = Array.isArray(record.users) ? record.users : [];
    const users = usersRaw
      .map((entry) => parseManagedUser(entry))
      .filter(Boolean) as RunelayerManagedUser[];
    const total = typeof record.total === "number" ? record.total : users.length;
    return {
      users,
      total,
      limit,
      offset,
    };
  };

  const fetchManagedUser = async (
    event: RequestEvent,
    id: string,
  ): Promise<RunelayerManagedUser> => {
    const params = new URLSearchParams({ id });
    const response = await event.fetch(authAdminPath(authBasePath, "get-user", params), {
      method: "GET",
    });
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

  const loaderCtx: LoaderContext = {
    runelayer,
    adminPath,
    ui,
    kit: config.kit,
    getCollectionBySlug,
    resolveGlobalBySlug,
    withRequest,
    fetchManagedUserList,
    fetchManagedUser,
  };

  const load = async (event: RequestEvent): Promise<RunelayerAdminPageData> => {
    const route = parseAdminRoute(event.params.path);
    if (!route) {
      throw error(404, "Admin route not found");
    }

    // Health endpoint is public — no auth guard.
    if (route.kind !== "health") {
      const adminExists = (await countAdminUsers(runelayer)) > 0;
      await guardAdminRoute(event, route, adminPath, adminExists);
    }

    return dispatchLoader(loaderCtx, event, route);
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
  const apiBase = `/runelayer/api/`;

  const handle: Handle = async ({ event, resolve }) => {
    // Intercept /admin/health for JSON API consumers (CI/CD, monitoring).
    if (
      event.url.pathname === healthPath &&
      event.request.method === "GET" &&
      event.request.headers.get("accept")?.includes("application/json")
    ) {
      const health = await buildHealthPayload(runelayer);
      return new Response(JSON.stringify(health), {
        status: health.database ? 200 : 503,
        headers: { "content-type": "application/json" },
      });
    }

    return (runelayer.handle as Handle)({
      event,
      resolve: async (authedEvent) => {
        // Intercept /runelayer/api/{collectionSlug} for admin relationship field options.
        // This must run inside the shared auth boundary so event.locals is trusted.
        if (authedEvent.url.pathname.startsWith(apiBase) && authedEvent.request.method === "GET") {
          const user = getUser(authedEvent as RequestEvent);
          if (!user || user.role !== "admin") {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "content-type": "application/json" },
            });
          }
          const slug = authedEvent.url.pathname.slice(apiBase.length).split("/")[0];
          const collection = runelayer.collections.find((c) => c.slug === slug);
          if (!collection || !slug) {
            return new Response(JSON.stringify({ error: "Unknown collection" }), {
              status: 404,
              headers: { "content-type": "application/json" },
            });
          }
          const limitParam = authedEvent.url.searchParams.get("limit");
          const limit = Math.min(
            Number.isFinite(Number.parseInt(limitParam ?? "", 10))
              ? Number.parseInt(limitParam!, 10)
              : 100,
            200,
          );
          const api = withRequest(authedEvent as RequestEvent);
          const docs = await api.find(collection, { limit });
          const useAsTitle = collection.admin?.useAsTitle;
          return new Response(JSON.stringify({ docs, useAsTitle }), {
            status: 200,
            headers: { "content-type": "application/json", "cache-control": "private, no-store" },
          });
        }

        return resolve(authedEvent);
      },
    });
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
