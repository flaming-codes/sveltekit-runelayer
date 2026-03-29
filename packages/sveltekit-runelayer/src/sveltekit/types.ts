import type { Actions, Handle, RequestEvent } from "@sveltejs/kit";
import type { Component } from "svelte";
import type { RunelayerConfig } from "../config.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { FindArgs } from "../query/types.js";

export type CollectionInput = string | CollectionConfig;

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
  /** Enforce authenticated admin role for all admin pages/actions. @default true */
  strictAccess?: boolean;
  /** Package-owned admin UI options */
  ui?: RunelayerAdminUIConfig;
}

export interface RunelayerAppConfig extends Omit<RunelayerConfig, "adminPath"> {
  admin?: RunelayerAdminConfig;
}

export interface RunelayerQueryApi {
  find(collection: CollectionInput, args?: FindArgs): Promise<any[]>;
  findOne(collection: CollectionInput, id: string): Promise<unknown>;
  create(collection: CollectionInput, data: Record<string, unknown>): Promise<any>;
  update(collection: CollectionInput, id: string, data: Record<string, unknown>): Promise<any>;
  remove(collection: CollectionInput, id: string): Promise<any>;
}

export interface RunelayerAdminRuntime {
  load: (event: RequestEvent) => Promise<Record<string, unknown>>;
  actions: Actions;
  Page: Component<any>;
}

export interface RunelayerApp {
  handle: Handle;
  admin: RunelayerAdminRuntime;
  withRequest(eventOrRequest: RequestEvent | Request): RunelayerQueryApi;
  system: RunelayerQueryApi;
}
