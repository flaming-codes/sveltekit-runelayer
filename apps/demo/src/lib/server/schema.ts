import {
  defineCollection,
  defineGlobal,
  text,
  textarea,
  number,
  richText,
  select,
  multiSelect,
  checkbox,
  date,
  relationship,
  json,
  slug,
  email,
  group,
  blocks,
  defineBlock,
  row,
  collapsible,
} from "@flaming-codes/sveltekit-runelayer/schema";
import { isAdmin, isLoggedIn, hasRole } from "@flaming-codes/sveltekit-runelayer";

// ─── Collections ───────────────────────────────────────────────

export const Authors = defineCollection({
  slug: "authors",
  labels: { singular: "Author", plural: "Authors" },
  fields: [
    { name: "name", label: "Full Name", ...text({ required: true }) },
    { name: "slug", label: "Slug", ...slug({ from: "name" }) },
    { name: "email", label: "Email", ...email({ required: true }) },
    { name: "bio", label: "Biography", ...textarea() },
    {
      name: "role",
      label: "Role",
      ...select({
        options: [
          { label: "Staff Writer", value: "staff" },
          { label: "Guest Author", value: "guest" },
          { label: "Contributor", value: "contributor" },
        ],
        defaultValue: "staff",
      }),
    },
    { name: "active", label: "Active", ...checkbox({ defaultValue: true }) },
    {
      name: "socialLinks",
      label: "Social Links",
      ...blocks({
        blocks: [
          defineBlock({
            slug: "socialLink",
            label: "Social Link",
            fields: [
              {
                name: "platform",
                label: "Platform",
                ...select({
                  options: [
                    { label: "Twitter / X", value: "twitter" },
                    { label: "GitHub", value: "github" },
                    { label: "LinkedIn", value: "linkedin" },
                    { label: "Website", value: "website" },
                  ],
                }),
              },
              { name: "url", label: "URL", ...text({ required: true }) },
            ],
          }),
        ],
      }),
    },
  ],
  admin: { useAsTitle: "name", defaultColumns: ["name", "email", "role"] },
  access: {
    read: () => true,
    create: isLoggedIn(),
    update: hasRole("editor"),
    delete: isAdmin(),
  },
});

export const Categories = defineCollection({
  slug: "categories",
  labels: { singular: "Category", plural: "Categories" },
  fields: [
    { name: "name", label: "Name", ...text({ required: true }) },
    { name: "slug", label: "Slug", ...slug({ from: "name" }) },
    { name: "description", label: "Description", ...textarea() },
    { name: "sortOrder", label: "Sort Order", ...number({ min: 0 }) },
    { name: "featured", label: "Featured", ...checkbox() },
  ],
  admin: { useAsTitle: "name", defaultColumns: ["name", "sortOrder", "featured"] },
  access: { read: () => true },
});

export const Posts = defineCollection({
  slug: "posts",
  labels: { singular: "Post", plural: "Posts" },
  fields: [
    { name: "title", label: "Title", ...text({ required: true, maxLength: 200 }) },
    { name: "slug", label: "Slug", ...slug({ from: "title" }) },
    { name: "excerpt", label: "Excerpt", ...textarea({ maxLength: 300 }) },
    { name: "content", label: "Content", ...richText() },
    { name: "author", label: "Author", ...relationship({ relationTo: "authors" }) },
    { name: "category", label: "Category", ...relationship({ relationTo: "categories" }) },
    {
      name: "status",
      label: "Status",
      ...select({
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
          { label: "Archived", value: "archived" },
        ],
        defaultValue: "draft",
      }),
    },
    { name: "publishedAt", label: "Published At", ...date({ includeTime: true }) },
    { name: "featured", label: "Featured", ...checkbox() },
    { name: "readTime", label: "Read Time (min)", ...number({ min: 1 }) },
    {
      name: "metadata",
      label: "SEO Metadata",
      ...json({
        defaultValue: { keywords: [], ogImage: "" },
      }),
    },
    {
      name: "seo",
      label: "SEO",
      ...group({
        fields: [
          { name: "metaTitle", label: "Meta Title", ...text({ maxLength: 60 }) },
          { name: "metaDescription", label: "Meta Description", ...textarea({ maxLength: 160 }) },
        ],
      }),
    },
  ],
  admin: { useAsTitle: "title", defaultColumns: ["title", "status", "author", "publishedAt"] },
  access: {
    read: () => true,
    create: isLoggedIn(),
    update: hasRole("editor"),
    delete: isAdmin(),
  },
  hooks: {
    beforeChange: [
      // Auto-generate slug from title
      (ctx) => {
        if (ctx.data?.title && !ctx.data?.slug) {
          return {
            ...ctx,
            data: {
              ...ctx.data,
              slug: ((ctx.data.title as string) ?? "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, ""),
            },
          };
        }
        return ctx;
      },
      // Auto-calculate read time from content
      (ctx) => {
        if (ctx.data?.content) {
          const text =
            typeof ctx.data.content === "string"
              ? ctx.data.content
              : JSON.stringify(ctx.data.content);
          const words = text.split(/\s+/).filter(Boolean).length;
          return {
            ...ctx,
            data: { ...ctx.data, readTime: Math.max(1, Math.ceil(words / 200)) },
          };
        }
        return ctx;
      },
    ],
  },
});

