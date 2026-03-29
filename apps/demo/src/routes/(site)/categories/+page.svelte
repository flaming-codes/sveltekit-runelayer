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
</script>

<svelte:head>
  <title>Categories | Runekit Demo</title>
</svelte:head>

<div class="categories-list">
  <Breadcrumb noTrailingSlash>
    <BreadcrumbItem href="/">Home</BreadcrumbItem>
    <BreadcrumbItem href="/categories" isCurrentPage>Categories</BreadcrumbItem>
  </Breadcrumb>

  <div class="page-header">
    <h1>Categories</h1>
    <p class="description">
      Browse content by category. {data.categories.length} categories available.
    </p>
  </div>

  <Grid>
    <Row>
      {#each data.categories as category (category.id)}
        <Column sm={4} md={4} lg={5}>
          <ClickableTile href="/categories/{category.slug}" class="category-tile">
            <h3 class="category-name">{category.name}</h3>
            {#if category.description}
              <p class="category-description">{category.description}</p>
            {/if}
            <div class="category-meta">
              <Tag type="blue" size="sm">{category.postCount} {category.postCount === 1 ? "post" : "posts"}</Tag>
              {#if category.featured}
                <Tag type="purple" size="sm">Featured</Tag>
              {/if}
            </div>
          </ClickableTile>
        </Column>
      {/each}
    </Row>
  </Grid>
</div>

<style>
  .categories-list {
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

  .category-name {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .category-description {
    color: var(--cds-text-secondary, #525252);
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .category-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.75rem;
  }

  :global(.category-tile) {
    margin-bottom: 1rem;
  }
</style>
