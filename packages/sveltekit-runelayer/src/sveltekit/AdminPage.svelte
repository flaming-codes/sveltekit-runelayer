<script lang="ts">
  import type { ComponentType } from "svelte";
  import {
    AdminCollectionEditorPage,
    AdminCollectionListPage,
    AdminDashboardPage,
    AdminErrorPage,
    AdminGlobalEditorPage,
    AdminLoginPage,
    AdminShell,
  } from "../admin/index.js";

  let { data, form }: {
    data: Record<string, any>;
    form?: { error?: string };
  } = $props();

  const pageMap = {
    dashboard: AdminDashboardPage,
    "collection-list": AdminCollectionListPage,
    "collection-create": AdminCollectionEditorPage,
    "collection-edit": AdminCollectionEditorPage,
    "global-edit": AdminGlobalEditorPage,
  } satisfies Record<string, ComponentType>;

  let activePage = $derived(pageMap[data.view] ?? null);
  let activePageProps = $derived.by(() => {
    if (data.view === "dashboard") {
      return {
        collections: data.dashboardCollections ?? [],
        globals: data.dashboardGlobals ?? [],
        basePath: data.basePath,
      };
    }
    if (data.view === "collection-list") {
      return {
        collection: data.collection,
        documents: data.docs,
        page: data.page,
        totalPages: data.totalPages,
        totalDocs: data.totalDocs,
        basePath: data.basePath,
      };
    }
    if (data.view === "collection-create") {
      return {
        collection: data.collection,
        document: null,
        basePath: data.basePath,
      };
    }
    if (data.view === "collection-edit") {
      return {
        collection: data.collection,
        document: data.document,
        basePath: data.basePath,
      };
    }
    if (data.view === "global-edit") {
      return {
        global: data.global,
        document: data.document,
        basePath: data.basePath,
      };
    }
    return {};
  });
</script>

{#if data.view === "login"}
  <AdminLoginPage action="?/login" error={form?.error ?? data.error ?? ""} ui={data.ui} />
{:else if activePage}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    ui={data.ui}
  >
    {@const ActivePage = activePage}
    <ActivePage {...activePageProps} />
  </AdminShell>
{:else}
  <AdminErrorPage
    status={404}
    error={{ message: `Unsupported admin view: ${String(data.view)}` }}
    basePath={data.basePath}
  />
{/if}
