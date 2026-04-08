<script lang="ts">
  import {
    AdminCollectionEditorPage,
    AdminCollectionListPage,
    AdminDashboardPage,
    AdminErrorPage,
    AdminGlobalEditorPage,
    AdminHealthPage,
    AdminLoginPage,
    AdminProfilePage,
    AdminShell,
    AdminUserEditorPage,
    AdminUsersListPage,
  } from "../admin/index.js";
  import type { RunelayerAdminPageProps } from "./types.js";

  let { data, form }: RunelayerAdminPageProps = $props();
</script>

{#if data.view === "login" || data.view === "create-first-user"}
  <AdminLoginPage
    action="?/login"
    setupAction="?/createFirstUser"
    mode={data.view === "create-first-user" ? "create-first-user" : "login"}
    error={form?.error ?? ""}
    ui={data.ui}
  />
{:else}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    currentPath={data.currentPath}
    ui={data.ui}
  >
    {#if data.view === "dashboard"}
      <AdminDashboardPage
        collections={data.dashboardCollections}
        globals={data.dashboardGlobals}
        basePath={data.basePath}
      />
    {:else if data.view === "profile"}
      <AdminProfilePage user={data.user} basePath={data.basePath} />
    {:else if data.view === "users-list"}
      <AdminUsersListPage
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
      <AdminUserEditorPage managedUser={null} roles={data.roles} basePath={data.basePath} />
    {:else if data.view === "users-edit"}
      <AdminUserEditorPage managedUser={data.managedUser} roles={data.roles} basePath={data.basePath} />
    {:else if data.view === "health"}
      <AdminHealthPage health={data.health} />
    {:else if data.view === "collection-list"}
      <AdminCollectionListPage
        collection={data.collection}
        documents={data.docs}
        page={data.page}
        limit={data.limit}
        totalPages={data.totalPages}
        totalDocs={data.totalDocs}
        basePath={data.basePath}
      />
    {:else if data.view === "collection-create"}
      <AdminCollectionEditorPage
        collection={data.collection}
        document={null}
        basePath={data.basePath}
      />
    {:else if data.view === "collection-edit"}
      <AdminCollectionEditorPage
        collection={data.collection}
        document={data.document}
        versions={data.versions ?? []}
        basePath={data.basePath}
      />
    {:else if data.view === "global-edit"}
      <AdminGlobalEditorPage
        global={data.global}
        document={data.document}
        versions={data.versions ?? []}
        basePath={data.basePath}
      />
    {:else}
      <AdminErrorPage
        status={404}
        error={{ message: `Unsupported admin view: ${String(data.view)}` }}
        basePath={data.basePath}
      />
    {/if}
  </AdminShell>
{/if}
