import {
  defineCollection,
  text,
  textarea,
  richText,
  slug,
  checkbox,
  number,
  select,
  blocks,
  defineBlock,
  group,
} from "@flaming-codes/sveltekit-runelayer/schema";

// ---------------------------------------------------------------------------
// Shared block definitions
// ---------------------------------------------------------------------------

const HeroBlock = defineBlock({
  slug: "hero",
  label: "Hero",
  fields: [
    { name: "heading", label: "Heading", ...text({ required: true }) },
    { name: "subheading", label: "Subheading", ...textarea() },
    {
      name: "align",
      label: "Alignment",
      ...select({
        options: [
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
        ],
        defaultValue: "left",
      }),
    },
  ],
});

const RichTextBlock = defineBlock({
  slug: "richtext",
  label: "Rich Text",
  fields: [{ name: "body", label: "Body", ...richText() }],
});

const CTABlock = defineBlock({
  slug: "cta",
  label: "Call to Action",
  fields: [
    {
      name: "cta",
      label: "CTA",
      ...group({
        fields: [
          { name: "label", label: "Button Label", ...text({ required: true }) },
          { name: "url", label: "Button URL", ...text({ required: true }) },
        ],
      }),
    },
  ],
});

const ImageBlock = defineBlock({
  slug: "image",
  label: "Image",
  fields: [
    { name: "imageUrl", label: "Image URL", ...text() },
    { name: "imageAlt", label: "Image Alt", ...text() },
    { name: "caption", label: "Caption", ...textarea() },
  ],
});

const QuoteBlock = defineBlock({
  slug: "quote",
  label: "Quote",
  fields: [
    { name: "text", label: "Quote Text", ...textarea({ required: true }) },
    { name: "attribution", label: "Attribution", ...text() },
  ],
});

const CalloutBlock = defineBlock({
  slug: "callout",
  label: "Callout",
  fields: [
    { name: "title", label: "Title", ...text() },
    { name: "body", label: "Body", ...textarea({ required: true }) },
    {
      name: "type",
      label: "Type",
      ...select({
        options: [
          { label: "Info", value: "info" },
          { label: "Warning", value: "warning" },
          { label: "Success", value: "success" },
          { label: "Danger", value: "danger" },
        ],
        defaultValue: "info",
      }),
    },
  ],
});

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export const Pages = defineCollection({
  slug: "pages",
  labels: { singular: "Page", plural: "Pages" },
  fields: [
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "slug", label: "Slug", ...slug({ from: "title" }) },
    { name: "description", label: "Description", ...textarea({ maxLength: 300 }) },
    { name: "published", label: "Published", ...checkbox({ defaultValue: false }) },
    {
      name: "blocks",
      label: "Blocks",
      ...blocks({
        blocks: [HeroBlock, RichTextBlock, CTABlock, ImageBlock],
      }),
    },
  ],
  admin: { useAsTitle: "title", defaultColumns: ["title", "slug", "published"] },
  versions: true,
  access: { read: () => true },
});

export const Articles = defineCollection({
  slug: "articles",
  labels: { singular: "Article", plural: "Articles" },
  fields: [
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "slug", label: "Slug", ...slug({ from: "title" }) },
    { name: "summary", label: "Summary", ...textarea({ maxLength: 500 }) },
    { name: "featured", label: "Featured", ...checkbox({ defaultValue: false }) },
    { name: "readingTime", label: "Reading Time (min)", ...number({ min: 1 }) },
    {
      name: "content",
      label: "Content",
      ...blocks({
        blocks: [RichTextBlock, QuoteBlock, CalloutBlock, ImageBlock, CTABlock],
        minBlocks: 1,
      }),
    },
  ],
  admin: { useAsTitle: "title", defaultColumns: ["title", "slug", "featured"] },
  versions: true,
  access: { read: () => true },
});

export const allCollections = [Pages, Articles];
