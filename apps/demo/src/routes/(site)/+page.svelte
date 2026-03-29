<script lang="ts">
  import { Grid, Row, Column, Tile, ClickableTile, Tag, Button } from "carbon-components-svelte";
  import { statusColor } from "$lib/format.js";

  let { data } = $props();
</script>

<svelte:head>
  <title>Runekit Demo</title>
</svelte:head>

<div class="home">
  <!-- Hero Section -->
  <section class="hero">
    <Tile>
      <h1>Runekit Demo</h1>
      <p class="tagline">
        A CMS-as-a-package for SvelteKit — powered by SQLite, Better Auth, and Svelte 5 runes.
      </p>
      <div class="hero-actions">
        <Button href="/blog">Browse Blog</Button>
        <Button href="/admin" kind="secondary">Open Admin</Button>
      </div>
    </Tile>
  </section>

  <!-- Stats Section -->
  <section class="stats">
    <Grid>
      <Row>
        <Column sm={2} md={2} lg={4}>
          <Tile>
            <p class="stat-value">{data.stats.posts}</p>
            <p class="stat-label">Posts</p>
          </Tile>
        </Column>
        <Column sm={2} md={2} lg={4}>
          <Tile>
            <p class="stat-value">{data.stats.authors}</p>
            <p class="stat-label">Authors</p>
          </Tile>
        </Column>
        <Column sm={2} md={2} lg={4}>
          <Tile>
            <p class="stat-value">{data.stats.categories}</p>
            <p class="stat-label">Categories</p>
          </Tile>
        </Column>
        <Column sm={2} md={2} lg={4}>
          <Tile>
            <p class="stat-value">{data.stats.products}</p>
            <p class="stat-label">Products</p>
          </Tile>
        </Column>
      </Row>
    </Grid>
  </section>

  <!-- Featured Posts Section -->
  {#if data.featured.length > 0}
    <section class="featured">
      <h2>Featured Posts</h2>
      <Grid>
        <Row>
          {#each data.featured as post}
            <Column sm={4} md={4} lg={5}>
              <ClickableTile href="/blog/{post.slug}">
                <h3>{post.title}</h3>
                {#if post.excerpt}
                  <p class="excerpt">{post.excerpt}</p>
                {/if}
                <div class="post-meta">
                  {#if post.author}
                    <span class="author">{post.author}</span>
                  {/if}
                  {#if post.readTime}
                    <span class="read-time">{post.readTime} min read</span>
                  {/if}
                </div>
                <div class="post-tags">
                  <Tag
                    type={statusColor(post.status)}
                  >
                    {post.status}
                  </Tag>
                </div>
              </ClickableTile>
            </Column>
          {/each}
        </Row>
      </Grid>
    </section>
  {/if}

  <!-- Recent Posts Section -->
  {#if data.recent.length > 0}
    <section class="recent">
      <h2>Recent Posts</h2>
      <Grid>
        <Row>
          {#each data.recent as post}
            <Column sm={4} md={4} lg={5}>
              <ClickableTile href="/blog/{post.slug}">
                <h3 class="compact-title">{post.title}</h3>
                <div class="post-meta">
                  {#if post.author}
                    <span class="author">{post.author}</span>
                  {/if}
                  {#if post.readTime}
                    <span class="read-time">{post.readTime} min read</span>
                  {/if}
                </div>
                <Tag
                  type={statusColor(post.status)}
                  size="sm"
                >
                  {post.status}
                </Tag>
              </ClickableTile>
            </Column>
          {/each}
        </Row>
      </Grid>
    </section>
  {/if}
</div>

<style>
  .home {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .hero {
    margin-bottom: 3rem;
  }

  .hero h1 {
    font-size: 3rem;
    font-weight: 300;
    margin-bottom: 1rem;
  }

  .tagline {
    font-size: 1.25rem;
    color: var(--cds-text-secondary, #525252);
    margin-bottom: 2rem;
    max-width: 600px;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
  }

  .stats {
    margin-bottom: 3rem;
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: 600;
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--cds-text-secondary, #525252);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .featured,
  .recent {
    margin-bottom: 3rem;
  }

  .featured h2,
  .recent h2 {
    font-size: 1.75rem;
    font-weight: 400;
    margin-bottom: 1.5rem;
  }

  .excerpt {
    color: var(--cds-text-secondary, #525252);
    margin: 0.75rem 0;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .post-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.8125rem;
    color: var(--cds-text-secondary, #525252);
    margin: 0.5rem 0;
  }

  .post-tags {
    margin-top: 0.75rem;
  }

  .compact-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
</style>
