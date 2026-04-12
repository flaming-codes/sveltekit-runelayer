import {
  defineCollection,
  text,
  textarea,
  checkbox,
  select,
  blocks,
  defineBlock,
  group,
  slug,
  json,
} from "@flaming-codes/sveltekit-runelayer/schema";

const linkBlock = defineBlock({
  slug: "link_item",
  label: "Link item",
  fields: [
    { name: "label", label: "Label", ...text({ required: true }) },
    { name: "url", label: "URL", ...text({ required: true }) },
    { name: "external", label: "External", ...checkbox({ defaultValue: false }) },
  ],
});

const heroBlock = defineBlock({
  slug: "hero",
  label: "Hero",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "heading", label: "Heading", ...text({ required: true }) },
    { name: "body", label: "Body", ...textarea({ required: true, maxLength: 1200 }) },
    { name: "primaryLabel", label: "Primary CTA label", ...text() },
    { name: "primaryUrl", label: "Primary CTA URL", ...text() },
    { name: "secondaryLabel", label: "Secondary CTA label", ...text() },
    { name: "secondaryUrl", label: "Secondary CTA URL", ...text() },
    { name: "signalLabel", label: "Signal label", ...text() },
    { name: "signalValue", label: "Signal value", ...text() },
    { name: "panelEyebrow", label: "Panel eyebrow", ...text() },
    { name: "panelTitle", label: "Panel title", ...text() },
    { name: "panelCode", label: "Panel code", ...textarea() },
    {
      name: "themeTone",
      label: "Theme tone",
      ...select({
        options: [
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ],
        defaultValue: "light",
      }),
    },
  ],
});

const editorialBlock = defineBlock({
  slug: "editorial",
  label: "Editorial",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "lead", label: "Lead", ...textarea({ required: true }) },
    { name: "body", label: "Body", ...textarea({ required: true, maxLength: 2000 }) },
    { name: "asideTitle", label: "Aside title", ...text() },
    { name: "asideValue", label: "Aside value", ...text() },
    { name: "asideCaption", label: "Aside caption", ...textarea() },
  ],
});

const featureGridBlock = defineBlock({
  slug: "feature_grid",
  label: "Feature grid",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "intro", label: "Intro", ...textarea() },
    { name: "features", label: "Features", ...json() },
  ],
});

const proofBandBlock = defineBlock({
  slug: "proof_band",
  label: "Proof band",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "intro", label: "Intro", ...textarea() },
    { name: "items", label: "Items", ...json() },
    {
      name: "variant",
      label: "Variant",
      ...select({
        options: [
          { label: "Mixed", value: "mixed" },
          { label: "Metrics", value: "metrics" },
          { label: "Testimonials", value: "testimonials" },
        ],
        defaultValue: "mixed",
      }),
    },
  ],
});

const pricingTeaserBlock = defineBlock({
  slug: "pricing_teaser",
  label: "Pricing teaser",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "intro", label: "Intro", ...textarea() },
    { name: "plans", label: "Plans", ...json() },
  ],
});

const resourceCardsBlock = defineBlock({
  slug: "resource_cards",
  label: "Resource cards",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "intro", label: "Intro", ...textarea() },
    { name: "items", label: "Items", ...json() },
  ],
});

const faqPanelBlock = defineBlock({
  slug: "faq_panel",
  label: "FAQ panel",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "intro", label: "Intro", ...textarea() },
    { name: "items", label: "Items", ...json() },
  ],
});

const releaseStripBlock = defineBlock({
  slug: "release_strip",
  label: "Release strip",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "intro", label: "Intro", ...textarea() },
    { name: "items", label: "Items", ...json() },
  ],
});

const stepListBlock = defineBlock({
  slug: "step_list",
  label: "Step list",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "intro", label: "Intro", ...textarea() },
    { name: "steps", label: "Steps", ...json() },
  ],
});

const compareTableBlock = defineBlock({
  slug: "compare_table",
  label: "Compare table",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "intro", label: "Intro", ...textarea() },
    { name: "leftLabel", label: "Left column label", ...text() },
    { name: "rightLabel", label: "Right column label", ...text() },
    { name: "rows", label: "Rows", ...json() },
  ],
});

const roadmapStripBlock = defineBlock({
  slug: "roadmap_strip",
  label: "Roadmap strip",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "intro", label: "Intro", ...textarea() },
    { name: "items", label: "Items", ...json() },
  ],
});

