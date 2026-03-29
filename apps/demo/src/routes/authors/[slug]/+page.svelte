<script lang="ts">
  import {
    Grid,
    Row,
    Column,
    Tile,
    ClickableTile,
    Tag,
    Breadcrumb,
    BreadcrumbItem,
  } from "carbon-components-svelte";

  let { data } = $props();

  function statusColor(status: string) {
    if (status === "published") return "blue";
    if (status === "archived") return "warm-gray";
    return "gray";
  }

  function roleColor(role: string): "blue" | "teal" | "gray" {
    if (role === "staff") return "blue";
    if (role === "contributor") return "teal";
    return "gray";
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "---";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
</script>

<svelte:head>
  <title>{data.author.name} | Authors | Runekit Demo</title>
</svelte:head>

<div class="author-detail">
  <Breadcrumb noTrailingSlash>
    <BreadcrumbItem href="/">Home</BreadcrumbItem>
    <BreadcrumbItem href="/authors">Authors</BreadcrumbItem>
    <BreadcrumbItem href="/authors/{data.author.slug}" isCurrentPage>
      {data.author.name}
    </BreadcrumbItem>
  </Breadcrumb>

  <div class="page-header">
    <h1>{data.author.name}</h1>
    <div class="author-info">
      {#if data.author.role}
        <Tag type={roleColor(data.author.role)} size="sm">{data.author.role}</Tag>
      {/if}
      {#if data.author.email}
        <span class="author-email">{data.author.email}</span>
      {/if}
    </div>
    {#if data.author.bio}
      <p class="author-bio">{data.author.bio}</p>
    {/if}
  </div>

  <section class="posts-section">
    <h2>Posts by {data.author.name}</h2>

    {#if data.posts.length === 0}
      <p class="empty-message">No posts by this author yet.</p>
    {:else}
      <Grid>
        <Row>
          {#each data.posts as post (post.id)}
            <Column sm={4} md={4} lg={5}>
              <ClickableTile href="/blog/{post.slug}" class="post-tile">
                <h3 class="post-title">{post.title}</h3>
                {#if post.excerpt}
                  <p class="post-excerpt">{post.excerpt}</p>
                {/if}
                <div class="post-meta">
                  <span class="post-category">{post.categoryName}</span>
                  <Tag type={statusColor(post.status ?? "draft")} size="sm">
                    {post.status ?? "draft"}
                  </Tag>
                  <span class="post-date">{formatDate(post.publishedAt)}</span>
                </div>
              </ClickableTile>
            </Column>
          {/each}
        </Row>
      </Grid>
    {/if}
  </section>
</div>

<style>
  .author-detail {
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

  .author-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .author-email {
    color: var(--cds-text-secondary, #525252);
    font-size: 0.875rem;
  }

  .author-bio {
    color: var(--cds-text-secondary, #525252);
    font-size: 1rem;
    line-height: 1.6;
  }

  .posts-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--cds-border-subtle, #e0e0e0);
  }

  .posts-section h2 {
    font-size: 1.5rem;
    font-weight: 400;
    margin-bottom: 1.5rem;
  }

  .empty-message {
    color: var(--cds-text-secondary, #525252);
    font-size: 1rem;
    padding: 1rem 0;
  }

  .post-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .post-excerpt {
    color: var(--cds-text-secondary, #525252);
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 0.75rem;
  }

  .post-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    font-size: 0.875rem;
    color: var(--cds-text-secondary, #525252);
    margin-top: 0.75rem;
  }

  .post-category {
    font-weight: 600;
  }

  .post-date {
    color: var(--cds-text-secondary, #525252);
  }

  :global(.post-tile) {
    margin-bottom: 1rem;
  }
</style>
