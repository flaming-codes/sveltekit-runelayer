<script lang="ts">
  import { ArrowRight, ArrowUpRight, LogoGithub, Document, Launch } from "carbon-icons-svelte";
  import type { SiteChrome } from "$lib/marketing.js";
  import { asLinkItems, asText } from "$lib/marketing.js";

  let { chrome }: { chrome: SiteChrome } = $props();

  type FooterGroup = {
    title: string;
    links: ReturnType<typeof asLinkItems>;
  };

  type FooterUtilityCard = {
    title: string;
    description: string;
    href: string;
    icon: typeof Document;
    external: boolean;
  };

  let groups = $derived(
    ([
      { title: "Product", links: asLinkItems(chrome.footerProductLinks) },
      { title: "Resources", links: asLinkItems(chrome.footerResourceLinks) },
      { title: "Company", links: asLinkItems(chrome.footerCompanyLinks) },
      { title: "Legal", links: asLinkItems(chrome.footerLegalLinks) },
    ] as FooterGroup[]).filter((g) => g.links.length > 0),
  );

  let utilityCards = $derived.by(() => {
    let cards: FooterUtilityCard[] = [];
    let docsUrl = asText(chrome.socialDocsUrl);
    let githubUrl = asText(chrome.socialGithubUrl);
    let adminUrl = asText(chrome.socialAdminUrl);

    if (docsUrl) {
      cards.push({
        title: "Documentation",
        description: "Setup, schema, and runtime guides.",
        href: docsUrl,
        icon: Document,
        external: isExternal(docsUrl),
      });
    }
    if (githubUrl) {
      cards.push({
        title: "Source code",
        description: "Repository, issues, and releases.",
        href: githubUrl,
        icon: LogoGithub,
        external: isExternal(githubUrl),
      });
    }
    if (adminUrl) {
      cards.push({
        title: "Admin surface",
        description: "Example CMS driving this site.",
        href: adminUrl,
        icon: Launch,
        external: isExternal(adminUrl),
      });
    }
    return cards;
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
        <div class="rl-footer__utility rl-tile-grid">
          {#each utilityCards as card}
            {@const Icon = card.icon}
            <a
              href={card.href}
              class="rl-tile-grid__cell rl-footer__utility-cell"
              target={card.external ? "_blank" : undefined}
              rel={card.external ? "noreferrer" : undefined}
            >
              <span class="rl-footer__utility-icon">
                <Icon size={20} />
              </span>
              <strong>{card.title}</strong>
              <p>{card.description}</p>
              <div class="rl-tile-grid__foot">
                <span></span>
                {#if card.external}
                  <ArrowUpRight size={20} />
                {:else}
                  <ArrowRight size={20} />
                {/if}
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>

    <div class="rl-container rl-footer__lower">
      <div class="rl-footer__groups">
        {#each groups as group}
          <section class="rl-footer__group">
            <p class="rl-footer__group-title">{group.title}</p>
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
          {chrome.siteName} &mdash; schema, admin, auth, storage, and rendering in one SvelteKit
          surface.
        </p>
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
    background: var(--cds-layer);
    color: var(--cds-text-primary);
  }

  /* --- Lead section: intro + utility cards --- */

  .rl-footer__lead {
    display: grid;
    padding: var(--rl-section-standard) 0 var(--rl-section-compact);
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

  /* Utility cards reuse the site-wide tile grid */

  .rl-footer__utility {
    grid-column: 7 / -1;
    grid-template-columns: 1fr;
    align-content: start;
  }

  .rl-footer__utility-cell {
    grid-template-rows: auto auto 1fr auto;
  }

  .rl-footer__utility-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--rl-surface-border);
    color: var(--cds-link-primary);
  }

  .rl-footer__utility-cell strong {
    font-size: 1rem;
    font-weight: 600;
  }

  .rl-footer__utility-cell p {
    margin: 0;
  }

  /* --- Lower section: link groups + meta --- */

  .rl-footer__lower {
    padding-bottom: clamp(2rem, 4vw, 2.75rem);
  }

  .rl-footer__groups {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--cds-spacing-06);
    padding: var(--cds-spacing-06) 0;
    border-top: 1px solid var(--rl-shell-line);
  }

  .rl-footer__group-title {
    margin: 0 0 var(--cds-spacing-04);
    color: var(--cds-text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
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
    padding-top: var(--cds-spacing-06);
    border-top: 1px solid var(--rl-shell-line);
  }

  .rl-footer__meta-copy {
    margin: 0;
    max-width: 44rem;
    color: var(--cds-text-secondary);
    font-size: 0.875rem;
    line-height: 1.6;
  }

  /* --- Responsive --- */

  @media (max-width: 900px) {
    .rl-footer__intro,
    .rl-footer__utility {
      grid-column: 1 / -1;
    }

    .rl-footer__groups {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .rl-footer__groups {
      grid-template-columns: 1fr;
    }
  }
</style>
