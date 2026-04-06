import type { RequestEvent } from "@sveltejs/kit";
import type { RunelayerInstance } from "../plugin.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { GlobalConfig } from "../schema/globals.js";
import type { AdminRoute } from "./admin-routing.js";
import type {
  RunelayerAdminBaseData,
  RunelayerAdminCollectionCreateData,
  RunelayerAdminCollectionEditData,
  RunelayerAdminCollectionListData,
  RunelayerAdminCreateFirstUserData,
  RunelayerAdminDashboardData,
  RunelayerAdminGlobalEditData,
  RunelayerAdminHealthData,
  RunelayerAdminLoginData,
  RunelayerAdminPageData,
  RunelayerAdminProfileData,
  RunelayerAdminResolvedUI,
  RunelayerAdminUsersCreateData,
  RunelayerAdminUsersEditData,
  RunelayerAdminUsersListData,
  RunelayerDocument,
  RunelayerManagedUser,
  RunelayerManagedUserList,
  RunelayerManagedUserRole,
  RunelayerQueryApi,
  SvelteKitUtils,
} from "./types.js";
import { countDocuments, getUser } from "./admin-queries.js";
import { readGlobalDocument, findGlobalVersions } from "./globals.js";
import { normalizeVersionConfig } from "../versions/config.js";
import { toSerializable } from "./serializable.js";
import { buildHealthPayload } from "./health.js";
import { safeInt } from "./admin-runtime-utils.js";

const USER_ROLES: RunelayerManagedUserRole[] = ["admin", "editor", "user"];

/** Common dependencies injected into every loader. */
export interface LoaderContext {
  runelayer: RunelayerInstance;
  adminPath: string;
  ui: RunelayerAdminResolvedUI;
  kit: SvelteKitUtils;
  getCollectionBySlug: (runelayer: RunelayerInstance, slug: string) => CollectionConfig;
  resolveGlobalBySlug: (runelayer: RunelayerInstance, slug: string) => GlobalConfig;
  withRequest: (eventOrRequest: RequestEvent | Request) => RunelayerQueryApi;
  fetchManagedUserList: (event: RequestEvent) => Promise<RunelayerManagedUserList>;
  fetchManagedUser: (event: RequestEvent, id: string) => Promise<RunelayerManagedUser>;
}

function baseData(ctx: LoaderContext, event: RequestEvent): RunelayerAdminBaseData {
  const user = getUser(event);
  return {
    basePath: ctx.adminPath,
    currentPath: event.url.pathname,
    ui: ctx.ui,
    collections: toSerializable(ctx.runelayer.collections),
    globals: toSerializable(ctx.runelayer.globals),
    user: user
      ? { id: user.id, email: user.email, role: user.role, name: user.name, image: user.image }
      : null,
  };
}

export async function loadHealth(
  ctx: LoaderContext,
  event: RequestEvent,
): Promise<RunelayerAdminHealthData> {
  const health = await buildHealthPayload(ctx.runelayer);
  return {
    basePath: ctx.adminPath,
    currentPath: event.url.pathname,
    ui: ctx.ui,
    collections: [],
    globals: [],
    user: null,
    view: "health",
    health,
  };
}

export function loadLogin(ctx: LoaderContext, event: RequestEvent): RunelayerAdminLoginData {
  return { ...baseData(ctx, event), view: "login" };
}

export function loadCreateFirstUser(
  ctx: LoaderContext,
  event: RequestEvent,
): RunelayerAdminCreateFirstUserData {
  return { ...baseData(ctx, event), view: "create-first-user" };
}

export function loadLogout(ctx: LoaderContext): never {
  throw ctx.kit.redirect(303, ctx.adminPath);
}

export function loadProfile(ctx: LoaderContext, event: RequestEvent): RunelayerAdminProfileData {
  return { ...baseData(ctx, event), view: "profile" };
}

export async function loadDashboard(
  ctx: LoaderContext,
  event: RequestEvent,
): Promise<RunelayerAdminDashboardData> {
  const dashboardCollections = await Promise.all(
    ctx.runelayer.collections.map(async (collection) => ({
      slug: collection.slug,
      label: collection.labels?.plural ?? collection.slug,
      count: await countDocuments(ctx.runelayer, collection.slug),
    })),
  );
  const dashboardGlobals = ctx.runelayer.globals.map((global) => ({
    slug: global.slug,
    label: global.label ?? global.slug,
  }));
  return { ...baseData(ctx, event), view: "dashboard", dashboardCollections, dashboardGlobals };
}

