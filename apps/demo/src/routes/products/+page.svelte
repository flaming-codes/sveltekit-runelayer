<script lang="ts">
  import {
    Grid,
    Row,
    Column,
    Tile,
    Tag,
    Breadcrumb,
    BreadcrumbItem,
    Button,
  } from "carbon-components-svelte";

  let { data } = $props();

  function formatPrice(price: number): string {
    return price === 0 ? "Free" : `$${price}`;
  }
</script>

<Grid>
  <Row>
    <Column>
      <Breadcrumb noTrailingSlash>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem href="/products" isCurrentPage>Products</BreadcrumbItem>
      </Breadcrumb>
    </Column>
  </Row>

  <Row>
    <Column>
      <h1>Products</h1>
      <p>Browse our collection of products managed through the CMS.</p>
    </Column>
  </Row>

  <Row>
    {#each data.products as product}
      <Column lg={5} md={4} sm={4}>
        <Tile style="margin-bottom: 1rem;">
          <h3>{product.name}</h3>
          <p style="font-size: 1.25rem; font-weight: 600; margin: 0.5rem 0;">
            {formatPrice(product.price)}
          </p>
          <p style="margin-bottom: 0.5rem;">
            Category: {product.categoryName}
          </p>
          <div style="margin-bottom: 0.5rem;">
            {#if product.inStock}
              <Tag type="green">In Stock</Tag>
            {:else}
              <Tag type="red">Out of Stock</Tag>
            {/if}
          </div>
          {#if product.parsedFeatures.length > 0}
            <div style="margin-bottom: 0.5rem;">
              {#each product.parsedFeatures as feature}
                <Tag type="cool-gray">{feature}</Tag>
              {/each}
            </div>
          {/if}
          <Button kind="ghost" href="/products/{product.slug}">
            View Details
          </Button>
        </Tile>
      </Column>
    {/each}
  </Row>
</Grid>
