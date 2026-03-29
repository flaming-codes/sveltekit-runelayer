<script lang="ts">
  import {
    Breadcrumb,
    BreadcrumbItem,
    Tabs,
    Tab,
    TabContent,
    Tag,
    Tile,
    StructuredList,
    StructuredListHead,
    StructuredListRow,
    StructuredListCell,
    StructuredListBody,
  } from "carbon-components-svelte";
  import { Grid, Row, Column } from "carbon-components-svelte";

  import { formatPrice } from "$lib/format.js";
  import { parseJson } from "$lib/parse-json.js";
  import { extractParagraphs } from "$lib/rich-text.js";

  let { data } = $props();

  let product = $derived(data.product);
  let category = $derived(data.category);

  let description = $derived(parseJson(product.description, null));
  let specs = $derived(parseJson(product.specs, {}));
  let features = $derived(parseJson(product.features, []));
  let specEntries = $derived(Object.entries(specs) as [string, unknown][]);
</script>

<Grid>
  <Row>
    <Column>
      <Breadcrumb noTrailingSlash>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem href="/products">Products</BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>{product.name}</BreadcrumbItem>
      </Breadcrumb>
    </Column>
  </Row>

  <Row>
    <Column>
      <h1>{product.name}</h1>
      <div style="display: flex; align-items: center; gap: 1rem; margin: 1rem 0;">
        <span style="font-size: 1.5rem; font-weight: 600;">
          {formatPrice(product.price)}
        </span>
        {#if product.inStock}
          <Tag type="green">In Stock</Tag>
        {:else}
          <Tag type="red">Out of Stock</Tag>
        {/if}
      </div>
      {#if category}
        <p>
          Category: <a href="/categories">{category.name}</a>
        </p>
      {/if}
    </Column>
  </Row>

  <Row>
    <Column>
      <Tabs>
        <svelte:fragment slot="content">
          <Tab label="Description" />
          <Tab label="Specifications" />
          <Tab label="Features" />
        </svelte:fragment>
        <TabContent>
          <Tile>
            {#if description}
              {#each extractParagraphs(description) as paragraph}
                <p style="margin-bottom: 0.5rem;">{paragraph}</p>
              {/each}
            {:else}
              <p>No description available.</p>
            {/if}
          </Tile>
        </TabContent>
        <TabContent>
          <Tile>
            {#if specEntries.length > 0}
              <StructuredList>
                <StructuredListHead>
                  <StructuredListRow head>
                    <StructuredListCell head>Property</StructuredListCell>
                    <StructuredListCell head>Value</StructuredListCell>
                  </StructuredListRow>
                </StructuredListHead>
                <StructuredListBody>
                  {#each specEntries as [key, value]}
                    <StructuredListRow>
                      <StructuredListCell>{key}</StructuredListCell>
                      <StructuredListCell>{value}</StructuredListCell>
                    </StructuredListRow>
                  {/each}
                </StructuredListBody>
              </StructuredList>
            {:else}
              <p>No specifications available.</p>
            {/if}
          </Tile>
        </TabContent>
        <TabContent>
          <Tile>
            {#if features.length > 0}
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                {#each features as feature}
                  <Tag type="blue">{feature}</Tag>
                {/each}
              </div>
            {:else}
              <p>No features listed.</p>
            {/if}
          </Tile>
        </TabContent>
      </Tabs>
    </Column>
  </Row>
</Grid>