const ctaBandBlock = defineBlock({
  slug: "cta_band",
  label: "CTA band",
  fields: [
    { name: "eyebrow", label: "Eyebrow", ...text() },
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "body", label: "Body", ...textarea({ required: true }) },
    { name: "primaryLabel", label: "Primary CTA label", ...text() },
    { name: "primaryUrl", label: "Primary CTA URL", ...text() },
    { name: "secondaryLabel", label: "Secondary CTA label", ...text() },
    { name: "secondaryUrl", label: "Secondary CTA URL", ...text() },
    {
      name: "themeTone",
      label: "Theme tone",
      ...select({
        options: [
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ],
        defaultValue: "light",
      }),
    },
  ],
});

export const siteChrome = defineCollection({
  slug: "site_chrome",
  labels: { singular: "Site chrome", plural: "Site chrome" },
  fields: [
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "handle", label: "Handle", ...text({ required: true, defaultValue: "primary" }) },
    { name: "siteName", label: "Site name", ...text({ required: true }) },
    { name: "siteTagline", label: "Site tagline", ...textarea({ required: true }) },
    { name: "siteDescription", label: "Site description", ...textarea({ required: true }) },
    { name: "announcementTitle", label: "Announcement title", ...text() },
    { name: "announcementUrl", label: "Announcement URL", ...text() },
    { name: "headerLinks", label: "Header links", ...blocks({ blocks: [linkBlock] }) },
    { name: "utilityLinks", label: "Utility links", ...blocks({ blocks: [linkBlock] }) },
    { name: "headerPrimaryCtaLabel", label: "Header CTA label", ...text() },
    { name: "headerPrimaryCtaUrl", label: "Header CTA URL", ...text() },
    { name: "footerBlurb", label: "Footer blurb", ...textarea() },
    {
      name: "footerProductLinks",
      label: "Footer product links",
      ...blocks({ blocks: [linkBlock] }),
    },
    {
      name: "footerResourceLinks",
      label: "Footer resource links",
      ...blocks({ blocks: [linkBlock] }),
    },
    {
      name: "footerCompanyLinks",
      label: "Footer company links",
      ...blocks({ blocks: [linkBlock] }),
    },
    { name: "footerLegalLinks", label: "Footer legal links", ...blocks({ blocks: [linkBlock] }) },
    { name: "socialGithubUrl", label: "GitHub URL", ...text() },
    { name: "socialDocsUrl", label: "Docs URL", ...text() },
    { name: "socialAdminUrl", label: "Admin URL", ...text() },
  ],
  admin: { useAsTitle: "title", defaultColumns: ["title", "handle", "siteName"] },
  versions: { drafts: true },
  access: { read: () => true },
});

export const pages = defineCollection({
  slug: "pages",
  labels: { singular: "Page", plural: "Pages" },
  fields: [
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "slug", label: "Slug", ...slug({ from: "title" }) },
    { name: "teaser", label: "Teaser", ...textarea({ maxLength: 320 }) },
    {
      name: "pageType",
      label: "Page type",
      ...select({
        options: [
          { label: "Home", value: "home" },
          { label: "Platform", value: "platform" },
          { label: "Docs", value: "docs" },
          { label: "Changelog", value: "changelog" },
        ],
        defaultValue: "home",
      }),
    },
    {
      name: "seo",
      label: "SEO",
      ...group({
        fields: [
          { name: "metaTitle", label: "Meta title", ...text() },
          { name: "metaDescription", label: "Meta description", ...textarea({ maxLength: 320 }) },
        ],
      }),
    },
    {
      name: "layout",
      label: "Layout",
      ...blocks({
        blocks: [
          heroBlock,
          editorialBlock,
          featureGridBlock,
          proofBandBlock,
          pricingTeaserBlock,
          resourceCardsBlock,
          faqPanelBlock,
          releaseStripBlock,
          stepListBlock,
          compareTableBlock,
          roadmapStripBlock,
          ctaBandBlock,
        ],
        minBlocks: 1,
      }),
    },
  ],
  admin: { useAsTitle: "title", defaultColumns: ["title", "slug", "pageType"] },
  versions: { drafts: true },
  access: { read: () => true },
});

export const allCollections = [siteChrome, pages];
