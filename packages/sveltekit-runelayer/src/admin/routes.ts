// Route helper — tells host apps what components and routes the admin UI needs.

import type { CollectionConfig } from "../schema/collections.js";
import type { GlobalConfig } from "../schema/globals.js";
import AdminLayout from "./components/AdminLayout.svelte";
import Dashboard from "./components/Dashboard.svelte";
import Login from "./components/Login.svelte";
import CollectionList from "./components/CollectionList.svelte";
import CollectionEdit from "./components/CollectionEdit.svelte";

export type SchemaConfig = {
  collections: CollectionConfig[];
  globals?: GlobalConfig[];
};

export function getAdminRoutes(schema: SchemaConfig) {
  return {
    layout: AdminLayout,
    dashboard: Dashboard,
    login: Login,
    collections: schema.collections.map((c) => ({
      slug: c.slug,
      list: CollectionList,
      edit: CollectionEdit,
    })),
  };
}
