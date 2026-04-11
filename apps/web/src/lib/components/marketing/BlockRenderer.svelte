<script lang="ts">
  import { Accordion, AccordionItem, Button, Tag } from "carbon-components-svelte";
  import {
    Application,
    ArrowRight,
    Catalog,
    CheckmarkFilled,
    Code,
    Document,
    Flash,
    Idea,
    Information,
    Launch,
    Layers,
    Rule,
    WorkflowAutomation,
  } from "carbon-icons-svelte";
  import {
    ActiveServer as PictoActiveServer,
    Api as PictoApi,
    Application as PictoApplication,
    ApplicationSecurity as PictoApplicationSecurity,
    Build as PictoBuild,
    Carbon as PictoCarbon,
    Connect as PictoConnect,
    ContentDesign as PictoContentDesign,
    ContinuousDelivery as PictoContinuousDelivery,
    Database as PictoDatabase,
    Documentation as PictoDocumentation,
    Embed as PictoEmbed,
    Launch as PictoLaunch,
    OpenSource as PictoOpenSource,
    OperationalMetrics as PictoOperationalMetrics,
    Question as PictoQuestion,
    ReferenceArchitecture as PictoReferenceArchitecture,
    Rocket as PictoRocket,
    Speedometer as PictoSpeedometer,
    SystemsDevopsRelease as PictoRelease,
    UserInsights as PictoUserInsights,
  } from "carbon-pictograms-svelte";
  import type { MarketingBlock, MarketingDoc } from "$lib/marketing.js";
  import { asBlocks, asDocs, asParagraphs, asText } from "$lib/marketing.js";

  let {
    block,
    index = 0,
    total = 1,
  }: {
    block: MarketingBlock;
    index?: number;
    total?: number;
  } = $props();

  let tone = $derived(asText(block.themeTone, "light"));

  const sectionIconMap: Record<string, typeof Application> = {
    hero: Application,
    editorial: Idea,
    feature_grid: Layers,
    proof_band: Rule,
    pricing_teaser: Catalog,
    resource_cards: Document,
    faq_panel: Information,
    release_strip: Flash,
    cta_band: WorkflowAutomation,
  };

  const pictogramMap: Record<string, typeof PictoApplication> = {
    ActiveServer: PictoActiveServer,
    Api: PictoApi,
    Application: PictoApplication,
    ApplicationSecurity: PictoApplicationSecurity,
    Build: PictoBuild,
    Carbon: PictoCarbon,
    Connect: PictoConnect,
    ContentDesign: PictoContentDesign,
    ContinuousDelivery: PictoContinuousDelivery,
    Database: PictoDatabase,
    Documentation: PictoDocumentation,
    Embed: PictoEmbed,
    Launch: PictoLaunch,
    OpenSource: PictoOpenSource,
    OperationalMetrics: PictoOperationalMetrics,
    Question: PictoQuestion,
    ReferenceArchitecture: PictoReferenceArchitecture,
    Rocket: PictoRocket,
    Speedometer: PictoSpeedometer,
    SystemsDevopsRelease: PictoRelease,
    UserInsights: PictoUserInsights,
  };

  function pictogramFor(name: unknown) {
    return pictogramMap[asText(name)] ?? PictoApplication;
  }

  function sectionIcon(type: string) {
    return sectionIconMap[type] ?? Application;
  }

  function isExternal(url: string) {
    return /^https?:\/\//.test(url);
  }

  function actionIcon(url: string) {
    return isExternal(url) ? Launch : ArrowRight;
  }

  function actionKind(surfaceTone: string, priority: "primary" | "secondary") {
    if (priority === "primary") return "primary";
    return surfaceTone === "dark" ? "ghost" : "tertiary";
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

  function slugify(type: string) {
    return type.replaceAll("_", "-");
  }

  function density(type: string) {
    if (type === "hero" || type === "cta_band") return "emphasis";
    if (type === "proof_band" || type === "release_strip" || type === "resource_cards") {
      return "compact";
    }
    return "standard";
  }

  function sectionClass(type: string) {
    return [
      "rl-section",
      `rl-section--${slugify(type)}`,
      `rl-section--${density(type)}`,
      index === 0 ? "rl-section--first" : "",
      index === total - 1 ? "rl-section--last" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function pricingKind(item: MarketingDoc) {
    return asText(item.badge).toLowerCase().includes("recommended") ? "primary" : "ghost";
  }
</script>

{#if block.blockType === "hero"}
  {@const SectionIcon = sectionIcon(block.blockType)}
  <section class={sectionClass(block.blockType)}>
    <div class="rl-container">
      <div class="rl-hero" data-tone={tone}>
        <div class="rl-hero__copy">
          {#if asText(block.eyebrow)}
            <div class="rl-section-kicker">
              <span class="rl-section-kicker__icon">
                <SectionIcon size={18} />
              </span>
              <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
            </div>
          {/if}

          <h1 class="rl-section-heading">{asText(block.heading)}</h1>

          <div class="rl-hero__body">
            {#each asParagraphs(block.body) as paragraph}
              <p class="rl-section-copy">{paragraph}</p>
            {/each}
          </div>

          <div class="rl-action-group rl-action-group--hero">
            {#if asText(block.primaryLabel) && asText(block.primaryUrl)}
              <Button
                expressive
                size="xl"
                icon={actionIcon(asText(block.primaryUrl))}
                href={asText(block.primaryUrl)}
                {...linkProps(asText(block.primaryUrl))}
              >
                {asText(block.primaryLabel)}
              </Button>
            {/if}

            {#if asText(block.secondaryLabel) && asText(block.secondaryUrl)}
              <Button
                expressive
                size="xl"
                kind={actionKind(tone, "secondary")}
                icon={actionIcon(asText(block.secondaryUrl))}
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

    {#if asText(block.panelCode)}
      <div class="rl-container">
        <div class="rl-hero__code-row">
          <div class="rl-hero__code-panel">
            <div class="rl-hero__panel-head">
              <span class="rl-hero__panel-icon">
                <Code size={18} />
              </span>
              <div>
                {#if asText(block.panelEyebrow)}
                  <p class="rl-eyebrow">{asText(block.panelEyebrow)}</p>
                {/if}
                <h2>{asText(block.panelTitle)}</h2>
              </div>
            </div>
            <pre>{asText(block.panelCode)}</pre>
          </div>
        </div>
      </div>
    {/if}
  </section>
{:else if block.blockType === "editorial"}
  {@const SectionIcon = sectionIcon(block.blockType)}
  <section class={sectionClass(block.blockType)}>
    <div class="rl-container rl-editorial">
      <div class="rl-editorial__intro">
        {#if asText(block.eyebrow)}
          <div class="rl-section-kicker">
            <span class="rl-section-kicker__icon">
              <SectionIcon size={18} />
            </span>
            <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
          </div>
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
        <div class="rl-editorial__aside-head">
          <span class="rl-editorial__aside-icon">
            <Idea size={20} />
          </span>
          <p class="rl-eyebrow">{asText(block.asideTitle)}</p>
        </div>
        <strong>{asText(block.asideValue)}</strong>
        <p>{asText(block.asideCaption)}</p>
      </aside>
    </div>
  </section>
{:else if block.blockType === "feature_grid"}
  {@const SectionIcon = sectionIcon(block.blockType)}
  <section class={sectionClass(block.blockType)}>
    <div class="rl-container">
      <div class="rl-section-head">
        <div class="rl-section-head__title">
          {#if asText(block.eyebrow)}
            <div class="rl-section-kicker">
              <span class="rl-section-kicker__icon">
                <SectionIcon size={18} />
              </span>
              <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
            </div>
          {/if}
          <h2 class="rl-section-heading rl-section-heading--productive">{asText(block.title)}</h2>
        </div>

        {#if asText(block.intro)}
          <p class="rl-section-copy rl-section-head__copy">{asText(block.intro)}</p>
        {/if}
      </div>

      <div class="rl-tile-grid">
        {#each blockItems("features") as item, itemIndex}
          {@const Pictogram = pictogramFor(item.icon)}
          <a
            href={asText(item.href) || undefined}
            class="rl-tile-grid__cell"
            {...linkProps(asText(item.href))}
          >
            <h3>{asText(item.title)}</h3>
            <p>{asText(item.summary)}</p>
            <div class="rl-tile-grid__foot">
              <span class="rl-tile-grid__pictogram">
                <Pictogram />
              </span>
              {#if asText(item.href)}
                <ArrowRight size={20} />
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </div>
  </section>
{:else if block.blockType === "proof_band"}
  {@const SectionIcon = sectionIcon(block.blockType)}
  <section class={sectionClass(block.blockType)}>
    <div class="rl-container">
      <div class="rl-section-head">
        <div class="rl-section-head__title">
          {#if asText(block.eyebrow)}
            <div class="rl-section-kicker">
              <span class="rl-section-kicker__icon">
                <SectionIcon size={18} />
              </span>
              <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
            </div>
          {/if}
          <h2 class="rl-section-heading rl-section-heading--productive">{asText(block.title)}</h2>
        </div>

        {#if asText(block.intro)}
          <p class="rl-section-copy rl-section-head__copy">{asText(block.intro)}</p>
        {/if}
      </div>

      <div class="rl-tile-grid rl-tile-grid--proof">
        {#each blockItems("items") as item, itemIndex}
          <article class="rl-tile-grid__cell rl-tile-grid__cell--proof">
            {#if asText(item.kind) === "testimonial"}
              <p class="rl-proof-card__quote">"{asText(item.quote)}"</p>
              <div class="rl-proof-card__person">
                <strong>{asText(item.personName)}</strong>
                <span>{asText(item.personRole)}, {asText(item.company)}</span>
              </div>
              <div class="rl-tile-grid__foot">
                <span class="rl-tile-grid__pictogram">
                  <PictoUserInsights />
                </span>
              </div>
            {:else}
              <p class="rl-eyebrow">{asText(item.metricLabel)}</p>
              <strong class="rl-proof-card__metric">{asText(item.metricValue)}</strong>
              <p>{asText(item.label)}</p>
              <div class="rl-tile-grid__foot">
                <span class="rl-tile-grid__pictogram">
                  <PictoSpeedometer />
                </span>
              </div>
            {/if}
          </article>
        {/each}
      </div>
    </div>
  </section>
{:else if block.blockType === "pricing_teaser"}
  {@const SectionIcon = sectionIcon(block.blockType)}
  <section class={sectionClass(block.blockType)}>
    <div class="rl-container">
      <div class="rl-section-head">
        <div class="rl-section-head__title">
          {#if asText(block.eyebrow)}
            <div class="rl-section-kicker">
              <span class="rl-section-kicker__icon">
                <SectionIcon size={18} />
              </span>
              <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
            </div>
          {/if}
          <h2 class="rl-section-heading rl-section-heading--productive">{asText(block.title)}</h2>
        </div>

        {#if asText(block.intro)}
          <p class="rl-section-copy rl-section-head__copy">{asText(block.intro)}</p>
        {/if}
      </div>

      <div class="rl-tile-grid rl-tile-grid--pricing">
        {#each blockItems("plans") as item, itemIndex}
          {@const isRecommended = asText(item.badge).toLowerCase().includes("recommended")}
          <div
            class="rl-tile-grid__cell rl-tile-grid__cell--pricing"
            class:rl-tile-grid__cell--recommended={isRecommended}
          >
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

            <div class="rl-tile-grid__foot">
              <span class="rl-tile-grid__pictogram">
                {#if itemIndex === 0}
                  <PictoOpenSource />
                {:else}
                  <PictoBuild />
                {/if}
              </span>
              {#if asText(item.ctaLabel) && asText(item.ctaUrl)}
                <Button
                  kind={pricingKind(item)}
                  icon={actionIcon(asText(item.ctaUrl))}
                  href={asText(item.ctaUrl)}
                  {...linkProps(asText(item.ctaUrl))}
                >
                  {asText(item.ctaLabel)}
                </Button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>
{:else if block.blockType === "resource_cards"}
  {@const SectionIcon = sectionIcon(block.blockType)}
  <section class={sectionClass(block.blockType)}>
    <div class="rl-container">
      <div class="rl-section-head">
        <div class="rl-section-head__title">
          {#if asText(block.eyebrow)}
            <div class="rl-section-kicker">
              <span class="rl-section-kicker__icon">
                <SectionIcon size={18} />
              </span>
              <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
            </div>
          {/if}
          <h2 class="rl-section-heading rl-section-heading--productive">{asText(block.title)}</h2>
        </div>

        {#if asText(block.intro)}
          <p class="rl-section-copy rl-section-head__copy">{asText(block.intro)}</p>
        {/if}
      </div>

      <div class="rl-tile-grid">
        {#each blockItems("items") as item, itemIndex}
          <a
            href={asText(item.href)}
            class="rl-tile-grid__cell"
            {...linkProps(asText(item.href))}
          >
            <div class="rl-tile-grid__cell-head">
              <h3>{asText(item.title)}</h3>
              <Tag type={tagType(asText(item.badge, asText(item.kind)))}>
                {asText(item.badge, asText(item.kind))}
              </Tag>
            </div>
            <p>{asText(item.description)}</p>
            <div class="rl-tile-grid__foot">
              <span class="rl-tile-grid__pictogram">
                {#if asText(item.kind) === "reference"}
                  <PictoReferenceArchitecture />
                {:else if isExternal(asText(item.href))}
                  <PictoLaunch />
                {:else}
                  <PictoDocumentation />
                {/if}
              </span>
              <ArrowRight size={20} />
            </div>
          </a>
        {/each}
      </div>
    </div>
  </section>
{:else if block.blockType === "faq_panel"}
  {@const SectionIcon = sectionIcon(block.blockType)}
  <section class={sectionClass(block.blockType)}>
    <div class="rl-container rl-faq">
      <div class="rl-faq__intro">
        {#if asText(block.eyebrow)}
          <div class="rl-section-kicker">
            <span class="rl-section-kicker__icon">
              <SectionIcon size={18} />
            </span>
            <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
          </div>
        {/if}
        <h2 class="rl-section-heading rl-section-heading--productive">{asText(block.title)}</h2>
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
  {@const SectionIcon = sectionIcon(block.blockType)}
  <section class={sectionClass(block.blockType)}>
    <div class="rl-container">
      <div class="rl-section-head">
        <div class="rl-section-head__title">
          {#if asText(block.eyebrow)}
            <div class="rl-section-kicker">
              <span class="rl-section-kicker__icon">
                <SectionIcon size={18} />
              </span>
              <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
            </div>
          {/if}
          <h2 class="rl-section-heading rl-section-heading--productive">{asText(block.title)}</h2>
        </div>

        {#if asText(block.intro)}
          <p class="rl-section-copy rl-section-head__copy">{asText(block.intro)}</p>
        {/if}
      </div>

      <div class="rl-tile-grid rl-tile-grid--release">
        {#each blockItems("items") as item, itemIndex}
          <a
            href={asText(item.href)}
            class="rl-tile-grid__cell"
            {...linkProps(asText(item.href))}
          >
            <div class="rl-tile-grid__cell-head">
              <h3>{asText(item.title)}</h3>
              <Tag type="cool-gray">{asText(item.releaseLabel)}</Tag>
            </div>
            <p>{asText(item.summary)}</p>
            <div class="rl-tile-grid__foot">
              <span class="rl-tile-grid__pictogram">
                <PictoRelease />
              </span>
              <ArrowRight size={20} />
            </div>
          </a>
        {/each}
      </div>
    </div>
  </section>
{:else if block.blockType === "cta_band"}
  {#snippet ctaContent()}
    {@const SectionIcon = sectionIcon(block.blockType)}
    <div class="rl-cta-band" data-tone={tone}>
      <div class="rl-cta-band__intro">
        {#if asText(block.eyebrow)}
          <div class="rl-section-kicker">
            <span class="rl-section-kicker__icon">
              <SectionIcon size={18} />
            </span>
            <p class="rl-eyebrow">{asText(block.eyebrow)}</p>
          </div>
        {/if}
        <h2 class="rl-section-heading">{asText(block.title)}</h2>
      </div>

      <div class="rl-cta-band__content">
        {#each asParagraphs(block.body) as paragraph}
          <p class="rl-section-copy">{paragraph}</p>
        {/each}

        <div class="rl-action-group">
          {#if asText(block.primaryLabel) && asText(block.primaryUrl)}
            <Button
              size="lg"
              icon={actionIcon(asText(block.primaryUrl))}
              href={asText(block.primaryUrl)}
              {...linkProps(asText(block.primaryUrl))}
            >
              {asText(block.primaryLabel)}
            </Button>
          {/if}

          {#if asText(block.secondaryLabel) && asText(block.secondaryUrl)}
            <Button
              size="lg"
              kind={actionKind(tone, "secondary")}
              icon={actionIcon(asText(block.secondaryUrl))}
              href={asText(block.secondaryUrl)}
              {...linkProps(asText(block.secondaryUrl))}
            >
              {asText(block.secondaryLabel)}
            </Button>
          {/if}
        </div>
      </div>
    </div>
  {/snippet}

  <section class={sectionClass(block.blockType)}>
    <div class="rl-container">
      {@render ctaContent()}
    </div>
  </section>
{/if}

<style>
  .rl-section--compact {
    padding-block: clamp(2.75rem, 6vw, 4.5rem);
  }

  .rl-section--standard {
    padding-block: clamp(3.5rem, 8vw, 6rem);
  }

  .rl-section--emphasis {
    padding-block: clamp(4.5rem, 9vw, 7rem);
  }

  .rl-section--first {
    padding-top: clamp(3rem, 6vw, 5rem);
  }

  .rl-section--last {
    padding-bottom: clamp(5rem, 10vw, 7.5rem);
  }

  .rl-section-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: var(--cds-spacing-04);
  }

  .rl-section-kicker__icon {
    display: inline-grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    background: color-mix(in srgb, var(--cds-link-primary) 12%, transparent);
    color: var(--cds-link-primary);
  }

  .rl-section-kicker :global(.rl-eyebrow) {
    margin: 0;
  }

  .rl-section-head {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: clamp(1rem, 3vw, 2rem);
    align-items: end;
    margin-bottom: clamp(1.75rem, 5vw, 3.5rem);
  }

  .rl-section-head__title {
    grid-column: span 6;
  }

  .rl-section-head__copy {
    grid-column: 8 / span 5;
    margin: 0;
  }

  .rl-section-heading--productive {
    max-width: 18ch;
    font-size: clamp(1.9rem, 4vw, 3rem);
    line-height: 1;
    letter-spacing: -0.035em;
  }

  .rl-hero,
  .rl-cta-band {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: clamp(1.5rem, 4vw, 3rem);
  }

  .rl-hero__copy {
    grid-column: span 8;
  }

  .rl-cta-band__intro {
    grid-column: span 7;
  }

  .rl-cta-band__content {
    grid-column: 9 / span 4;
  }

  .rl-hero {
    color: var(--cds-text-primary);
  }

  .rl-hero__body {
    display: grid;
    gap: var(--cds-spacing-05);
  }

  .rl-hero__body :global(.rl-section-copy) {
    margin: 0;
    color: var(--cds-text-secondary);
  }

  .rl-action-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--cds-spacing-04);
    margin-top: var(--cds-spacing-06);
  }

  .rl-hero__code-row {
    margin-top: clamp(2rem, 5vw, 3.5rem);
  }

  .rl-hero__code-panel {
    display: grid;
    gap: var(--cds-spacing-04);
    padding: clamp(1.5rem, 4vw, 2rem);
    background: #161616;
    color: #f4f4f4;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .rl-hero__panel-head {
    display: flex;
    gap: var(--cds-spacing-04);
    align-items: start;
  }

  .rl-hero__panel-icon {
    display: inline-grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    background: rgba(255, 255, 255, 0.08);
    color: var(--cds-link-primary);
  }

  .rl-hero__code-panel h2 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 300;
    line-height: 1.1;
    color: #f4f4f4;
  }

  .rl-hero__code-panel :global(.rl-eyebrow) {
    color: rgba(255, 255, 255, 0.5);
  }

  .rl-hero__code-panel pre {
    overflow: auto;
    margin: 0;
    padding: var(--cds-spacing-05);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: #c6c6c6;
    font-size: 0.875rem;
    line-height: 1.55;
    white-space: pre-wrap;
  }

  .rl-editorial {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: clamp(1rem, 3vw, 2rem);
    align-items: start;
  }

  .rl-editorial__intro {
    grid-column: span 4;
  }

  .rl-editorial__content {
    grid-column: span 5;
    display: grid;
    gap: var(--cds-spacing-05);
  }

  .rl-editorial__content :global(.rl-section-copy) {
    margin: 0;
  }

  .rl-editorial__lead {
    margin: 0;
    color: var(--cds-text-primary);
    font-size: clamp(1.1rem, 2vw, 1.35rem);
    line-height: 1.55;
  }

  .rl-editorial__aside {
    grid-column: span 3;
    display: grid;
    gap: var(--cds-spacing-04);
    padding: clamp(1.5rem, 4vw, 2rem);
  }

  .rl-editorial__aside-head {
    display: flex;
    gap: var(--cds-spacing-03);
    align-items: center;
  }

  .rl-editorial__aside-icon {
    color: var(--cds-link-primary);
  }

  .rl-editorial__aside strong {
    display: block;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 300;
    line-height: 0.95;
  }

  .rl-tile-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid var(--cds-border-subtle);
  }

  .rl-tile-grid__cell {
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: var(--cds-spacing-05);
    padding: clamp(1.25rem, 3vw, 2rem);
    border: 1px solid var(--cds-border-subtle);
    margin: -1px 0 0 -1px;
    background: var(--cds-layer);
    color: inherit;
    text-decoration: none;
    transition: background-color 120ms ease;
  }

  .rl-tile-grid__cell:hover {
    background: var(--cds-layer-hover);
  }

  .rl-tile-grid__cell h3 {
    margin: 0;
    font-size: clamp(1.1rem, 1.5vw, 1.35rem);
    font-weight: 400;
    line-height: 1.2;
  }

  .rl-tile-grid__cell p {
    margin: 0;
    color: var(--cds-text-secondary);
    font-size: 0.875rem;
    line-height: 1.55;
  }

  .rl-tile-grid__foot {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: auto;
    color: var(--cds-link-primary);
  }

  .rl-tile-grid__pictogram {
    color: var(--cds-icon-secondary);
  }

  .rl-tile-grid__pictogram :global(svg) {
    width: 48px;
    height: 48px;
  }

  @media (max-width: 800px) {
    .rl-tile-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (min-width: 801px) and (max-width: 1100px) {
    .rl-tile-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .rl-tile-grid__cell-head {
    display: flex;
    justify-content: space-between;
    gap: var(--cds-spacing-04);
    align-items: start;
  }

  .rl-tile-grid--proof {
    grid-template-columns: repeat(3, 1fr);
  }

  .rl-tile-grid__cell--proof .rl-proof-card__metric {
    display: block;
    font-size: clamp(2rem, 5vw, 3.25rem);
    font-weight: 300;
    line-height: 0.95;
  }

  .rl-tile-grid__cell--proof .rl-proof-card__quote {
    margin: 0;
    font-size: 1.1rem;
    line-height: 1.65;
    color: var(--cds-text-primary);
  }

  .rl-tile-grid__cell--proof .rl-proof-card__person {
    display: grid;
    gap: 0.2rem;
  }

  .rl-tile-grid__cell--proof .rl-proof-card__person span {
    color: var(--cds-text-secondary);
  }

  .rl-tile-grid--pricing {
    grid-template-columns: repeat(2, 1fr);
  }

  .rl-tile-grid__cell--pricing {
    grid-template-rows: auto auto auto 1fr auto;
  }

  .rl-tile-grid__cell--recommended {
    border-color: color-mix(in srgb, var(--cds-link-primary) 32%, var(--cds-border-subtle));
    box-shadow: inset 0 3px 0 var(--cds-link-primary);
  }

  .rl-pricing-card__head {
    display: flex;
    justify-content: space-between;
    gap: var(--cds-spacing-04);
    align-items: start;
  }

  .rl-pricing-card__head h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 400;
    line-height: 1.15;
  }

  .rl-pricing-card__price {
    margin: 0;
    font-size: clamp(2.25rem, 5vw, 3.6rem);
    font-weight: 300;
    line-height: 0.95;
  }

  .rl-pricing-card__list {
    display: grid;
    gap: var(--cds-spacing-03);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .rl-pricing-card__list li {
    display: flex;
    align-items: start;
    gap: 0.55rem;
    color: var(--cds-text-secondary);
  }

  .rl-pricing-card__list :global(svg) {
    margin-top: 0.1rem;
    color: var(--cds-icon-primary);
  }

  .rl-tile-grid--release {
    grid-template-columns: repeat(2, 1fr);
  }

  .rl-faq {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: clamp(1.25rem, 4vw, 3rem);
    align-items: start;
  }

  .rl-faq__intro {
    grid-column: span 4;
  }

  .rl-faq__panel {
    grid-column: span 8;
    padding: clamp(1.25rem, 3vw, 2rem);
  }

  .rl-faq__panel :global(.bx--accordion__item) {
    border-top-color: var(--cds-border-subtle);
  }

  .rl-faq__panel :global(.bx--accordion__title) {
    color: var(--cds-text-primary);
    font-weight: 400;
  }

  .rl-faq__panel :global(.bx--accordion__content p + p) {
    margin-top: var(--cds-spacing-04);
  }

  .rl-cta-band {
    color: var(--cds-text-primary);
  }

  .rl-cta-band__content {
    display: grid;
    align-content: end;
    gap: var(--cds-spacing-05);
  }

  .rl-cta-band__content :global(.rl-section-copy) {
    margin: 0;
    color: var(--cds-text-secondary);
  }

  @media (max-width: 1100px) {
    .rl-section-head__title {
      grid-column: span 7;
    }

    .rl-section-head__copy {
      grid-column: 8 / span 5;
    }

    .rl-editorial__intro,
    .rl-faq__intro {
      grid-column: span 5;
    }

    .rl-editorial__content,
    .rl-faq__panel {
      grid-column: span 7;
    }

    .rl-editorial__aside {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 960px) {
    .rl-section-head,
    .rl-hero,
    .rl-editorial,
    .rl-faq,
    .rl-cta-band {
      grid-template-columns: 1fr;
    }

    .rl-section-head__title,
    .rl-section-head__copy,
    .rl-hero__copy,
    .rl-editorial__intro,
    .rl-editorial__content,
    .rl-editorial__aside,
    .rl-faq__intro,
    .rl-faq__panel,
    .rl-cta-band__intro,
    .rl-cta-band__content {
      grid-column: 1 / -1;
    }

    .rl-tile-grid--pricing,
    .rl-tile-grid--release {
      grid-template-columns: 1fr;
    }
  }
</style>
