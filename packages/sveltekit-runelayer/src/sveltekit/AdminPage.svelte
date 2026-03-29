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

  let { data, form }: {
    data: Record<string, any>;
    form?: { error?: string } | null;
  } = $props();
</script>

{#if data.view === "login" || data.view === "create-first-user"}
  <AdminLoginPage
    action="?/login"
    setupAction="?/createFirstUser"
    mode={data.view === "create-first-user" ? "create-first-user" : "login"}
    error={form?.error ?? data.error ?? ""}
    ui={data.ui}
  />
{:else if data.view === "dashboard"}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    currentPath={data.currentPath}
    ui={data.ui}
  >
    <AdminDashboardPage
      collections={data.dashboardCollections ?? []}
      globals={data.dashboardGlobals ?? []}
      basePath={data.basePath}
    />
  </AdminShell>
{:else if data.view === "profile"}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    currentPath={data.currentPath}
    ui={data.ui}
  >
    <AdminProfilePage user={data.user} basePath={data.basePath} />
  </AdminShell>
{:else if data.view === "users-list"}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    currentPath={data.currentPath}
    ui={data.ui}
  >
    <AdminUsersListPage
      users={data.users ?? []}
      totalUsers={data.totalUsers ?? 0}
      page={data.page ?? 1}
      limit={data.limit ?? 20}
      totalPages={data.totalPages ?? 1}
      searchTerm={data.searchTerm ?? ""}
      roleFilter={data.roleFilter ?? ""}
      basePath={data.basePath}
    />
  </AdminShell>
{:else if data.view === "users-create"}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    currentPath={data.currentPath}
    ui={data.ui}
  >
    <AdminUserEditorPage managedUser={null} roles={data.roles ?? []} basePath={data.basePath} />
  </AdminShell>
{:else if data.view === "users-edit"}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    currentPath={data.currentPath}
    ui={data.ui}
  >
    <AdminUserEditorPage managedUser={data.managedUser} roles={data.roles ?? []} basePath={data.basePath} />
  </AdminShell>
{:else if data.view === "health"}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    currentPath={data.currentPath}
    ui={data.ui}
  >
    <AdminHealthPage health={data.health} />
  </AdminShell>
{:else if data.view === "collection-list"}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    currentPath={data.currentPath}
    ui={data.ui}
  >
    <AdminCollectionListPage
      collection={data.collection}
      documents={data.docs}
      page={data.page}
      limit={data.limit}
      totalPages={data.totalPages}
      totalDocs={data.totalDocs}
      basePath={data.basePath}
    />
  </AdminShell>
{:else if data.view === "collection-create"}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    currentPath={data.currentPath}
    ui={data.ui}
  >
    <AdminCollectionEditorPage
      collection={data.collection}
      document={null}
      basePath={data.basePath}
    />
  </AdminShell>
{:else if data.view === "collection-edit"}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    currentPath={data.currentPath}
    ui={data.ui}
  >
    <AdminCollectionEditorPage
      collection={data.collection}
      document={data.document}
      basePath={data.basePath}
    />
  </AdminShell>
{:else if data.view === "global-edit"}
  <AdminShell
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
    currentPath={data.currentPath}
    ui={data.ui}
  >
    <AdminGlobalEditorPage global={data.global} document={data.document} basePath={data.basePath} />
  </AdminShell>
{:else}
  <AdminErrorPage
    status={404}
    error={{ message: `Unsupported admin view: ${String(data.view)}` }}
    basePath={data.basePath}
  />
{/if}
