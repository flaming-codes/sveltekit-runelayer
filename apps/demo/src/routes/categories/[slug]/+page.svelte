<script lang="ts">
  import {
    Grid,
    Row,
    Column,
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
</script>

<svelte:head>
  <title>{data.category.name} | Categories | Runekit Demo</title>
</svelte:head>

<div class="category-detail">
  <Breadcrumb noTrailingSlash>
    <BreadcrumbItem href="/">Home</BreadcrumbItem>
    <BreadcrumbItem href="/categories">Categories</BreadcrumbItem>
    <BreadcrumbItem href="/categories/{data.category.slug}" isCurrentPage>
      {data.category.name}
    </BreadcrumbItem>
  </Breadcrumb>

  <div class="page-header">
    <h1>{data.category.name}</h1>
    {#if data.category.description}
      <p class="description">{data.category.description}</p>
    {/if}
  </div>

  {#if data.posts.length === 0}
    <p class="empty-message">No posts in this category yet.</p>
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
                <span class="post-author">{post.authorName}</span>
                <Tag type={statusColor(post.status ?? "draft")} size="sm">
                  {post.status ?? "draft"}
                </Tag>
                {#if post.readTime}
                  <span class="post-read-time">{post.readTime} min read</span>
                {/if}
              </div>
            </ClickableTile>
          </Column>
        {/each}
      </Row>
    </Grid>
  {/if}
</div>

<style>
  .category-detail {
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
    font-size: 1rem;
    line-height: 1.6;
  }

  .empty-message {
    color: var(--cds-text-secondary, #525252);
    font-size: 1rem;
    padding: 2rem 0;
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

  .post-author {
    font-weight: 600;
  }

  .post-read-time {
    color: var(--cds-text-secondary, #525252);
  }

  :global(.post-tile) {
    margin-bottom: 1rem;
  }
</style>
