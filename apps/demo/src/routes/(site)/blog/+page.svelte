<script lang="ts">
  import {
    DataTable,
    Toolbar,
    ToolbarContent,
    ToolbarSearch,
    Pagination,
    Tag,
    Breadcrumb,
    BreadcrumbItem,
    Button,
  } from "carbon-components-svelte";

  import { statusColor, formatDate } from "$lib/format.js";

  let { data } = $props();

  let searchTerm = $state("");

  let filteredPosts = $derived(
    searchTerm
      ? data.posts.filter((p) =>
          p.title.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : data.posts,
  );

  let rows = $derived(
    filteredPosts.map((p) => ({
      id: p.id,
      title: p.title,
      authorName: p.authorName,
      status: p.status ?? "draft",
      publishedAt: formatDate(p.publishedAt),
      readTime: p.readTime ? `${p.readTime} min` : "---",
      slug: p.slug,
    })),
  );

  const headers = [
    { key: "title", value: "Title" },
    { key: "authorName", value: "Author" },
    { key: "status", value: "Status" },
    { key: "publishedAt", value: "Published" },
    { key: "readTime", value: "Read Time" },
  ];
</script>

<svelte:head>
  <title>Blog | Runelayer Demo</title>
</svelte:head>

<div class="blog-list">
  <Breadcrumb noTrailingSlash>
    <BreadcrumbItem href="/">Home</BreadcrumbItem>
    <BreadcrumbItem href="/blog" isCurrentPage>Blog</BreadcrumbItem>
  </Breadcrumb>

  <div class="page-header">
    <h1>Blog</h1>
    <p class="description">
      Browse all posts. Showing {filteredPosts.length} of {data.total} total posts.
    </p>
  </div>

  <DataTable {headers} {rows} sortable>
    <Toolbar>
      <ToolbarContent>
        <ToolbarSearch
          persistent
          value={searchTerm}
          on:input={(e) => {
            searchTerm = e.detail;
          }}
          on:clear={() => {
            searchTerm = "";
          }}
        />
        <Button kind="ghost" href="/blog" size="small">View All</Button>
      </ToolbarContent>
    </Toolbar>
    <svelte:fragment slot="cell" let:row let:cell>
      {#if cell.key === "status"}
        <Tag type={statusColor(cell.value)} size="sm">{cell.value}</Tag>
      {:else if cell.key === "title"}
        <a href="/blog/{row.slug}" class="post-link">{cell.value}</a>
      {:else}
        {cell.value}
      {/if}
    </svelte:fragment>
  </DataTable>

  {#if data.totalPages > 1}
    <nav class="pagination-nav">
      <Pagination
        totalItems={data.total}
        pageSize={10}
        page={data.page}
        on:change={(e) => {
          const page = e.detail.page;
          if (page !== data.page) {
            window.location.href = `/blog?page=${page}`;
          }
        }}
      />
    </nav>
  {/if}
</div>

<style>
  .blog-list {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .page-header {
    margin: 1.5rem 0 2rem;
  }

  .page-header h1 {
    font-size: 2.5rem;
    font-weight: 300;
    margin-bottom: 0.5rem;
  }

  .description {
    color: var(--cds-text-secondary, #525252);
    font-size: 0.875rem;
  }

  .post-link {
    color: var(--cds-link-primary, #0f62fe);
    text-decoration: none;
    font-weight: 600;
  }

  .post-link:hover {
    text-decoration: underline;
  }

  .pagination-nav {
    margin-top: 1.5rem;
  }
</style>
