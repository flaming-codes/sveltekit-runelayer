<script lang="ts">
  import {
    Breadcrumb,
    BreadcrumbItem,
    Tag,
    Tile,
    Grid,
    Row,
    Column,
  } from "carbon-components-svelte";

  import { statusColor, formatDate } from "$lib/format.js";
  import { renderRichText } from "$lib/rich-text.js";

  let { data } = $props();

  let htmlContent = $derived(renderRichText(data.post.content));
</script>

<svelte:head>
  <title>{data.post.seo_metaTitle ?? data.post.title} | Runekit Demo</title>
  {#if data.post.seo_metaDescription}
    <meta name="description" content={data.post.seo_metaDescription} />
  {/if}
</svelte:head>

<div class="blog-detail">
  <Breadcrumb noTrailingSlash>
    <BreadcrumbItem href="/">Home</BreadcrumbItem>
    <BreadcrumbItem href="/blog">Blog</BreadcrumbItem>
    <BreadcrumbItem href="/blog/{data.post.slug}" isCurrentPage>
      {data.post.title}
    </BreadcrumbItem>
  </Breadcrumb>

  <article class="post">
    <header class="post-header">
      <h1>{data.post.title}</h1>

      <div class="post-meta">
        {#if data.author}
          <a href="/authors/{data.author.slug}" class="meta-link">
            {data.author.name}
          </a>
        {/if}

        {#if data.category}
          <a href="/categories/{data.category.slug}" class="meta-tag-link">
            <Tag type="cyan" size="sm">{data.category.name}</Tag>
          </a>
        {/if}

        <span class="meta-date">{formatDate(data.post.publishedAt, "long")}</span>

        {#if data.post.readTime}
          <span class="meta-read-time">{data.post.readTime} min read</span>
        {/if}

        <Tag
          type={statusColor(data.post.status)}
          size="sm"
        >
          {data.post.status ?? "draft"}
        </Tag>
      </div>

      {#if data.post.excerpt}
        <p class="excerpt">{data.post.excerpt}</p>
      {/if}
    </header>

    <div class="post-content">
      {@html htmlContent}
    </div>
  </article>

  {#if data.author}
    <section class="author-card">
      <Grid>
        <Row>
          <Column sm={4} md={6} lg={8}>
            <Tile>
              <h3>About the Author</h3>
              <p class="author-name">{data.author.name}</p>
              {#if data.author.role}
                <Tag type="outline" size="sm">{data.author.role}</Tag>
              {/if}
              {#if data.author.bio}
                <p class="author-bio">{data.author.bio}</p>
              {/if}
            </Tile>
          </Column>
        </Row>
      </Grid>
    </section>
  {/if}
</div>

<style>
  .blog-detail {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .post-header {
    margin: 1.5rem 0 2rem;
  }

  .post-header h1 {
    font-size: 2.5rem;
    font-weight: 300;
    margin-bottom: 1rem;
    line-height: 1.2;
  }

  .post-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--cds-text-secondary, #525252);
    margin-bottom: 1.5rem;
  }

  .meta-link {
    color: var(--cds-link-primary, #0f62fe);
    text-decoration: none;
    font-weight: 600;
  }

  .meta-link:hover {
    text-decoration: underline;
  }

  .meta-tag-link {
    text-decoration: none;
  }

  .excerpt {
    font-size: 1.125rem;
    color: var(--cds-text-secondary, #525252);
    line-height: 1.6;
    border-left: 3px solid var(--cds-border-interactive, #0f62fe);
    padding-left: 1rem;
    margin-top: 0;
  }

  .post-content {
    line-height: 1.8;
    font-size: 1rem;
    margin-bottom: 3rem;
  }

  .post-content :global(h2) {
    font-size: 1.75rem;
    font-weight: 400;
    margin: 2rem 0 1rem;
  }

  .post-content :global(h3) {
    font-size: 1.375rem;
    font-weight: 500;
    margin: 1.5rem 0 0.75rem;
  }

  .post-content :global(p) {
    margin-bottom: 1rem;
  }

  .post-content :global(blockquote) {
    border-left: 3px solid var(--cds-border-subtle, #c6c6c6);
    padding-left: 1rem;
    color: var(--cds-text-secondary, #525252);
    margin: 1.5rem 0;
  }

  .post-content :global(pre) {
    background: var(--cds-layer-02, #e0e0e0);
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 1.5rem 0;
  }

  .author-card {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--cds-border-subtle, #e0e0e0);
  }

  .author-card h3 {
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--cds-text-secondary, #525252);
    margin-bottom: 0.5rem;
  }

  .author-name {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .author-bio {
    color: var(--cds-text-secondary, #525252);
    margin-top: 0.75rem;
    line-height: 1.6;
  }
</style>
