import {
  defineCollection,
  text,
  textarea,
  richText,
  slug,
  checkbox,
  number,
  blocks,
  defineBlock,
  group,
} from "@flaming-codes/sveltekit-runelayer/schema";

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
        blocks: [
          defineBlock({
            slug: "hero",
            label: "Hero",
            fields: [
              { name: "heading", label: "Heading", ...text() },
              { name: "body", label: "Body", ...richText() },
            ],
          }),
          defineBlock({
            slug: "richtext",
            label: "Rich Text",
            fields: [{ name: "body", label: "Body", ...richText() }],
          }),
          defineBlock({
            slug: "cta",
            label: "Call to Action",
            fields: [
              {
                name: "cta",
                label: "CTA",
                ...group({
                  fields: [
                    { name: "label", label: "Button Label", ...text() },
                    { name: "url", label: "Button URL", ...text() },
                  ],
                }),
              },
            ],
          }),
          defineBlock({
            slug: "image",
            label: "Image",
            fields: [
              { name: "imageUrl", label: "Image URL", ...text() },
              { name: "imageAlt", label: "Image Alt", ...text() },
              { name: "order", label: "Order", ...number({ min: 0 }) },
            ],
          }),
        ],
      }),
    },
  ],
  admin: { useAsTitle: "title", defaultColumns: ["title", "published"] },
  timestamps: true,
  access: { read: () => true },
});

export const allCollections = [Pages];
