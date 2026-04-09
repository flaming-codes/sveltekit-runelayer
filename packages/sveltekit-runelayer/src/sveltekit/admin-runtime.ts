import type { RequestEvent } from "@sveltejs/kit";
import type { RunelayerInstance } from "../plugin.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { GlobalConfig } from "../schema/globals.js";
import { getGlobalBySlug } from "./globals.js";
import { parseAdminRoute } from "./admin-routing.js";
import type { AdminRoute } from "./admin-routing.js";
import {
  countAdminUsers,
  getUser,
  normalizeUserRole,
  parseAuthErrorMessage,
  parseManagedUser,
} from "./admin-queries.js";
import { createAdminActions } from "./admin-actions.js";
import { authAdminPath, safeInt } from "./admin-runtime-utils.js";
import type {
  RunelayerAdminPageData,
  RunelayerAdminRuntime,
  RunelayerAppConfig,
  RunelayerManagedUserList,
  RunelayerManagedUser,
  RunelayerQueryApi,
} from "./types.js";
import { dispatchLoader } from "./runtime-loaders.js";
import type { LoaderContext } from "./runtime-loaders.js";

export interface CreateAdminRuntimeInput {
  config: RunelayerAppConfig;
  runelayer: RunelayerInstance;
  adminPath: string;
  withRequest: (eventOrRequest: RequestEvent | Request) => RunelayerQueryApi;
}

export function createAdminRuntime({
  config,
  runelayer,
  adminPath,
  withRequest,
}: CreateAdminRuntimeInput): RunelayerAdminRuntime {
  const { redirect, error } = config.kit;

  function getCollectionBySlug(
    runelayerInstance: RunelayerInstance,
    slug: string,
  ): CollectionConfig {
    const collection = runelayerInstance.collections.find((entry) => entry.slug === slug);
    if (!collection) {
      throw error(404, `Unknown collection: ${slug}`);
    }
    return collection;
  }

  function resolveGlobalBySlug(runelayerInstance: RunelayerInstance, slug: string): GlobalConfig {
    const global = getGlobalBySlug(runelayerInstance.globals, slug);
    if (!global) {
      throw error(404, `Unknown global: ${slug}`);
    }
    return global;
  }

  async function guardAdminRoute(
    event: RequestEvent,
    route: AdminRoute,
    adminPathname: string,
    adminExists: boolean,
  ): Promise<void> {
    const user = getUser(event);

    if (route.kind === "create-first-user") {
      if (adminExists) {
        if (user?.role === "admin") {
          throw redirect(303, adminPathname);
        }
        throw redirect(303, `${adminPathname}/login`);
      }
      return;
    }

    if (route.kind === "login") {
      if (!adminExists) {
        throw redirect(303, `${adminPathname}/create-first-user`);
      }
      if (user?.role === "admin") {
        throw redirect(303, adminPathname);
      }
      return;
    }

    if (!adminExists) {
      throw redirect(303, `${adminPathname}/create-first-user`);
    }

    if (!user) {
      throw redirect(303, `${adminPathname}/login`);
    }

    if (user.role !== "admin") {
      throw error(403, "Admin access required");
    }
  }

  const ui = {
    appName: config.admin?.ui?.appName ?? "Runelayer",
    productName: config.admin?.ui?.productName ?? "CMS",
    footerText: config.admin?.ui?.footerText ?? "Powered by Runelayer",
  };
  const authBasePath = config.auth.basePath ?? "/api/auth";

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

  return {
    load,
    actions,
  };
}