export const Media = defineCollection({
  slug: "media",
  labels: { singular: "Media", plural: "Media" },
  fields: [
    { name: "filename", label: "Filename", ...text({ required: true }) },
    { name: "alt", label: "Alt Text", ...text() },
    { name: "caption", label: "Caption", ...textarea() },
    { name: "url", label: "URL", ...text({ required: true }) },
    { name: "mimeType", label: "MIME Type", ...text() },
    {
      name: "tags",
      label: "Tags",
      ...multiSelect({
        options: [
          { label: "Photo", value: "photo" },
          { label: "Illustration", value: "illustration" },
          { label: "Screenshot", value: "screenshot" },
          { label: "Icon", value: "icon" },
          { label: "Banner", value: "banner" },
        ],
      }),
    },
  ],
  admin: { useAsTitle: "filename", defaultColumns: ["filename", "mimeType", "tags"] },
  access: { read: () => true },
});

export const Pages = defineCollection({
  slug: "pages",
  labels: { singular: "Page", plural: "Pages" },
  fields: [
    { name: "title", label: "Title", ...text({ required: true }) },
    { name: "slug", label: "Slug", ...slug({ from: "title" }) },
    {
      name: "layout",
      label: "Layout",
      ...select({
        options: [
          { label: "Default", value: "default" },
          { label: "Wide", value: "wide" },
          { label: "Sidebar", value: "sidebar" },
        ],
        defaultValue: "default",
      }),
    },
    {
      name: "hero",
      label: "Hero Section",
      ...group({
        fields: [
          { name: "heading", label: "Heading", ...text() },
          { name: "subheading", label: "Subheading", ...textarea() },
          { name: "showCta", label: "Show CTA Button", ...checkbox() },
        ],
      }),
    },
    {
      name: "sections",
      label: "Content Sections",
      ...blocks({
        blocks: [
          defineBlock({
            slug: "section",
            label: "Section",
            fields: [
              { name: "title", label: "Section Title", ...text({ required: true }) },
              { name: "body", label: "Section Body", ...richText() },
              { name: "order", label: "Order", ...number({ min: 0 }) },
            ],
          }),
        ],
        minBlocks: 0,
        maxBlocks: 20,
      }),
    },
    {
      name: "sidebar",
      ...collapsible({
        label: "Sidebar Widgets",
        fields: [
          { name: "showRecent", label: "Show Recent Posts", ...checkbox({ defaultValue: true }) },
          { name: "showCategories", label: "Show Categories", ...checkbox({ defaultValue: true }) },
          { name: "customHtml", label: "Custom Widget HTML", ...textarea() },
        ],
      }),
    },
    {
      name: "contact",
      label: "Contact Info",
      ...row({
        fields: [
          { name: "email", label: "Contact Email", ...email() },
          { name: "phone", label: "Phone", ...text() },
        ],
      }),
    },
  ],
  admin: { useAsTitle: "title", defaultColumns: ["title", "layout"] },
  access: { read: () => true },
});

export const Products = defineCollection({
  slug: "products",
  labels: { singular: "Product", plural: "Products" },
  fields: [
    { name: "name", label: "Name", ...text({ required: true }) },
    { name: "slug", label: "Slug", ...slug({ from: "name" }) },
    { name: "price", label: "Price", ...number({ min: 0, required: true }) },
    { name: "description", label: "Description", ...richText() },
    {
      name: "features",
      label: "Features",
      ...multiSelect({
        options: [
          { label: "Open Source", value: "open-source" },
          { label: "Self-hosted", value: "self-hosted" },
          { label: "Cloud Hosted", value: "cloud" },
          { label: "API Access", value: "api" },
          { label: "Custom Themes", value: "themes" },
          { label: "Plugin System", value: "plugins" },
          { label: "Multi-language", value: "i18n" },
          { label: "Analytics", value: "analytics" },
        ],
      }),
    },
    {
      name: "specs",
      label: "Specifications",
      ...json({
        defaultValue: {},
      }),
    },
    { name: "category", label: "Category", ...relationship({ relationTo: "categories" }) },
    { name: "image", label: "Image", ...relationship({ relationTo: "media" }) },
    { name: "inStock", label: "In Stock", ...checkbox({ defaultValue: true }) },
  ],
  admin: { useAsTitle: "name", defaultColumns: ["name", "price", "inStock"] },
  access: { read: () => true },
});

export const SiteSettings = defineCollection({
  slug: "site_settings",
  labels: { singular: "Site Settings", plural: "Site Settings" },
  fields: [
    { name: "siteName", label: "Site Name", ...text({ required: true }) },
    { name: "tagline", label: "Tagline", ...text() },
    { name: "description", label: "Description", ...textarea() },
    { name: "footerText", label: "Footer Text", ...text() },
  ],
  admin: { useAsTitle: "siteName" },
});

export const Navigation = defineCollection({
  slug: "navigation",
  labels: { singular: "Navigation", plural: "Navigation" },
  fields: [
    { name: "label", label: "Label", ...text({ required: true }) },
    {
      name: "items",
      label: "Menu Items",
      ...json({
        defaultValue: [],
      }),
    },
  ],
  admin: { useAsTitle: "label" },
});

export const allCollections = [
  Authors,
  Categories,
  Posts,
  Media,
  Pages,
  Products,
  SiteSettings,
  Navigation,
];

export const SiteSettingsGlobal = defineGlobal({
  slug: "site-settings",
  label: "Site Settings",
  fields: [
    { name: "siteName", label: "Site Name", ...text({ required: true }) },
    { name: "tagline", label: "Tagline", ...text() },
    { name: "footerText", label: "Footer Text", ...text() },
  ],
  access: {
    read: isLoggedIn(),
    update: isAdmin(),
  },
});

export const NavigationGlobal = defineGlobal({
  slug: "main-navigation",
  label: "Main Navigation",
  fields: [
    { name: "label", label: "Label", ...text({ required: true }) },
    { name: "items", label: "Menu Items", ...json({ defaultValue: [] }) },
  ],
  access: {
    read: isLoggedIn(),
    update: isAdmin(),
  },
});

export const allGlobals = [SiteSettingsGlobal, NavigationGlobal];
