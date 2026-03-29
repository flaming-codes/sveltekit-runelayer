import type { Actions, Handle, RequestEvent } from "@sveltejs/kit";
import type { ComponentType } from "svelte";
import type { RunekitConfig } from "../config.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { FindArgs } from "../query/types.js";

export type CollectionInput = string | CollectionConfig;

export interface RunelayerAdminConfig {
  /** Mount path for admin pages. @default "/admin" */
  path?: string;
  /** Enforce authenticated admin role for all admin pages/actions. @default true */
  strictAccess?: boolean;
}

export interface RunelayerAppConfig extends Omit<RunekitConfig, "adminPath"> {
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
  Page: ComponentType;
}

export interface RunelayerApp {
  handle: Handle;
  admin: RunelayerAdminRuntime;
  withRequest(eventOrRequest: RequestEvent | Request): RunelayerQueryApi;
  system: RunelayerQueryApi;
}
