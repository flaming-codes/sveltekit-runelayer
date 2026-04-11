<script lang="ts">
  import { Button, Tag } from "carbon-components-svelte";
  import { ArrowUpRight } from "carbon-icons-svelte";
  import type { SiteChrome } from "$lib/marketing.js";
  import { asLinkItems, asText } from "$lib/marketing.js";

  let { chrome, currentPath = "/" }: { chrome: SiteChrome; currentPath?: string } = $props();

  let headerLinks = $derived(asLinkItems(chrome.headerLinks));
  let utilityLinks = $derived(asLinkItems(chrome.utilityLinks));
  let hasAnnouncement = $derived(
    asText(chrome.announcementTitle).length > 0 && asText(chrome.announcementUrl).length > 0,
  );

  function isActive(url: string) {
    if (url === "/") return currentPath === "/";
    return currentPath === url || currentPath.startsWith(`${url}/`);
  }

  function isExternal(url: string) {
    return /^https?:\/\//.test(url);
  }
</script>

<header class="rl-header">
  {#if hasAnnouncement}
    <div class="rl-header__announcement">
      <div class="rl-container rl-header__announcement-inner">
        <Tag type="blue">Example</Tag>
        <a href={asText(chrome.announcementUrl)} class="rl-header__announcement-link">
          {asText(chrome.announcementTitle)}
        </a>
      </div>
    </div>
  {/if}

  <div class="rl-container rl-header__bar">
    <a href="/" class="rl-header__brand" aria-label="Runelayer home">
      <span class="rl-header__brand-mark">RL</span>
      <span class="rl-header__brand-copy">
        <strong>{chrome.siteName}</strong>
        <span>{chrome.siteTagline}</span>
      </span>
    </a>

    <nav class="rl-header__nav" aria-label="Primary navigation">
      {#each headerLinks as item}
        <a
          href={item.url}
          class:rl-header__nav-link--active={isActive(item.url)}
          class="rl-header__nav-link"
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="rl-header__actions">
      {#each utilityLinks as item}
        <a
          href={item.url}
          class="rl-header__utility-link"
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noreferrer" : undefined}
        >
          {item.label}
          {#if item.external}
            <ArrowUpRight size={16} />
          {/if}
        </a>
      {/each}

      {#if asText(chrome.headerPrimaryCtaLabel) && asText(chrome.headerPrimaryCtaUrl)}
        <Button
          href={asText(chrome.headerPrimaryCtaUrl)}
          target={isExternal(asText(chrome.headerPrimaryCtaUrl)) ? "_blank" : undefined}
          rel={isExternal(asText(chrome.headerPrimaryCtaUrl)) ? "noreferrer" : undefined}
          size="small"
        >
          {asText(chrome.headerPrimaryCtaLabel)}
        </Button>
      {/if}
    </div>
  </div>
</header>

<style>
  .rl-header {
    position: sticky;
    top: 0;
    z-index: 20;
    backdrop-filter: blur(16px);
    background: color-mix(in srgb, white 84%, transparent);
    border-bottom: 1px solid var(--cds-border-subtle);
  }

  .rl-header__announcement {
    background: var(--cds-background-inverse);
    color: var(--cds-text-inverse);
    border-bottom: 1px solid color-mix(in srgb, var(--cds-text-inverse) 10%, transparent);
  }

  .rl-header__announcement-inner {
    display: flex;
    align-items: center;
    gap: var(--cds-spacing-03);
    min-height: 2.5rem;
  }

  .rl-header__announcement-link {
    color: inherit;
    text-decoration: none;
    font-size: 0.875rem;
  }

  .rl-header__bar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--cds-spacing-05);
    align-items: center;
    min-height: 4.5rem;
  }

  .rl-header__brand {
    display: inline-flex;
    align-items: center;
    gap: var(--cds-spacing-03);
    min-width: 0;
    color: inherit;
    text-decoration: none;
  }

  .rl-header__brand-mark {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    background: var(--cds-background-inverse);
    color: var(--cds-text-inverse);
    font-size: 0.875rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .rl-header__brand-copy {
    display: grid;
    min-width: 0;
  }

  .rl-header__brand-copy strong {
    font-size: 1rem;
    font-weight: 600;
  }

  .rl-header__brand-copy span {
    color: var(--cds-text-secondary);
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rl-header__nav {
    display: flex;
    gap: var(--cds-spacing-05);
    justify-content: center;
  }

  .rl-header__nav-link,
  .rl-header__utility-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--cds-text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
  }

  .rl-header__nav-link--active,
  .rl-header__nav-link:hover,
  .rl-header__utility-link:hover {
    color: var(--cds-text-primary);
  }

  .rl-header__actions {
    display: flex;
    align-items: center;
    gap: var(--cds-spacing-04);
  }

  @media (max-width: 960px) {
    .rl-header__bar {
      grid-template-columns: 1fr;
      padding: var(--cds-spacing-04) 0;
    }

    .rl-header__nav {
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    .rl-header__actions {
      flex-wrap: wrap;
      justify-content: flex-start;
    }
  }
</style>
