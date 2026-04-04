<script lang="ts">
  import {
    Grid,
    Row,
    Column,
    Tile,
    Button,
    Breadcrumb,
    BreadcrumbItem,
  } from "carbon-components-svelte";

  let { data } = $props();

  let page = $derived(data.page);
</script>

<Grid>
  <Row>
    <Column>
      <Breadcrumb noTrailingSlash>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem href="/">Pages</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{page.title}</BreadcrumbItem>
      </Breadcrumb>
    </Column>
  </Row>

  <Row>
    <Column lg={12} md={6} sm={4}>
      <!-- Hero section -->
      {#if page.hero?.heading}
        <section style="margin-bottom: 2rem; padding: 2rem 0;">
          <h1 style="font-size: 2.5rem;">{page.hero.heading}</h1>
          {#if page.hero?.subheading}
            <p style="font-size: 1.25rem; color: var(--cds-text-secondary); margin: 1rem 0;">
              {page.hero.subheading}
            </p>
          {/if}
          {#if page.hero?.showCta}
            <Button>Get Started</Button>
          {/if}
        </section>
      {:else}
        <h1>{page.title}</h1>
      {/if}
    </Column>
  </Row>

  <Row>
    <Column lg={12} md={6} sm={4}>
      <!-- Contact info (row fields, flattened) -->
      {#if page.email || page.phone}
        <Tile style="margin-bottom: 1rem;">
          <h3 style="margin-bottom: 0.5rem;">Contact Information</h3>
          {#if page.email}
            <p>Email: {page.email}</p>
          {/if}
          {#if page.phone}
            <p>Phone: {page.phone}</p>
          {/if}
        </Tile>
      {/if}
    </Column>

    <Column lg={4} md={2} sm={4}>
      <!-- Sidebar (collapsible fields, flattened) -->
      {#if page.showRecent || page.showCategories || page.customHtml}
        <Tile style="margin-bottom: 1rem;">
          <h4 style="margin-bottom: 0.5rem;">Sidebar</h4>
          {#if page.showRecent}
            <p>Recent posts are enabled.</p>
          {/if}
          {#if page.showCategories}
            <p>Categories are enabled.</p>
          {/if}
          {#if page.customHtml}
            <div style="margin-top: 0.5rem;">
              {page.customHtml}
            </div>
          {/if}
        </Tile>
      {/if}
    </Column>
  </Row>
</Grid>
