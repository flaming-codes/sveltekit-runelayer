<script lang="ts">
  import { ArrowUpRight } from "carbon-icons-svelte";
  import type { SiteChrome } from "$lib/marketing.js";
  import { asLinkItems, asText } from "$lib/marketing.js";

  let { chrome }: { chrome: SiteChrome } = $props();

  let groups = $derived([
    { title: "Product", links: asLinkItems(chrome.footerProductLinks) },
    { title: "Resources", links: asLinkItems(chrome.footerResourceLinks) },
    { title: "Company", links: asLinkItems(chrome.footerCompanyLinks) },
    { title: "Legal", links: asLinkItems(chrome.footerLegalLinks) },
  ]);

  function isExternal(url: string) {
    return /^https?:\/\//.test(url);
  }
</script>

<footer class="rl-footer">
  <div class="rl-container rl-footer__inner">
    <section class="rl-footer__intro">
      <p class="rl-eyebrow">Runelayer</p>
      <h2>{chrome.siteTagline}</h2>
      <p>{asText(chrome.footerBlurb, chrome.siteDescription)}</p>
    </section>

    <div class="rl-footer__groups">
      {#each groups as group}
        <section>
          <p class="rl-footer__group-title">{group.title}</p>
          <ul>
            {#each group.links as item}
              <li>
                <a
                  href={item.url}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                >
                  {item.label}
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
  </div>
</footer>

<style>
  .rl-footer {
    border-top: 1px solid var(--cds-border-subtle);
    background: var(--cds-background-inverse);
    color: var(--cds-text-inverse);
  }

  .rl-footer__inner {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 2fr);
    gap: clamp(2rem, 6vw, 5rem);
    padding: clamp(3rem, 8vw, 5rem) 0;
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
    color: color-mix(in srgb, var(--cds-text-inverse) 78%, transparent);
    line-height: 1.6;
  }

  .rl-footer__groups {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--cds-spacing-05);
  }

  .rl-footer__group-title {
    margin: 0 0 var(--cds-spacing-04);
    color: color-mix(in srgb, var(--cds-text-inverse) 62%, transparent);
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
    gap: 0.25rem;
    color: inherit;
    text-decoration: none;
  }

  .rl-footer a:hover {
    color: white;
  }

  @media (max-width: 900px) {
    .rl-footer__inner {
      grid-template-columns: 1fr;
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
