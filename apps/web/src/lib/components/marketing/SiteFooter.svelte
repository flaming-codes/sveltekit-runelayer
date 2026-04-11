<script lang="ts">
  import {
    ArrowRight,
    ArrowUpRight,
    Catalog,
    Code,
    Document,
    Information,
    Launch,
    LogoGithub,
  } from "carbon-icons-svelte";
  import type { SiteChrome } from "$lib/marketing.js";
  import { asLinkItems, asText } from "$lib/marketing.js";

  let { chrome }: { chrome: SiteChrome } = $props();

  type IconComponent = any;
  type FooterGroup = { title: string; icon: IconComponent; links: ReturnType<typeof asLinkItems> };
  type FooterUtilityCard = {
    title: string;
    description: string;
    href: string;
    icon: IconComponent;
    external: boolean;
  };
  type FooterMetaLink = {
    label: string;
    url: string;
    icon: IconComponent;
    external: boolean;
  };

  let groups = $derived(
    ([
      { title: "Product", icon: Catalog, links: asLinkItems(chrome.footerProductLinks) },
      { title: "Resources", icon: Document, links: asLinkItems(chrome.footerResourceLinks) },
      { title: "Company", icon: Code, links: asLinkItems(chrome.footerCompanyLinks) },
      { title: "Legal", icon: Information, links: asLinkItems(chrome.footerLegalLinks) },
    ] as FooterGroup[]).filter((group) => group.links.length > 0),
  );

  let utilityCards = $derived.by(() => {
    let cards: FooterUtilityCard[] = [];

    if (asText(chrome.socialDocsUrl)) {
      cards.push({
        title: "Documentation",
        description: "Read setup, schema, and runtime guides for the package.",
        href: asText(chrome.socialDocsUrl),
        icon: Document,
        external: isExternal(asText(chrome.socialDocsUrl)),
      });
    }

    if (asText(chrome.socialGithubUrl)) {
      cards.push({
        title: "Source code",
        description: "Inspect the repository, issues, and release work in GitHub.",
        href: asText(chrome.socialGithubUrl),
        icon: LogoGithub,
        external: isExternal(asText(chrome.socialGithubUrl)),
      });
    }

    if (asText(chrome.socialAdminUrl)) {
      cards.push({
        title: "Admin surface",
        description: "Open the example CMS that drives the public marketing pages.",
        href: asText(chrome.socialAdminUrl),
        icon: Launch,
        external: isExternal(asText(chrome.socialAdminUrl)),
      });
    }

    return cards;
  });

  let metaLinks = $derived.by(() => {
    let links: FooterMetaLink[] = [];

    if (asText(chrome.socialGithubUrl)) {
      links.push({
        label: "GitHub",
        url: asText(chrome.socialGithubUrl),
        icon: LogoGithub,
        external: isExternal(asText(chrome.socialGithubUrl)),
      });
    }

    if (asText(chrome.socialDocsUrl)) {
      links.push({
        label: "Docs",
        url: asText(chrome.socialDocsUrl),
        icon: Document,
        external: isExternal(asText(chrome.socialDocsUrl)),
      });
    }

    if (asText(chrome.socialAdminUrl)) {
      links.push({
        label: "Admin",
        url: asText(chrome.socialAdminUrl),
        icon: Launch,
        external: isExternal(asText(chrome.socialAdminUrl)),
      });
    }

    return links;
  });

  function isExternal(url: string) {
    return /^https?:\/\//.test(url);
  }
</script>

