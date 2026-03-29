<script lang="ts">
  import {
    AdminLayout,
    CollectionEdit,
    CollectionList,
    Dashboard,
    Login,
  } from "../admin/index.js";

  let { data, form }: {
    data: Record<string, any>;
    form?: { error?: string };
  } = $props();
</script>

{#if data.view === "login"}
  <Login action="?/login" error={form?.error ?? data.error ?? ""} />
{:else}
  <AdminLayout
    collections={data.collections}
    globals={data.globals}
    user={data.user}
    basePath={data.basePath}
  >
    {#if data.view === "dashboard"}
      <Dashboard collections={data.dashboardCollections} basePath={data.basePath} />
    {:else if data.view === "collection-list"}
      <CollectionList
        collection={data.collection}
        documents={data.docs}
        page={data.page}
        totalPages={data.totalPages}
        basePath={data.basePath}
      />
    {:else if data.view === "collection-create"}
      <CollectionEdit collection={data.collection} document={null} basePath={data.basePath} />
    {:else if data.view === "collection-edit"}
      <CollectionEdit
        collection={data.collection}
        document={data.document}
        basePath={data.basePath}
      />
    {/if}
  </AdminLayout>
{/if}
