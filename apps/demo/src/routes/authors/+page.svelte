<script lang="ts">
  import {
    Grid,
    Row,
    Column,
    Tile,
    Tag,
    Breadcrumb,
    BreadcrumbItem,
  } from "carbon-components-svelte";

  let { data } = $props();

  function roleColor(role: string): "blue" | "teal" | "gray" {
    if (role === "staff") return "blue";
    if (role === "contributor") return "teal";
    return "gray";
  }

  function truncate(text: string | null | undefined, maxLength: number): string {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trimEnd() + "...";
  }
</script>

<svelte:head>
  <title>Authors | Runekit Demo</title>
</svelte:head>

<div class="authors-list">
  <Breadcrumb noTrailingSlash>
    <BreadcrumbItem href="/">Home</BreadcrumbItem>
    <BreadcrumbItem href="/authors" isCurrentPage>Authors</BreadcrumbItem>
  </Breadcrumb>

  <div class="page-header">
    <h1>Authors</h1>
    <p class="description">
      Meet the team. {data.authors.length} active {data.authors.length === 1 ? "author" : "authors"}.
    </p>
  </div>

  <Grid>
    <Row>
      {#each data.authors as author (author.id)}
        <Column sm={4} md={4} lg={5}>
          <Tile class="author-tile">
            <h3 class="author-name">
              <a href="/authors/{author.slug}" class="author-link">{author.name}</a>
            </h3>
            {#if author.role}
              <Tag type={roleColor(author.role)} size="sm">{author.role}</Tag>
            {/if}
            {#if author.bio}
              <p class="author-bio">{truncate(author.bio, 100)}</p>
            {/if}
            <div class="author-meta">
              <span class="post-count">{author.postCount} {author.postCount === 1 ? "post" : "posts"}</span>
              {#if author.email}
                <span class="author-email">{author.email}</span>
              {/if}
            </div>
          </Tile>
        </Column>
      {/each}
    </Row>
  </Grid>
</div>

<style>
  .authors-list {
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

  .author-name {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .author-link {
    color: var(--cds-link-primary, #0f62fe);
    text-decoration: none;
  }

  .author-link:hover {
    text-decoration: underline;
  }

  .author-bio {
    color: var(--cds-text-secondary, #525252);
    font-size: 0.875rem;
    line-height: 1.5;
    margin-top: 0.75rem;
  }

  .author-meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.875rem;
    color: var(--cds-text-secondary, #525252);
    margin-top: 0.75rem;
  }

  .post-count {
    font-weight: 600;
  }

  .author-email {
    color: var(--cds-text-secondary, #525252);
  }

  :global(.author-tile) {
    margin-bottom: 1rem;
  }
</style>