<footer class="rl-footer">
    <div class="rl-footer__theme">
      <div class="rl-container rl-footer__lead rl-shell-grid">
        <section class="rl-footer__intro">
          <p class="rl-eyebrow">Runelayer</p>
          <h2>{chrome.siteTagline}</h2>
          <p>{asText(chrome.footerBlurb, chrome.siteDescription)}</p>
        </section>

        {#if utilityCards.length}
          <div class="rl-footer__utility-grid">
            {#each utilityCards as card}
              {@const Icon = card.icon}
              <a
                href={card.href}
                class="rl-footer__utility-card"
                target={card.external ? "_blank" : undefined}
                rel={card.external ? "noreferrer" : undefined}
              >
                <span class="rl-footer__utility-icon">
                  <Icon size={20} />
                </span>
                <span class="rl-footer__utility-body">
                  <strong>{card.title}</strong>
                  <span>{card.description}</span>
                </span>
                {#if card.external}
                  <ArrowUpRight size={16} />
                {:else}
                  <ArrowRight size={16} />
                {/if}
              </a>
            {/each}
          </div>
        {/if}
      </div>

      <div class="rl-container rl-footer__lower">
        <div class="rl-footer__groups">
          {#each groups as group}
            {@const Icon = group.icon}
            <section class="rl-footer__group">
              <div class="rl-footer__group-head">
                <Icon size={18} />
                <p class="rl-footer__group-title">{group.title}</p>
              </div>
              <ul>
                {#each group.links as item}
                  <li>
                    <a
                      href={item.url}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noreferrer" : undefined}
                    >
                      <span>{item.label}</span>
                      {#if isExternal(item.url)}
                        <ArrowUpRight size={16} />
                      {/if}
                    </a>
                  </li>
                {/each}
              </ul>
            </section>
          {/each}
        </div>

        <div class="rl-footer__meta">
          <p class="rl-footer__meta-copy">
            {chrome.siteName} keeps schema, admin, auth, storage, and rendering inside one
            SvelteKit deployment surface.
          </p>

          {#if metaLinks.length}
            <div class="rl-footer__meta-links">
              {#each metaLinks as item}
                {@const Icon = item.icon}
                <a
                  href={item.url}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {#if item.external}
                    <ArrowUpRight size={16} />
                  {/if}
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
</footer>

<style>
  .rl-footer {
    margin-top: clamp(3rem, 8vw, 5rem);
  }

  .rl-footer__theme {
    border-top: 1px solid var(--rl-shell-line);
    background:
      radial-gradient(circle at top left, rgba(15, 98, 254, 0.06), transparent 34rem),
      linear-gradient(90deg, rgba(141, 141, 141, 0.12) 1px, transparent 1px),
      var(--cds-layer);
    background-size:
      auto,
      clamp(3rem, 8vw, 6rem) 100%;
    background-position:
      0 0,
      center top;
    color: var(--cds-text-primary);
  }

  .rl-footer__lead {
    display: grid;
    padding: clamp(3.5rem, 8vw, 6rem) 0 clamp(2rem, 4vw, 3rem);
  }

  .rl-footer__intro {
    grid-column: 1 / span 5;
    display: grid;
    gap: var(--cds-spacing-05);
  }

  .rl-footer__intro h2 {
    margin: 0;
    max-width: 16ch;
    font-size: clamp(2rem, 4vw, 3.2rem);
    font-weight: 300;
    line-height: 0.95;
  }

  .rl-footer__intro p:last-child {
    max-width: 34rem;
    margin: 0;
    color: var(--cds-text-secondary);
    line-height: 1.6;
  }

  .rl-footer__utility-grid {
    grid-column: 7 / -1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--cds-spacing-05);
    align-content: start;
  }

  .rl-footer__utility-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--cds-spacing-04);
    align-items: start;
    padding: 1.25rem;
    border: 1px solid var(--rl-surface-border);
    background: color-mix(in srgb, white 80%, var(--cds-layer));
    color: inherit;
    text-decoration: none;
    transition:
      border-color 120ms ease,
      transform 120ms ease,
      background-color 120ms ease;
  }

  .rl-footer__utility-card:hover {
    transform: translateY(-1px);
    border-color: var(--rl-border-strong);
    background: color-mix(in srgb, white 70%, var(--cds-layer));
  }

  .rl-footer__utility-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid var(--rl-surface-border);
    color: var(--cds-link-primary);
  }

  .rl-footer__utility-body {
    display: grid;
    gap: 0.35rem;
  }

  .rl-footer__utility-body strong {
    font-size: 1rem;
    font-weight: 600;
  }

  .rl-footer__utility-body span {
    color: var(--cds-text-secondary);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .rl-footer__lower {
    padding: 0 0 clamp(2rem, 4vw, 2.75rem);
  }

  .rl-footer__groups {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--cds-spacing-06);
    padding: var(--cds-spacing-06) 0;
    border-top: 1px solid var(--rl-shell-line);
  }

  .rl-footer__group:first-child {
    grid-column: span 2;
  }

  .rl-footer__group-head {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: var(--cds-spacing-04);
    color: var(--cds-link-primary);
  }

  .rl-footer__group-title {
    margin: 0;
    color: var(--cds-text-secondary);
    font-size: 0.75rem;
    letter-spacing: 0.32px;
    text-transform: uppercase;
  }

  .rl-footer ul {
    display: grid;
    gap: var(--cds-spacing-03);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .rl-footer a {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: inherit;
    text-decoration: none;
  }

  .rl-footer a:hover {
    color: var(--cds-text-primary);
  }

  .rl-footer__meta {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: var(--cds-spacing-05);
    align-items: center;
    padding-top: var(--cds-spacing-06);
    border-top: 1px solid var(--rl-shell-line);
  }

  .rl-footer__meta-copy {
    margin: 0;
    max-width: 44rem;
    color: var(--cds-text-secondary);
    line-height: 1.6;
  }

  .rl-footer__meta-links {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.875rem 1.25rem;
  }

  @media (max-width: 900px) {
    .rl-footer__intro,
    .rl-footer__utility-grid {
      grid-column: 1 / -1;
    }

    .rl-footer__utility-grid {
      grid-template-columns: 1fr;
    }

    .rl-footer__groups {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .rl-footer__group:first-child {
      grid-column: span 1;
    }

    .rl-footer__meta {
      grid-template-columns: 1fr;
    }

    .rl-footer__meta-links {
      justify-content: flex-start;
    }
  }

  @media (max-width: 640px) {
    .rl-footer__groups {
      grid-template-columns: 1fr;
    }
  }
</style>
