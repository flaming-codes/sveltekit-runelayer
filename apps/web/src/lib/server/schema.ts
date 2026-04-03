import {
  defineCollection,
  text,
  textarea,
  richText,
  select,
  slug,
  checkbox,
  number,
  array,
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
      ...array({
        fields: [
          {
            name: "blockType",
            label: "Block Type",
            ...select({
              required: true,
              options: [
                { label: "Hero", value: "hero" },
                { label: "Rich Text", value: "richtext" },
                { label: "Call to Action", value: "cta" },
                { label: "Image", value: "image" },
              ],
            }),
          },
          { name: "heading", label: "Heading", ...text() },
          { name: "body", label: "Body", ...richText() },
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
          { name: "imageUrl", label: "Image URL", ...text() },
          { name: "imageAlt", label: "Image Alt", ...text() },
          { name: "order", label: "Order", ...number({ min: 0 }) },
        ],
      }),
    },
  ],
  admin: { useAsTitle: "title", defaultColumns: ["title", "published"] },
  timestamps: true,
  access: { read: () => true },
});

export const allCollections = [Pages];
