<script lang="ts">
  import {
    Accordion,
    AccordionItem,
    Button,
    ClickableTile,
    Tag,
    Tile,
  } from "carbon-components-svelte";
  import {
    Api,
    Application,
    ArrowRight,
    ArrowUpRight,
    Catalog,
    CheckmarkFilled,
    CloudApp,
    Code,
    CodeReference,
    DataBase,
    Document,
    Flash,
    Flow,
    Notebook,
    Security,
    Task,
    Terminal,
  } from "carbon-icons-svelte";
  import type { MarketingBlock } from "$lib/marketing.js";
  import {
    asBlocks,
    asDocs,
    asParagraphs,
    asText,
  } from "$lib/marketing.js";

  let { block }: { block: MarketingBlock } = $props();

  const iconMap: Record<string, typeof Application> = {
    Api,
    Application,
    ArrowUpRight,
    Catalog,
    CloudApp,
    Code,
    CodeReference,
    DataBase,
    Document,
    Flash,
    Flow,
    Notebook,
    Security,
    Task,
    Terminal,
  };

  function iconFor(name: unknown) {
    return iconMap[asText(name)] ?? Application;
  }

  function isExternal(url: string) {
    return /^https?:\/\//.test(url);
  }

  function tagType(value: string) {
    const lower = value.toLowerCase();
    if (lower.includes("recommended")) return "green";
    if (lower.includes("mit")) return "teal";
    if (lower.includes("guide")) return "blue";
    if (lower.includes("reference")) return "purple";
    if (lower.includes("live")) return "magenta";
    return "gray";
  }

  function blockItems(field: string) {
    return asDocs(block[field]);
  }

  function linkProps(url: string) {
    return {
      target: isExternal(url) ? "_blank" : undefined,
      rel: isExternal(url) ? "noreferrer" : undefined,
    };
  }
</script>

