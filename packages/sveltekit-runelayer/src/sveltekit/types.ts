import type { Actions, Handle, RequestEvent } from "@sveltejs/kit";
import type { Component } from "svelte";
import type { RunelayerConfig } from "../config.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { GlobalConfig } from "../schema/globals.js";
import type { FindArgs } from "../query/types.js";
import type { HealthPayload } from "./health.js";

export type CollectionInput = string | CollectionConfig;

/**
 * SvelteKit utility functions injected from the host application.
 *
 * These must come from the host's `@sveltejs/kit` import so that thrown
 * `Redirect` / `HttpError` instances pass `instanceof` checks in the
 * SvelteKit runtime. A library that bundles its own copy of `@sveltejs/kit`
 * creates distinct classes that the runtime does not recognise.
 */
export interface SvelteKitUtils {
  redirect: (status: number, location: string | URL) => never;
  error: (status: number, body?: string | { message: string }) => never;
  fail: <T extends Record<string, unknown>>(status: number, data?: T) => any;
}

export interface RunelayerAdminUIConfig {
  /** Organization or product family label in the shell header. @default "Runelayer" */
  appName?: string;
  /** Product label in the shell header. @default "CMS" */
  productName?: string;
  /** Footer copy rendered in the admin shell. @default "Powered by Runelayer" */
  footerText?: string;
}

export interface RunelayerAdminConfig {
  /** Mount path for admin pages. @default "/admin" */
  path?: string;
  /** Package-owned admin UI options */
  ui?: RunelayerAdminUIConfig;
}

export interface RunelayerAppConfig extends Omit<RunelayerConfig, "adminPath"> {
  admin?: RunelayerAdminConfig;
  /**
   * SvelteKit utility functions (`redirect`, `error`, `fail`) from the host app.
   *
   * Required so that thrown Redirect/HttpError objects are recognised by the
   * SvelteKit runtime. Pass them straight from your `@sveltejs/kit` import:
   *
   * ```ts
   * import { redirect, error, fail } from "@sveltejs/kit";
   * createRunelayerApp({ kit: { redirect, error, fail }, ... });
   * ```
   */
  kit: SvelteKitUtils;
}

export type RunelayerDocument = Record<string, unknown>;

export interface VersionEntry {
  id: string;
  _version: number;
  _status: "draft" | "published";
  createdAt: string;
  _createdBy?: string;
}
export type RunelayerManagedUserRole = "admin" | "editor" | "user";

export interface RunelayerAdminUser {
  id: string;
  email: string;
  role: string;
  name: string;
  image: string | null;
}

export interface RunelayerManagedUser {
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

export interface RunelayerManagedUserList {
  users: RunelayerManagedUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface RunelayerAdminResolvedUI {
  appName: string;
  productName: string;
  footerText: string;
}

export interface RunelayerAdminBaseData {
  [key: string]: unknown;
  basePath: string;
  currentPath: string;
  ui: RunelayerAdminResolvedUI;
  collections: CollectionConfig[];
  globals: GlobalConfig[];
  user: RunelayerAdminUser | null;
}

export interface RunelayerAdminLoginData extends RunelayerAdminBaseData {
  view: "login";
}

export interface RunelayerAdminCreateFirstUserData extends RunelayerAdminBaseData {
  view: "create-first-user";
}

export interface RunelayerAdminProfileData extends RunelayerAdminBaseData {
  view: "profile";
}

export interface RunelayerAdminHealthData extends RunelayerAdminBaseData {
  view: "health";
  health: HealthPayload;
}

export interface RunelayerAdminDashboardData extends RunelayerAdminBaseData {
  view: "dashboard";
  dashboardCollections: Array<{ slug: string; label: string; count: number }>;
  dashboardGlobals: Array<{ slug: string; label: string }>;
}

export interface RunelayerAdminUsersListData extends RunelayerAdminBaseData {
  view: "users-list";
  users: RunelayerManagedUser[];
  totalUsers: number;
  page: number;
  limit: number;
  totalPages: number;
  searchTerm: string;
  roleFilter: string;
}

export interface RunelayerAdminUsersCreateData extends RunelayerAdminBaseData {
  view: "users-create";
  roles: RunelayerManagedUserRole[];
}

export interface RunelayerAdminUsersEditData extends RunelayerAdminBaseData {
  view: "users-edit";
  managedUser: RunelayerManagedUser;
  roles: RunelayerManagedUserRole[];
}

export interface RunelayerAdminCollectionListData extends RunelayerAdminBaseData {
  view: "collection-list";
  collection: CollectionConfig;
  docs: RunelayerDocument[];
  page: number;
  limit: number;
  totalPages: number;
  totalDocs: number;
}

export interface RunelayerAdminCollectionCreateData extends RunelayerAdminBaseData {
  view: "collection-create";
  collection: CollectionConfig;
}

export interface RunelayerAdminCollectionEditData extends RunelayerAdminBaseData {
  view: "collection-edit";
  collection: CollectionConfig;
  document: RunelayerDocument;
  versions?: VersionEntry[];
}

export interface RunelayerAdminGlobalEditData extends RunelayerAdminBaseData {
  view: "global-edit";
  global: GlobalConfig;
  document: RunelayerDocument;
  versions?: VersionEntry[];
}

export type RunelayerAdminPageData =
  | RunelayerAdminLoginData
  | RunelayerAdminCreateFirstUserData
  | RunelayerAdminProfileData
  | RunelayerAdminHealthData
  | RunelayerAdminDashboardData
  | RunelayerAdminUsersListData
  | RunelayerAdminUsersCreateData
  | RunelayerAdminUsersEditData
  | RunelayerAdminCollectionListData
  | RunelayerAdminCollectionCreateData
  | RunelayerAdminCollectionEditData
  | RunelayerAdminGlobalEditData;

export interface RunelayerAdminFormData {
  error?: string;
}

export interface RunelayerAdminPageProps {
  data: RunelayerAdminPageData;
  form?: RunelayerAdminFormData | null;
}

export type RunelayerAdminPageComponent = Component<RunelayerAdminPageProps>;

export interface RunelayerQueryApi {
  find(collection: CollectionInput, args?: FindArgs): Promise<any[]>;
  findOne(collection: CollectionInput, id: string): Promise<unknown>;
  create(collection: CollectionInput, data: RunelayerDocument): Promise<any>;
  update(collection: CollectionInput, id: string, data: RunelayerDocument): Promise<any>;
  remove(collection: CollectionInput, id: string): Promise<any>;
  publish(collection: CollectionInput, id: string): Promise<any>;
  unpublish(collection: CollectionInput, id: string): Promise<any>;
  saveDraft(collection: CollectionInput, id: string, data: RunelayerDocument): Promise<any>;
  findVersionHistory(
    collection: CollectionInput,
    id: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<any>;
  restoreVersion(collection: CollectionInput, id: string, versionId: string): Promise<any>;
}

export interface RunelayerAdminRuntime {
  load: (event: RequestEvent) => Promise<RunelayerAdminPageData>;
  actions: Actions;
}

export interface RunelayerApp {
  handle: Handle;
  admin: RunelayerAdminRuntime;
  withRequest(eventOrRequest: RequestEvent | Request): RunelayerQueryApi;
  system: RunelayerQueryApi;
}
