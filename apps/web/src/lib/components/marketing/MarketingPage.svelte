<script lang="ts">
  import type { MarketingPage, SiteChrome } from "$lib/marketing.js";
  import { asBlocks, asText } from "$lib/marketing.js";
  import BlockRenderer from "./BlockRenderer.svelte";

  let { page, chrome }: { page: MarketingPage; chrome: SiteChrome } = $props();

  let blocks = $derived(asBlocks(page.layout));
  let pageType = $derived(asText(page.pageType, page.slug));
  let seoTitle = $derived(asText(page.seo?.metaTitle, page.title));
  let seoDescription = $derived(asText(page.seo?.metaDescription, page.teaser || chrome.siteDescription));
  let fullTitle = $derived(
    seoTitle === chrome.siteName ? chrome.siteName : `${seoTitle} | ${chrome.siteName}`,
  );
</script>

<svelte:head>
  <title>{fullTitle}</title>
  <meta name="description" content={seoDescription} />
</svelte:head>

<div class="rl-page" data-page-type={pageType}>
  {#each blocks as block, index (block._key ?? `${page.slug}-${block.blockType}-${index}`)}
    <div class="rl-page__block" data-block-type={block.blockType} data-block-index={index + 1}>
      <BlockRenderer {block} {index} total={blocks.length} />
    </div>
  {/each}
</div>

<style>
  .rl-page {
    display: grid;
  }

  .rl-page__block {
    min-width: 0;
  }
</style>
