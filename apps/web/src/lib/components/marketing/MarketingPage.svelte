<script lang="ts">
  import type { MarketingPage, SiteChrome } from "$lib/marketing.js";
  import { asBlocks, asText } from "$lib/marketing.js";
  import BlockRenderer from "./BlockRenderer.svelte";

  let { page, chrome }: { page: MarketingPage; chrome: SiteChrome } = $props();

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

<div class="rl-page">
  {#each asBlocks(page.layout) as block (block._key ?? `${page.slug}-${block.blockType}`)}
    <BlockRenderer {block} />
  {/each}
</div>