export async function loadUsersList(
  ctx: LoaderContext,
  event: RequestEvent,
): Promise<RunelayerAdminUsersListData> {
  const users = await ctx.fetchManagedUserList(event);
  const page = Math.max(1, Math.floor(users.offset / users.limit) + 1);
  const totalPages = Math.max(1, Math.ceil(users.total / users.limit));
  return toSerializable<RunelayerAdminUsersListData>({
    ...baseData(ctx, event),
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

export function loadUsersCreate(
  ctx: LoaderContext,
  event: RequestEvent,
): RunelayerAdminUsersCreateData {
  return toSerializable<RunelayerAdminUsersCreateData>({
    ...baseData(ctx, event),
    view: "users-create",
    roles: USER_ROLES,
  });
}

export async function loadUsersEdit(
  ctx: LoaderContext,
  event: RequestEvent,
  route: AdminRoute & { kind: "users-edit" },
): Promise<RunelayerAdminUsersEditData> {
  const managedUser = await ctx.fetchManagedUser(event, route.id);
  return toSerializable<RunelayerAdminUsersEditData>({
    ...baseData(ctx, event),
    view: "users-edit",
    managedUser,
    roles: USER_ROLES,
  });
}

export async function loadCollectionList(
  ctx: LoaderContext,
  event: RequestEvent,
  route: AdminRoute & { kind: "collection-list" },
): Promise<RunelayerAdminCollectionListData> {
  const collection = ctx.getCollectionBySlug(ctx.runelayer, route.slug);
  const query = ctx.withRequest(event);
  const page = safeInt(event.url.searchParams.get("page"), 1);
  const limit = safeInt(event.url.searchParams.get("limit"), 20, 100);
  const offset = (page - 1) * limit;
  // Admin list shows all documents (drafts included) for versioned collections
  const docs = await query.find(collection, { limit, offset, draft: true });
  const totalDocs = await countDocuments(ctx.runelayer, collection.slug);
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
  return toSerializable<RunelayerAdminCollectionListData>({
    ...baseData(ctx, event),
    view: "collection-list",
    collection,
    docs,
    page,
    limit,
    totalPages,
    totalDocs,
  });
}

export function loadCollectionCreate(
  ctx: LoaderContext,
  event: RequestEvent,
  route: AdminRoute & { kind: "collection-create" },
): RunelayerAdminCollectionCreateData {
  const collection = ctx.getCollectionBySlug(ctx.runelayer, route.slug);
  return toSerializable<RunelayerAdminCollectionCreateData>({
    ...baseData(ctx, event),
    view: "collection-create",
    collection,
  });
}

export async function loadCollectionEdit(
  ctx: LoaderContext,
  event: RequestEvent,
  route: AdminRoute & { kind: "collection-edit" },
): Promise<RunelayerAdminCollectionEditData> {
  const collection = ctx.getCollectionBySlug(ctx.runelayer, route.slug);
  const query = ctx.withRequest(event);
  const documentRaw = await query.findOne(collection, route.id);
  if (!documentRaw || typeof documentRaw !== "object") {
    throw ctx.kit.error(404, `Document not found: ${route.id}`);
  }
  const document = documentRaw as RunelayerDocument;

  // Load version history for versioned collections
  const vc = normalizeVersionConfig(collection.versions);
  const versions = vc
    ? await query.findVersionHistory(collection, route.id, { limit: 20 })
    : undefined;

  return toSerializable<RunelayerAdminCollectionEditData>({
    ...baseData(ctx, event),
    view: "collection-edit",
    collection,
    document,
    versions,
  });
}

export async function loadGlobalEdit(
  ctx: LoaderContext,
  event: RequestEvent,
  route: AdminRoute & { kind: "global-edit" },
): Promise<RunelayerAdminGlobalEditData> {
  const global = ctx.resolveGlobalBySlug(ctx.runelayer, route.slug);
  const document = await readGlobalDocument(ctx.runelayer, global, event.request);

  // Load version history for versioned globals
  const vc = normalizeVersionConfig(global.versions);
  let versions;
  if (vc) {
    versions = await findGlobalVersions(ctx.runelayer, global, event.request, { limit: 20 });
  }

  return toSerializable<RunelayerAdminGlobalEditData>({
    ...baseData(ctx, event),
    view: "global-edit",
    global,
    document,
    versions,
  });
}

/**
 * Dispatch map: given a parsed AdminRoute, select the appropriate loader.
 */
export async function dispatchLoader(
  ctx: LoaderContext,
  event: RequestEvent,
  route: AdminRoute,
): Promise<RunelayerAdminPageData> {
  switch (route.kind) {
    case "health":
      return loadHealth(ctx, event);
    case "login":
      return loadLogin(ctx, event);
    case "create-first-user":
      return loadCreateFirstUser(ctx, event);
    case "logout":
      return loadLogout(ctx);
    case "profile":
      return loadProfile(ctx, event);
    case "dashboard":
      return loadDashboard(ctx, event);
    case "users-list":
      return loadUsersList(ctx, event);
    case "users-create":
      return loadUsersCreate(ctx, event);
    case "users-edit":
      return loadUsersEdit(ctx, event, route);
    case "collection-list":
      return loadCollectionList(ctx, event, route);
    case "collection-create":
      return loadCollectionCreate(ctx, event, route);
    case "collection-edit":
      return loadCollectionEdit(ctx, event, route);
    case "global-edit":
      return loadGlobalEdit(ctx, event, route);
  }
}
