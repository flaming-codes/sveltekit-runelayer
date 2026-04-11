<script lang="ts">
  import {
    ArrowUpRight,
    Close,
    Document,
    Launch,
    LogoGithub,
    Menu,
  } from "carbon-icons-svelte";
  import { Pattern as PictoPattern } from "carbon-pictograms-svelte";
  import type { SiteChrome } from "$lib/marketing.js";
  import { asLinkItems, asText } from "$lib/marketing.js";

  let { chrome, currentPath = "/" }: { chrome: SiteChrome; currentPath?: string } = $props();

  let mobileNavOpen = $state(false);

  let headerLinks = $derived(asLinkItems(chrome.headerLinks));
  let utilityLinks = $derived(asLinkItems(chrome.utilityLinks));
  function isActive(url: string) {
    if (url === "/") return currentPath === "/";
    return currentPath === url || currentPath.startsWith(`${url}/`);
  }

  function isExternal(url: string) {
    return /^https?:\/\//.test(url);
  }

  function closeMenu() {
    mobileNavOpen = false;
  }

  function utilityIcon(label: string, url: string) {
    let value = `${label} ${url}`.toLowerCase();
    if (value.includes("github")) return LogoGithub;
    if (value.includes("doc")) return Document;
    if (value.includes("admin")) return Launch;
    return ArrowUpRight;
  }
</script>

<header class="rl-header">
  <a href="#main-content" class="rl-header__skip-link">Skip to content</a>

  <div class="rl-container rl-header__bar rl-shell-grid">
    <a href="/" class="rl-header__brand" aria-label="Runelayer home" onclick={closeMenu}>
      <span class="rl-header__brand-mark"><PictoPattern /></span>
      <span class="rl-header__brand-copy">
        <strong>{chrome.siteName}</strong>
        <span>CMS-as-a-package</span>
      </span>
    </a>

    <button
      type="button"
      class="rl-header__menu-toggle"
      aria-expanded={mobileNavOpen}
      aria-controls="site-shell-nav"
      onclick={() => (mobileNavOpen = !mobileNavOpen)}
    >
      <span>{mobileNavOpen ? "Close" : "Menu"}</span>
      {#if mobileNavOpen}
        <Close size={20} />
      {:else}
        <Menu size={20} />
      {/if}
    </button>

    <div
      id="site-shell-nav"
      class:rl-header__panel--open={mobileNavOpen}
      class="rl-header__panel"
    >
      <nav class="rl-header__nav" aria-label="Primary navigation">
        {#each headerLinks as item}
          <a
            href={item.url}
            class:rl-header__nav-link--active={isActive(item.url)}
            class="rl-header__nav-link"
            onclick={closeMenu}
          >
            {item.label}
          </a>
        {/each}
      </nav>

      <div class="rl-header__actions">
        {#each utilityLinks as item}
          {@const Icon = utilityIcon(item.label, item.url)}
          <a
            href={item.url}
            class="rl-header__utility-link"
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noreferrer" : undefined}
            onclick={closeMenu}
          >
            <Icon size={16} />
            <span>{item.label}</span>
            {#if item.external}
              <ArrowUpRight size={16} />
            {/if}
          </a>
        {/each}

      </div>
    </div>
  </div>
</header>

<style>
  .rl-header {
    position: sticky;
    top: 0;
    z-index: 20;
    color: #161616;
    backdrop-filter: blur(16px);
    background: rgba(255, 255, 255, 0.94);
    border-bottom: 1px solid rgba(22, 22, 22, 0.08);
  }

  .rl-header__skip-link {
    position: absolute;
    left: var(--cds-spacing-05);
    top: var(--cds-spacing-05);
    transform: translateY(-160%);
    padding: 0.65rem 1rem;
    background: var(--cds-background);
    color: var(--cds-text-primary);
    text-decoration: none;
    transition: transform 120ms ease;
  }

  .rl-header__skip-link:focus {
    transform: translateY(0);
  }

  .rl-header__bar {
    position: relative;
    align-items: center;
    min-height: 5rem;
  }

  .rl-header__brand {
    display: inline-flex;
    align-items: center;
    gap: var(--cds-spacing-03);
    grid-column: 1 / span 3;
    min-width: 0;
    color: inherit;
    text-decoration: none;
  }

  .rl-header__brand-mark {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    color: #161616;
  }

  .rl-header__brand-mark :global(svg) {
    width: 2.5rem;
    height: 2.5rem;
  }

  .rl-header__brand-copy {
    display: grid;
    min-width: 0;
  }

  .rl-header__brand-copy strong {
    font-size: 1rem;
    font-weight: 600;
    color: #161616;
  }

  .rl-header__brand-copy span {
    color: #525252;
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rl-header__menu-toggle {
    display: none;
    grid-column: 12;
    justify-self: end;
    align-items: center;
    gap: 0.45rem;
    padding: 0;
    border: 0;
    background: none;
    color: #161616;
    font: inherit;
  }

  .rl-header__nav {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    justify-content: flex-start;
  }

  .rl-header__nav-link,
  .rl-header__utility-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #525252;
    text-decoration: none;
    font-size: 0.875rem;
  }

  .rl-header__nav-link--active,
  .rl-header__nav-link:hover,
  .rl-header__utility-link:hover {
    color: #161616;
  }

  .rl-header__nav-link--active {
    text-decoration: underline;
    text-underline-offset: 0.35rem;
  }

  .rl-header__utility-link {
    white-space: nowrap;
  }

  .rl-header__panel {
    grid-column: 4 / -1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--cds-spacing-05);
    align-items: center;
  }

  .rl-header__actions {
    display: flex;
    align-items: center;
    gap: var(--cds-spacing-04);
    justify-content: flex-end;
  }


  @media (max-width: 960px) {
    .rl-header__bar {
      min-height: 4rem;
      padding: var(--cds-spacing-04) 0;
    }

    .rl-header__brand {
      grid-column: 1 / span 9;
    }

    .rl-header__menu-toggle {
      display: inline-flex;
    }

    .rl-header__panel {
      grid-column: 1 / -1;
      display: none;
      grid-template-columns: 1fr;
      gap: var(--cds-spacing-05);
      padding: var(--cds-spacing-05) 0 var(--cds-spacing-03);
      border-top: 1px solid rgba(22, 22, 22, 0.08);
    }

    .rl-header__panel--open {
      display: grid;
    }

    .rl-header__nav {
      display: grid;
      gap: var(--cds-spacing-03);
    }

    .rl-header__nav-link {
      justify-content: space-between;
      padding: 0.55rem 0;
      border-bottom: 1px solid rgba(22, 22, 22, 0.08);
    }

    .rl-header__actions {
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
    }

    .rl-header__utility-link {
      justify-content: space-between;
      padding: 0.3rem 0;
    }


    .rl-header__brand-copy span {
      max-width: 26ch;
    }
  }

  @media (max-width: 640px) {
    .rl-header__brand {
      grid-column: 1 / span 8;
    }

    .rl-header__brand-copy span {
      display: none;
    }
  }
</style>
