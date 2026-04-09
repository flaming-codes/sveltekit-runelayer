<script lang="ts">
  import type { Component } from "svelte";
  import AdminErrorPage from "./AdminErrorPage.svelte";
  import type { RunelayerAdminPageData, RunelayerAdminPageProps } from "./types.js";

  let { data, form }: RunelayerAdminPageProps = $props();

  type LazyComponentModule = { default: Component<any> };
  type AdminView = RunelayerAdminPageData["view"];

  const moduleCache = new Map<string, Promise<LazyComponentModule>>();

  const viewLoaders: Record<AdminView, () => Promise<LazyComponentModule>> = {
    login: () => import("../admin/components/Login.svelte"),
    "create-first-user": () => import("../admin/components/Login.svelte"),
    dashboard: () => import("../admin/components/Dashboard.svelte"),
    profile: () => import("../admin/components/Profile.svelte"),
    "users-list": () => import("../admin/components/UsersList.svelte"),
    "users-create": () => import("../admin/components/UserEdit.svelte"),
    "users-edit": () => import("../admin/components/UserEdit.svelte"),
    health: () => import("../admin/components/Health.svelte"),
    "collection-list": () => import("../admin/components/CollectionList.svelte"),
    "collection-create": () => import("../admin/components/CollectionEdit.svelte"),
    "collection-edit": () => import("../admin/components/CollectionEdit.svelte"),
    "global-edit": () => import("../admin/components/GlobalEdit.svelte"),
  };

  function cachedModule(
    cacheKey: string,
    loader: () => Promise<LazyComponentModule>,
  ): Promise<LazyComponentModule> {
    const cached = moduleCache.get(cacheKey);
    if (cached) return cached;
    const next = loader();
    moduleCache.set(cacheKey, next);
    return next;
  }

  function viewModule(view: AdminView): Promise<LazyComponentModule> {
    return cachedModule(`view:${view}`, viewLoaders[view]);
  }

  function shellModule(): Promise<LazyComponentModule> {
    return cachedModule("shell", () => import("../admin/components/AdminLayout.svelte"));
  }

  function importErrorMessage(value: unknown, fallback: string): string {
    if (value instanceof Error && value.message.trim().length > 0) {
      return `${fallback} ${value.message}`;
    }
    return fallback;
  }
</script>

{#if data.view === "login" || data.view === "create-first-user"}
  {#await viewModule(data.view) then view}
    {@const View = view.default}
    <View
      action="?/login"
      setupAction="?/createFirstUser"
      mode={data.view === "create-first-user" ? "create-first-user" : "login"}
      error={form?.error ?? ""}
      ui={data.ui}
    />
  {:catch loadError}
    <AdminErrorPage
      status={500}
      error={{
        message: importErrorMessage(loadError, "Failed to load admin login view."),
      }}
      basePath={data.basePath}
    />
  {/await}
{:else}
  {#await shellModule() then shell}
    {@const Shell = shell.default}
    <Shell
      collections={data.collections}
      globals={data.globals}
      user={data.user}
      basePath={data.basePath}
      currentPath={data.currentPath}
      ui={data.ui}
    >
      {#await viewModule(data.view) then view}
        {@const View = view.default}
        {#if data.view === "dashboard"}
          <View
            collections={data.dashboardCollections}
            globals={data.dashboardGlobals}
            basePath={data.basePath}
          />
        {:else if data.view === "profile"}
          <View user={data.user} basePath={data.basePath} />
        {:else if data.view === "users-list"}
          <View
            users={data.users}
            totalUsers={data.totalUsers}
            page={data.page}
            limit={data.limit}
            totalPages={data.totalPages}
            searchTerm={data.searchTerm}
            roleFilter={data.roleFilter}
            basePath={data.basePath}
          />
        {:else if data.view === "users-create"}
          <View managedUser={null} roles={data.roles} basePath={data.basePath} />
        {:else if data.view === "users-edit"}
          <View managedUser={data.managedUser} roles={data.roles} basePath={data.basePath} />
        {:else if data.view === "health"}
          <View health={data.health} />
        {:else if data.view === "collection-list"}
          <View
            collection={data.collection}
            documents={data.docs}
            page={data.page}
            limit={data.limit}
            totalPages={data.totalPages}
            totalDocs={data.totalDocs}
            basePath={data.basePath}
          />
        {:else if data.view === "collection-create"}
          <View collection={data.collection} document={null} basePath={data.basePath} {form} />
        {:else if data.view === "collection-edit"}
          <View
            collection={data.collection}
            document={data.document}
            versions={data.versions ?? []}
            basePath={data.basePath}
            {form}
          />
        {:else if data.view === "global-edit"}
          <View
            global={data.global}
            document={data.document}
            versions={data.versions ?? []}
            basePath={data.basePath}
            {form}
          />
        {/if}
      {:catch loadError}
        <AdminErrorPage
          status={500}
          error={{
            message: importErrorMessage(loadError, "Failed to load admin view."),
          }}
          basePath={data.basePath}
        />
      {/await}
    </Shell>
  {:catch loadError}
    <AdminErrorPage
      status={500}
      error={{
        message: importErrorMessage(loadError, "Failed to load admin shell."),
      }}
      basePath={data.basePath}
    />
  {/await}
{/if}