{#if block.blockType === "hero"}
  <section class="rl-section">
    <div class="rl-container rl-hero" data-tone={asText(block.themeTone, "light")}>
      <div class="rl-hero__copy">
        {#if asText(block.eyebrow)}
          <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
        {/if}
        <h1 class="rl-section-heading">{asText(block.heading)}</h1>
        {#each asParagraphs(block.body) as paragraph}
          <p class="rl-section-copy">{paragraph}</p>
        {/each}

        <div class="rl-button-row">
          {#if asText(block.primaryLabel) && asText(block.primaryUrl)}
            <Button href={asText(block.primaryUrl)} {...linkProps(asText(block.primaryUrl))}>
              {asText(block.primaryLabel)}
            </Button>
          {/if}
          {#if asText(block.secondaryLabel) && asText(block.secondaryUrl)}
            <Button
              kind="tertiary"
              href={asText(block.secondaryUrl)}
              {...linkProps(asText(block.secondaryUrl))}
            >
              {asText(block.secondaryLabel)}
            </Button>
          {/if}
        </div>

        {#if asText(block.signalLabel) || asText(block.signalValue)}
          <div class="rl-hero__signal rl-surface">
            <span>{asText(block.signalLabel)}</span>
            <strong>{asText(block.signalValue)}</strong>
          </div>
        {/if}
      </div>

      <div class="rl-hero__panel rl-surface">
        {#if asText(block.panelEyebrow)}
          <p class="rl-eyebrow">{asText(block.panelEyebrow)}</p>
        {/if}
        <h2>{asText(block.panelTitle)}</h2>
        <pre>{asText(block.panelCode)}</pre>
      </div>
    </div>
  </section>
{:else if block.blockType === "editorial"}
  <section class="rl-section">
    <div class="rl-container rl-editorial">
      <div>
        {#if asText(block.eyebrow)}
          <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
        {/if}
        <h2 class="rl-section-heading">{asText(block.title)}</h2>
      </div>

      <div class="rl-editorial__content">
        <p class="rl-editorial__lead">{asText(block.lead)}</p>
        {#each asParagraphs(block.body) as paragraph}
          <p class="rl-section-copy">{paragraph}</p>
        {/each}
      </div>

      <aside class="rl-editorial__aside rl-surface">
        <p class="rl-eyebrow">{asText(block.asideTitle)}</p>
        <strong>{asText(block.asideValue)}</strong>
        <p>{asText(block.asideCaption)}</p>
      </aside>
    </div>
  </section>
{:else if block.blockType === "feature_grid"}
  <section class="rl-section">
    <div class="rl-container">
      {#if asText(block.eyebrow)}
        <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
      {/if}
      <div class="rl-section-head">
        <h2 class="rl-section-heading">{asText(block.title)}</h2>
        {#if asText(block.intro)}
          <p class="rl-section-copy">{asText(block.intro)}</p>
        {/if}
      </div>

      <div class="rl-card-grid rl-feature-grid">
        {#each blockItems("features") as item}
          {@const Icon = iconFor(item.icon)}
          <div class="rl-card-shell rl-card-shell--feature">
            <Tile class="rl-surface">
              <div class="rl-feature-card__top">
                <span class="rl-feature-card__icon">
                  <Icon size={24} />
                </span>
                {#if asText(item.badge)}
                  <Tag type={tagType(asText(item.badge))}>{asText(item.badge)}</Tag>
                {/if}
              </div>
              <h3>{asText(item.title)}</h3>
              <p>{asText(item.summary)}</p>
              <div class="rl-feature-card__foot">
                <span>{asText(item.stat)}</span>
                {#if asText(item.href)}
                  <a href={asText(item.href)} class="rl-link-arrow">
                    Explore
                    <ArrowRight size={16} />
                  </a>
                {/if}
              </div>
            </Tile>
          </div>
        {/each}
      </div>
    </div>
  </section>
{:else if block.blockType === "proof_band"}
  <section class="rl-section">
    <div class="rl-container">
      {#if asText(block.eyebrow)}
        <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
      {/if}
      <div class="rl-section-head">
        <h2 class="rl-section-heading">{asText(block.title)}</h2>
        {#if asText(block.intro)}
          <p class="rl-section-copy">{asText(block.intro)}</p>
        {/if}
      </div>

      <div class="rl-card-grid rl-proof-grid">
        {#each blockItems("items") as item}
          <div class="rl-proof-card rl-surface">
            {#if asText(item.kind) === "testimonial"}
              <p class="rl-proof-card__quote">“{asText(item.quote)}”</p>
              <strong>{asText(item.personName)}</strong>
              <span>{asText(item.personRole)}</span>
              <p>{asText(item.company)}</p>
            {:else}
              <p class="rl-eyebrow">{asText(item.metricLabel)}</p>
              <strong class="rl-proof-card__metric">{asText(item.metricValue)}</strong>
              <p>{asText(item.label)}</p>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </section>
{:else if block.blockType === "pricing_teaser"}
  <section class="rl-section">
    <div class="rl-container">
      {#if asText(block.eyebrow)}
        <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
      {/if}
      <div class="rl-section-head">
        <h2 class="rl-section-heading">{asText(block.title)}</h2>
        {#if asText(block.intro)}
          <p class="rl-section-copy">{asText(block.intro)}</p>
        {/if}
      </div>

      <div class="rl-card-grid rl-pricing-grid">
        {#each blockItems("plans") as item}
          <div class="rl-card-shell rl-card-shell--pricing">
            <Tile class="rl-surface">
              <div class="rl-pricing-card__head">
                <div>
                  <p class="rl-eyebrow">{asText(item.audience)}</p>
                  <h3>{asText(item.title)}</h3>
                </div>
                {#if asText(item.badge)}
                  <Tag type={tagType(asText(item.badge))}>{asText(item.badge)}</Tag>
                {/if}
              </div>
              <p class="rl-pricing-card__price">{asText(item.priceLabel)}</p>
              <p>{asText(item.description)}</p>
              <ul class="rl-pricing-card__list">
                {#each asBlocks(item.planFeatures) as feature}
                  <li>
                    <CheckmarkFilled size={16} />
                    <span>{asText(feature.label)}</span>
                  </li>
                {/each}
              </ul>
              {#if asText(item.ctaLabel) && asText(item.ctaUrl)}
                <Button
                  kind={asText(item.badge).toLowerCase().includes("recommended") ? "primary" : "secondary"}
                  href={asText(item.ctaUrl)}
                  {...linkProps(asText(item.ctaUrl))}
                >
                  {asText(item.ctaLabel)}
                </Button>
              {/if}
            </Tile>
          </div>
        {/each}
      </div>
    </div>
  </section>
{:else if block.blockType === "resource_cards"}
  <section class="rl-section">
    <div class="rl-container">
      {#if asText(block.eyebrow)}
        <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
      {/if}
      <div class="rl-section-head">
        <h2 class="rl-section-heading">{asText(block.title)}</h2>
        {#if asText(block.intro)}
          <p class="rl-section-copy">{asText(block.intro)}</p>
        {/if}
      </div>

      <div class="rl-card-grid rl-resource-grid">
        {#each blockItems("items") as item}
          {@const Icon = iconFor(
            asText(item.kind) === "reference"
              ? "CodeReference"
              : asText(item.kind) === "example"
                ? "ArrowUpRight"
                : "Document",
          )}
          <div class="rl-card-shell rl-card-shell--resource">
            <ClickableTile class="rl-surface" href={asText(item.href)}>
              <div class="rl-resource-card__icon"><Icon size={24} /></div>
              <div>
                <Tag type={tagType(asText(item.badge, asText(item.kind)))}>{asText(item.badge, asText(item.kind))}</Tag>
                <h3>{asText(item.title)}</h3>
                <p>{asText(item.description)}</p>
              </div>
            </ClickableTile>
          </div>
        {/each}
      </div>
    </div>
  </section>
{:else if block.blockType === "faq_panel"}
  <section class="rl-section">
    <div class="rl-container rl-faq">
      <div>
        {#if asText(block.eyebrow)}
          <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
        {/if}
        <h2 class="rl-section-heading">{asText(block.title)}</h2>
        {#if asText(block.intro)}
          <p class="rl-section-copy">{asText(block.intro)}</p>
        {/if}
      </div>

      <div class="rl-faq__panel rl-surface">
        <Accordion align="start">
          {#each blockItems("items") as item}
            <AccordionItem title={asText(item.question)}>
              {#each asParagraphs(item.answer) as paragraph}
                <p>{paragraph}</p>
              {/each}
            </AccordionItem>
          {/each}
        </Accordion>
      </div>
    </div>
  </section>
{:else if block.blockType === "release_strip"}
  <section class="rl-section">
    <div class="rl-container">
      {#if asText(block.eyebrow)}
        <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
      {/if}
      <div class="rl-section-head">
        <h2 class="rl-section-heading">{asText(block.title)}</h2>
        {#if asText(block.intro)}
          <p class="rl-section-copy">{asText(block.intro)}</p>
        {/if}
      </div>

      <div class="rl-release-strip">
        {#each blockItems("items") as item}
          <article class="rl-release-item rl-surface">
            <Tag type="gray">{asText(item.releaseLabel)}</Tag>
            <h3>{asText(item.title)}</h3>
            <p>{asText(item.summary)}</p>
            <a href={asText(item.href)} class="rl-link-arrow">
              Read more
              <ArrowRight size={16} />
            </a>
          </article>
        {/each}
      </div>
    </div>
  </section>
{:else if block.blockType === "cta_band"}
  <section class="rl-section">
    <div class="rl-container">
      <div class="rl-cta-band rl-surface" data-tone={asText(block.themeTone, "light")}>
        <div>
          {#if asText(block.eyebrow)}
            <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
          {/if}
          <h2 class="rl-section-heading">{asText(block.title)}</h2>
        </div>
        <div>
          {#each asParagraphs(block.body) as paragraph}
            <p class="rl-section-copy">{paragraph}</p>
          {/each}
          <div class="rl-button-row">
            {#if asText(block.primaryLabel) && asText(block.primaryUrl)}
              <Button href={asText(block.primaryUrl)} {...linkProps(asText(block.primaryUrl))}>
                {asText(block.primaryLabel)}
              </Button>
            {/if}
            {#if asText(block.secondaryLabel) && asText(block.secondaryUrl)}
              <Button
                kind="tertiary"
                href={asText(block.secondaryUrl)}
                {...linkProps(asText(block.secondaryUrl))}
              >
                {asText(block.secondaryLabel)}
              </Button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </section>
{/if}

<style>
  .rl-section-head {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: clamp(1.5rem, 5vw, 4rem);
    align-items: end;
    margin-bottom: clamp(2rem, 5vw, 3.5rem);
  }

  .rl-hero,
  .rl-editorial,
  .rl-faq,
  .rl-cta-band {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.9fr);
    gap: clamp(1.5rem, 5vw, 4rem);
  }

  .rl-hero {
    align-items: stretch;
  }

  .rl-hero[data-tone="dark"] {
    padding: clamp(2rem, 5vw, 3rem);
    background: var(--cds-background-inverse);
    color: var(--cds-text-inverse);
    border: 1px solid color-mix(in srgb, var(--cds-text-inverse) 10%, transparent);
  }

  .rl-hero[data-tone="dark"] .rl-section-copy,
  .rl-hero[data-tone="dark"] .rl-eyebrow {
    color: color-mix(in srgb, var(--cds-text-inverse) 72%, transparent);
  }

  .rl-hero[data-tone="light"] .rl-hero__panel,
  .rl-editorial__aside,
  .rl-faq__panel,
  .rl-cta-band {
    padding: clamp(1.5rem, 4vw, 2rem);
  }

  .rl-hero__panel h2 {
    margin: 0 0 var(--cds-spacing-04);
    font-size: 1.4rem;
    font-weight: 300;
  }

  .rl-hero__panel pre {
    overflow: auto;
    margin: 0;
    padding: var(--cds-spacing-05);
    background: rgba(0, 0, 0, 0.08);
    font-size: 0.875rem;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .rl-hero[data-tone="dark"] .rl-hero__panel {
    background: color-mix(in srgb, var(--cds-text-inverse) 4%, transparent);
    border: 1px solid color-mix(in srgb, var(--cds-text-inverse) 12%, transparent);
  }

  .rl-hero__signal {
    display: inline-grid;
    gap: 0.35rem;
    width: fit-content;
    margin-top: var(--cds-spacing-05);
    padding: var(--cds-spacing-04) var(--cds-spacing-05);
  }

  .rl-hero__signal span {
    color: var(--cds-text-secondary);
    font-size: 0.75rem;
    letter-spacing: 0.32px;
    text-transform: uppercase;
  }

  .rl-hero__signal strong {
    font-size: 1rem;
    font-weight: 600;
  }

  .rl-editorial__lead {
    margin: 0 0 var(--cds-spacing-05);
    font-size: 1.125rem;
    line-height: 1.6;
  }

  .rl-editorial__aside strong {
    display: block;
    margin-bottom: var(--cds-spacing-03);
    font-size: 2rem;
    font-weight: 300;
  }

  .rl-feature-grid,
  .rl-proof-grid,
  .rl-pricing-grid,
  .rl-resource-grid {
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  .rl-card-shell,
  .rl-proof-card,
  .rl-card-shell :global(.bx--tile),
  .rl-card-shell :global(.bx--tile--clickable) {
    display: grid;
    gap: var(--cds-spacing-04);
    height: 100%;
  }

  .rl-card-shell,
  .rl-proof-card {
    grid-column: span 6;
  }

  .rl-card-shell :global(.bx--tile),
  .rl-card-shell :global(.bx--tile--clickable) {
    padding: var(--cds-spacing-06);
  }

  .rl-feature-card__top,
  .rl-pricing-card__head {
    display: flex;
    justify-content: space-between;
    gap: var(--cds-spacing-04);
    align-items: start;
  }

  .rl-feature-card__icon {
    display: inline-grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    background: var(--rl-accent-soft);
    color: var(--cds-link-primary);
  }

  .rl-feature-card__foot {
    display: flex;
    justify-content: space-between;
    gap: var(--cds-spacing-04);
    align-items: center;
    margin-top: auto;
  }

  .rl-proof-card__metric {
    display: block;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 300;
    line-height: 0.95;
  }

  .rl-proof-card__quote {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.6;
  }

  .rl-pricing-card__price {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3.4rem);
    font-weight: 300;
    line-height: 0.95;
  }

  .rl-pricing-card__list {
    display: grid;
    gap: var(--cds-spacing-03);
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .rl-pricing-card__list li {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .rl-card-shell--resource :global(.bx--tile--clickable) {
    grid-template-columns: auto 1fr;
    align-items: start;
    text-decoration: none;
    color: inherit;
  }

  .rl-resource-card__icon {
    display: inline-grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    background: var(--cds-background-inverse);
    color: var(--cds-text-inverse);
  }

  .rl-release-strip {
    display: grid;
    gap: var(--cds-spacing-05);
  }

  .rl-release-item {
    display: grid;
    gap: var(--cds-spacing-04);
    padding: var(--cds-spacing-06);
  }

  .rl-cta-band[data-tone="dark"] {
    background: var(--cds-background-inverse);
    color: var(--cds-text-inverse);
  }

  .rl-cta-band[data-tone="dark"] .rl-section-copy,
  .rl-cta-band[data-tone="dark"] .rl-eyebrow {
    color: color-mix(in srgb, var(--cds-text-inverse) 72%, transparent);
  }

  .rl-cta-band[data-tone="light"] {
    background: white;
  }

  @media (max-width: 960px) {
    .rl-section-head,
    .rl-hero,
    .rl-editorial,
    .rl-faq,
    .rl-cta-band {
      grid-template-columns: 1fr;
    }

    .rl-card-shell,
    .rl-proof-card,
    .rl-card-shell :global(.bx--tile),
    .rl-card-shell :global(.bx--tile--clickable) {
      grid-column: 1 / -1;
    }
  }
</style>
