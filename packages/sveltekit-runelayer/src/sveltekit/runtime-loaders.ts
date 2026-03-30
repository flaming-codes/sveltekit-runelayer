import type { RequestEvent } from "@sveltejs/kit";
import type { RunelayerInstance } from "../plugin.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { GlobalConfig } from "../schema/globals.js";
import type { AdminRoute } from "./admin-routing.js";
import type { ManagedUser, ManagedUserList } from "./admin-queries.js";
import type { RunelayerQueryApi, SvelteKitUtils } from "./types.js";
import type { HealthPayload } from "./health.js";
import { countDocuments, getUser } from "./admin-queries.js";
import { readGlobalDocument } from "./globals.js";
import { toSerializable } from "./serializable.js";
import { buildHealthPayload } from "./health.js";

/** UI config resolved from RunelayerAppConfig. */
export interface ResolvedUI {
  appName: string;
  productName: string;
  footerText: string;
}

/** Common dependencies injected into every loader. */
export interface LoaderContext {
  runelayer: RunelayerInstance;
  adminPath: string;
  ui: ResolvedUI;
  kit: SvelteKitUtils;
  getCollectionBySlug: (runelayer: RunelayerInstance, slug: string) => CollectionConfig;
  resolveGlobalBySlug: (runelayer: RunelayerInstance, slug: string) => GlobalConfig;
  withRequest: (eventOrRequest: RequestEvent | Request) => RunelayerQueryApi;
  fetchManagedUserList: (event: RequestEvent) => Promise<ManagedUserList>;
  fetchManagedUser: (event: RequestEvent, id: string) => Promise<ManagedUser>;
}

function baseData(ctx: LoaderContext, event: RequestEvent) {
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
): Promise<Record<string, unknown>> {
  const health: HealthPayload = await buildHealthPayload(ctx.runelayer);
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

export function loadLogin(ctx: LoaderContext, event: RequestEvent): Record<string, unknown> {
  return { ...baseData(ctx, event), view: "login" };
}

export function loadCreateFirstUser(
  ctx: LoaderContext,
  event: RequestEvent,
): Record<string, unknown> {
  return { ...baseData(ctx, event), view: "create-first-user" };
}

export function loadLogout(ctx: LoaderContext): never {
  throw ctx.kit.redirect(303, ctx.adminPath);
}

export function loadProfile(ctx: LoaderContext, event: RequestEvent): Record<string, unknown> {
  return { ...baseData(ctx, event), view: "profile" };
}

export async function loadDashboard(
  ctx: LoaderContext,
  event: RequestEvent,
): Promise<Record<string, unknown>> {
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
): Promise<Record<string, unknown>> {
  const users = await ctx.fetchManagedUserList(event);
  const page = Math.max(1, Math.floor(users.offset / users.limit) + 1);
  const totalPages = Math.max(1, Math.ceil(users.total / users.limit));
  return toSerializable({
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

export function loadUsersCreate(ctx: LoaderContext, event: RequestEvent): Record<string, unknown> {
  return toSerializable({
    ...baseData(ctx, event),
    view: "users-create",
    roles: ["admin", "editor", "user"],
  });
}

export async function loadUsersEdit(
  ctx: LoaderContext,
  event: RequestEvent,
  route: AdminRoute & { kind: "users-edit" },
): Promise<Record<string, unknown>> {
  const managedUser = await ctx.fetchManagedUser(event, route.id);
  return toSerializable({
    ...baseData(ctx, event),
    view: "users-edit",
    managedUser,
    roles: ["admin", "editor", "user"],
  });
}

function safeInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  const clamped = Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
  return max ? Math.min(clamped, max) : clamped;
}

export async function loadCollectionList(
  ctx: LoaderContext,
  event: RequestEvent,
  route: AdminRoute & { kind: "collection-list" },
): Promise<Record<string, unknown>> {
  const collection = ctx.getCollectionBySlug(ctx.runelayer, route.slug);
  const query = ctx.withRequest(event);
  const page = safeInt(event.url.searchParams.get("page"), 1);
  const limit = safeInt(event.url.searchParams.get("limit"), 20, 100);
  const offset = (page - 1) * limit;
  const docs = await query.find(collection, { limit, offset });
  const totalDocs = await countDocuments(ctx.runelayer, collection.slug);
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
  return toSerializable({
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
): Record<string, unknown> {
  const collection = ctx.getCollectionBySlug(ctx.runelayer, route.slug);
  return toSerializable({
    ...baseData(ctx, event),
    view: "collection-create",
    collection,
  });
}

export async function loadCollectionEdit(
  ctx: LoaderContext,
  event: RequestEvent,
  route: AdminRoute & { kind: "collection-edit" },
): Promise<Record<string, unknown>> {
  const collection = ctx.getCollectionBySlug(ctx.runelayer, route.slug);
  const query = ctx.withRequest(event);
  const document = await query.findOne(collection, route.id);
  if (!document) {
    throw ctx.kit.error(404, `Document not found: ${route.id}`);
  }
  return toSerializable({
    ...baseData(ctx, event),
    view: "collection-edit",
    collection,
    document,
  });
}

export async function loadGlobalEdit(
  ctx: LoaderContext,
  event: RequestEvent,
  route: AdminRoute & { kind: "global-edit" },
): Promise<Record<string, unknown>> {
  const global = ctx.resolveGlobalBySlug(ctx.runelayer, route.slug);
  const document = await readGlobalDocument(ctx.runelayer, global, event.request);
  return toSerializable({
    ...baseData(ctx, event),
    view: "global-edit",
    global,
    document,
  });
}

/**
 * Dispatch map: given a parsed AdminRoute, select the appropriate loader.
 */
export async function dispatchLoader(
  ctx: LoaderContext,
  event: RequestEvent,
  route: AdminRoute,
): Promise<Record<string, unknown>> {
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
