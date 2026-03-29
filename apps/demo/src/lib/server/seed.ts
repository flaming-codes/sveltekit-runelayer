import type { RunelayerApp } from "@flaming-codes/sveltekit-runelayer/sveltekit/server";
import {
  Authors,
  Categories,
  Posts,
  Media,
  Pages,
  Products,
  SiteSettings,
  Navigation,
} from "./schema.js";

export async function seed(app: RunelayerApp) {
  const api = app.system;

  // Check if already seeded
  const existing = await api.find(Categories);
  if (existing.length > 0) return;

  console.log("[demo] Seeding demo data...");

  // ─── Categories ────────────────────────────────────────────
  const categories = await Promise.all([
    api.create(Categories, {
      name: "Technology",
      slug: "technology",
      description: "Latest in software, hardware, and digital innovation.",
      sortOrder: 1,
      featured: true,
    }),
    api.create(Categories, {
      name: "Design",
      slug: "design",
      description: "UI/UX, visual design, and creative processes.",
      sortOrder: 2,
      featured: true,
    }),
    api.create(Categories, {
      name: "Business",
      slug: "business",
      description: "Strategy, management, and entrepreneurship insights.",
      sortOrder: 3,
      featured: false,
    }),
    api.create(Categories, {
      name: "Tutorials",
      slug: "tutorials",
      description: "Step-by-step guides and how-to articles.",
      sortOrder: 4,
      featured: true,
    }),
    api.create(Categories, {
      name: "News",
      slug: "news",
      description: "Industry news and announcements.",
      sortOrder: 5,
      featured: false,
    }),
  ]);
  const [tech, design, business, tutorials, news] = categories as any[];

  // ─── Authors ───────────────────────────────────────────────
  const authors = await Promise.all([
    api.create(Authors, {
      name: "Alice Chen",
      slug: "alice-chen",
      email: "alice@example.com",
      bio: "Senior software engineer with a passion for open-source tooling and developer experience. Alice has been building CMS platforms for over a decade and loves exploring the intersection of design systems and content management.",
      role: "staff",
      active: true,
    }),
    api.create(Authors, {
      name: "Marcus Rivera",
      slug: "marcus-rivera",
      email: "marcus@example.com",
      bio: "Design systems architect and front-end specialist. Marcus focuses on creating accessible, beautiful interfaces that scale across large organizations.",
      role: "staff",
      active: true,
    }),
    api.create(Authors, {
      name: "Priya Sharma",
      slug: "priya-sharma",
      email: "priya@example.com",
      bio: "Freelance writer and technology consultant covering the latest trends in web development frameworks and content infrastructure.",
      role: "guest",
      active: true,
    }),
  ]);
  const [alice, marcus, priya] = authors as any[];

  // ─── Media ─────────────────────────────────────────────────
  const mediaItems = await Promise.all([
    api.create(Media, {
      filename: "hero-banner.jpg",
      alt: "Abstract gradient background",
      caption: "Hero banner for the homepage",
      url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&h=600&fit=crop",
      mimeType: "image/jpeg",
      tags: JSON.stringify(["banner"]),
    }),
    api.create(Media, {
      filename: "svelte-logo.png",
      alt: "Svelte framework logo",
      caption: "The Svelte logo",
      url: "https://svelte.dev/svelte-logo-horizontal.svg",
      mimeType: "image/svg+xml",
      tags: JSON.stringify(["icon"]),
    }),
    api.create(Media, {
      filename: "code-editor.jpg",
      alt: "Code editor with syntax highlighting",
      caption: "Modern code editor showing TypeScript",
      url: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop",
      mimeType: "image/jpeg",
      tags: JSON.stringify(["photo", "screenshot"]),
    }),
    api.create(Media, {
      filename: "team-meeting.jpg",
      alt: "Team collaboration session",
      caption: "Design review meeting",
      url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop",
      mimeType: "image/jpeg",
      tags: JSON.stringify(["photo"]),
    }),
  ]);
  const [_heroBanner, svelteLogo, codeEditor, teamMeeting] = mediaItems as any[];

  // ─── Posts ─────────────────────────────────────────────────
  await Promise.all([
    api.create(Posts, {
      title: "Getting Started with Runelayer CMS",
      slug: "getting-started-with-runelayer",
      excerpt:
        "Learn how to set up Runelayer CMS in your SvelteKit application in under five minutes.",
      content: JSON.stringify({
        type: "doc",
        content: [
          { type: "heading", content: "Introduction" },
          {
            type: "paragraph",
            content:
              "Runelayer is a CMS-as-a-package for SvelteKit apps. It runs inside your application's Node process with SQLite, Better Auth, and local filesystem storage.",
          },
          { type: "heading", content: "Installation" },
          {
            type: "paragraph",
            content: "Install the package with pnpm: pnpm add @flaming-codes/sveltekit-runelayer",
          },
          { type: "heading", content: "Configuration" },
          {
            type: "paragraph",
            content:
              "Define your collections, set up auth, and create the Runelayer instance. The schema drives everything — database tables, validation, the query API, and admin UI.",
          },
        ],
      }),
      author: alice.id,
      category: tutorials.id,
      status: "published",
      publishedAt: "2025-12-01T10:00:00.000Z",
      featured: true,
      readTime: 5,
      metadata: JSON.stringify({ keywords: ["runelayer", "cms", "sveltekit", "tutorial"] }),
      seo_metaTitle: "Getting Started with Runelayer CMS | Tutorial",
      seo_metaDescription:
        "A step-by-step guide to integrating Runelayer CMS into your SvelteKit project.",
    }),
    api.create(Posts, {
      title: "Building Design Systems with Carbon and Svelte 5",
      slug: "carbon-design-systems-svelte-5",
      excerpt:
        "How to leverage Carbon Components Svelte to build consistent, accessible UIs in Svelte 5.",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "Carbon Design System by IBM provides a comprehensive component library that works beautifully with Svelte 5. In this guide we explore how to integrate Carbon's UIShell, DataTable, and form components into a modern SvelteKit application.",
          },
          { type: "heading", content: "Why Carbon?" },
          {
            type: "paragraph",
            content:
              "Carbon offers 179+ production-ready components with built-in accessibility, responsive design, and multiple theme options. It works in Svelte 5's backwards-compat mode seamlessly.",
          },
        ],
      }),
      author: marcus.id,
      category: design.id,
      status: "published",
      publishedAt: "2025-12-15T14:30:00.000Z",
      featured: true,
      readTime: 8,
      metadata: JSON.stringify({ keywords: ["carbon", "design-system", "svelte-5", "ui"] }),
      seo_metaTitle: "Carbon Design Systems with Svelte 5",
      seo_metaDescription:
        "Integrate Carbon Components Svelte into your Svelte 5 application for a consistent design system.",
    }),
    api.create(Posts, {
      title: "Schema-Driven Development: A New Paradigm",
      slug: "schema-driven-development",
      excerpt:
        "Why defining your schema once and deriving everything from it is the future of content management.",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "The single source of truth principle is at the heart of Runelayer's architecture. Define your collections in TypeScript and the system generates database tables, validation rules, query APIs, and admin UI components automatically.",
          },
          { type: "heading", content: "Benefits" },
          {
            type: "paragraph",
            content:
              "Type safety from schema to UI. drizzle-kit migration files keep schema evolution explicit and host-managed.",
          },
        ],
      }),
      author: alice.id,
      category: tech.id,
      status: "published",
      publishedAt: "2026-01-05T09:00:00.000Z",
      featured: false,
      readTime: 6,
      metadata: JSON.stringify({ keywords: ["schema", "architecture", "cms"] }),
      seo_metaTitle: "Schema-Driven Development",
      seo_metaDescription:
        "How schema-first CMS design improves developer experience and content safety.",
    }),
    api.create(Posts, {
      title: "SQLite as Your CMS Database: Why It Works",
      slug: "sqlite-cms-database",
      excerpt:
        "SQLite is not just for prototypes. Here's why it's the perfect database for content management.",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "SQLite handles concurrent reads beautifully with WAL mode. For most CMS use cases — where reads vastly outnumber writes — it's faster than PostgreSQL with zero operational overhead.",
          },
          { type: "heading", content: "WAL Mode" },
          {
            type: "paragraph",
            content:
              "Write-Ahead Logging allows multiple readers alongside a single writer, making SQLite perfect for web applications serving content.",
          },
        ],
      }),
      author: priya.id,
      category: tech.id,
      status: "published",
      publishedAt: "2026-01-20T11:00:00.000Z",
      featured: false,
      readTime: 7,
      metadata: JSON.stringify({ keywords: ["sqlite", "database", "performance"] }),
      seo_metaTitle: "SQLite for CMS: Why It Works",
      seo_metaDescription:
        "Discover why SQLite with WAL mode is an excellent choice for content management systems.",
    }),
    api.create(Posts, {
      title: "Access Control Patterns in Modern CMS",
      slug: "access-control-patterns",
      excerpt:
        "From public content to admin-only resources: implementing role-based access control.",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "Runelayer implements a deny-by-default access control model. When an access function exists but no request context is provided, access is automatically denied — preventing accidental server-side bypasses.",
          },
          { type: "heading", content: "Built-in Helpers" },
          {
            type: "paragraph",
            content:
              "isAdmin(), isLoggedIn(), and hasRole() cover common patterns. For custom logic, write any function that takes a Request and returns a boolean.",
          },
        ],
      }),
      author: alice.id,
      category: tutorials.id,
      status: "published",
      publishedAt: "2026-02-01T08:00:00.000Z",
      featured: true,
      readTime: 10,
      metadata: JSON.stringify({ keywords: ["access-control", "rbac", "security"] }),
      seo_metaTitle: "Access Control Patterns in CMS",
      seo_metaDescription:
        "Learn how to implement role-based access control in your content management system.",
    }),
    api.create(Posts, {
      title: "The Power of Lifecycle Hooks in Content Management",
      slug: "lifecycle-hooks-cms",
      excerpt:
        "Auto-generate slugs, calculate metrics, and trigger webhooks with CMS lifecycle hooks.",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "Hooks let you inject business logic at key points in the content lifecycle. Before a document is saved, after it's published, before deletion — hooks keep your content pipeline clean and automated.",
          },
        ],
      }),
      author: marcus.id,
      category: tech.id,
      status: "published",
      publishedAt: "2026-02-10T16:00:00.000Z",
      featured: false,
      readTime: 5,
      metadata: JSON.stringify({ keywords: ["hooks", "lifecycle", "automation"] }),
      seo_metaTitle: "CMS Lifecycle Hooks",
      seo_metaDescription:
        "How to use beforeChange, afterChange, and other lifecycle hooks for content automation.",
    }),
    api.create(Posts, {
      title: "Responsive Layouts with Carbon Grid System",
      slug: "carbon-grid-responsive",
      excerpt: "Master Carbon's 16-column grid system for building responsive, content-rich pages.",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "Carbon's Grid component uses a 16-column system with sm, md, and lg breakpoints. Combined with Tiles and flexible content areas, it makes building complex dashboards straightforward.",
          },
        ],
      }),
      author: marcus.id,
      category: design.id,
      status: "draft",
      featured: false,
      readTime: 4,
      metadata: JSON.stringify({ keywords: ["carbon", "grid", "responsive", "layout"] }),
      seo_metaTitle: "Carbon Grid System Guide",
      seo_metaDescription: "Build responsive layouts using Carbon Design System's 16-column grid.",
    }),
    api.create(Posts, {
      title: "Migrating from Payload CMS to Runelayer",
      slug: "payload-to-runelayer-migration",
      excerpt:
        "A practical guide for teams transitioning from Payload CMS to the lighter Runelayer approach.",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "Runelayer shares many concepts with Payload CMS — collections, fields, access control, hooks — but runs as a package inside your SvelteKit app rather than a separate server process.",
          },
        ],
      }),
      author: priya.id,
      category: business.id,
      status: "published",
      publishedAt: "2026-02-20T12:00:00.000Z",
      featured: false,
      readTime: 12,
      metadata: JSON.stringify({ keywords: ["migration", "payload", "comparison"] }),
      seo_metaTitle: "Migrating from Payload CMS to Runelayer",
      seo_metaDescription:
        "A step-by-step migration guide from Payload CMS to Runelayer for SvelteKit apps.",
    }),
    api.create(Posts, {
      title: "File Uploads and Media Management",
      slug: "file-uploads-media",
      excerpt: "Handling file uploads with path traversal protection and streaming delivery.",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "Runelayer's storage adapter provides secure file uploads with UUID-based naming, MIME type validation, and path traversal protection. Files are streamed efficiently to clients.",
          },
        ],
      }),
      author: alice.id,
      category: tutorials.id,
      status: "published",
      publishedAt: "2026-03-01T10:00:00.000Z",
      featured: false,
      readTime: 6,
      metadata: JSON.stringify({ keywords: ["uploads", "storage", "media", "security"] }),
      seo_metaTitle: "File Uploads in Runelayer CMS",
      seo_metaDescription:
        "Learn how to handle file uploads securely with Runelayer's storage system.",
    }),
    api.create(Posts, {
      title: "The Future of Embedded CMS",
      slug: "future-embedded-cms",
      excerpt: "Why CMS-as-a-package is gaining traction and what it means for the Jamstack.",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "The trend toward embedded CMS solutions reflects a broader shift in web architecture. Instead of separate content servers, modern CMS packages run directly inside your application framework.",
          },
        ],
      }),
      author: priya.id,
      category: news.id,
      status: "archived",
      publishedAt: "2025-11-15T09:00:00.000Z",
      featured: false,
      readTime: 3,
      metadata: JSON.stringify({ keywords: ["cms", "jamstack", "future"] }),
      seo_metaTitle: "The Future of Embedded CMS",
      seo_metaDescription:
        "Exploring the trend of CMS-as-a-package solutions in modern web development.",
    }),
  ]);

  // ─── Products ──────────────────────────────────────────────
  await Promise.all([
    api.create(Products, {
      name: "Runelayer Starter",
      slug: "runelayer-starter",
      price: 0,
      description: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "The open-source core of Runelayer CMS. Perfect for personal blogs, portfolios, and small business sites. Includes all 16 field types, SQLite database, and Better Auth integration.",
          },
        ],
      }),
      features: JSON.stringify(["open-source", "self-hosted", "api"]),
      specs: JSON.stringify({
        database: "SQLite",
        auth: "Better Auth",
        storage: "Local filesystem",
        fields: "16 types",
        maxCollections: "Unlimited",
        support: "Community",
      }),
      category: tech.id,
      image: svelteLogo.id,
      inStock: true,
    }),
    api.create(Products, {
      name: "Runelayer Pro",
      slug: "runelayer-pro",
      price: 29,
      description: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "Enhanced CMS with cloud storage adapters, image optimization, and priority support. Ideal for teams building content-heavy applications.",
          },
        ],
      }),
      features: JSON.stringify(["self-hosted", "cloud", "api", "themes", "analytics"]),
      specs: JSON.stringify({
        database: "SQLite / PostgreSQL",
        auth: "Better Auth + SSO",
        storage: "Local + S3",
        fields: "16+ types",
        maxCollections: "Unlimited",
        support: "Email (48h)",
      }),
      category: tech.id,
      image: codeEditor.id,
      inStock: true,
    }),
    api.create(Products, {
      name: "Runelayer Enterprise",
      slug: "runelayer-enterprise",
      price: 199,
      description: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content:
              "Full-featured CMS platform for large organizations. Includes multi-language support, plugin system, advanced analytics, and dedicated support.",
          },
        ],
      }),
      features: JSON.stringify([
        "self-hosted",
        "cloud",
        "api",
        "themes",
        "plugins",
        "i18n",
        "analytics",
      ]),
      specs: JSON.stringify({
        database: "SQLite / PostgreSQL / MySQL",
        auth: "Better Auth + SSO + SAML",
        storage: "Local + S3 + GCS",
        fields: "16+ custom types",
        maxCollections: "Unlimited",
        support: "Dedicated (4h SLA)",
      }),
      category: business.id,
      image: teamMeeting.id,
      inStock: true,
    }),
  ]);

  // ─── Pages ─────────────────────────────────────────────────
  await Promise.all([
    api.create(Pages, {
      title: "About Runelayer",
      slug: "about",
      layout: "default",
      hero_heading: "Built for SvelteKit Developers",
      hero_subheading:
        "Runelayer is a CMS-as-a-package that runs inside your SvelteKit application. No separate server. No external database. Just your app with content management built in.",
      hero_showCta: true,
      showRecent: true,
      showCategories: true,
      email: "hello@runelayer.dev",
      phone: "+1 (555) 123-4567",
    }),
    api.create(Pages, {
      title: "Contact Us",
      slug: "contact",
      layout: "sidebar",
      hero_heading: "Get in Touch",
      hero_subheading: "Have questions about Runelayer? We would love to hear from you.",
      hero_showCta: false,
      showRecent: false,
      showCategories: true,
      customHtml: "<p>Office hours: Mon-Fri 9am-5pm PST</p>",
      email: "support@runelayer.dev",
      phone: "+1 (555) 987-6543",
    }),
  ]);

  // ─── Site Settings (singleton) ─────────────────────────────
  await api.create(SiteSettings, {
    siteName: "Runelayer Demo",
    tagline: "CMS-as-a-Package for SvelteKit",
    description:
      "This demo application showcases the features of Runelayer CMS integrated with Carbon Design System. It demonstrates collections, field types, access control, hooks, and more.",
    footerText: "Built with Runelayer CMS, SvelteKit, and Carbon Design System.",
  });

  // ─── Navigation (singleton) ────────────────────────────────
  await api.create(Navigation, {
    label: "Main Navigation",
    items: JSON.stringify([
      { label: "Home", href: "/", order: 1 },
      { label: "Blog", href: "/blog", order: 2 },
      { label: "Categories", href: "/categories", order: 3 },
      { label: "Authors", href: "/authors", order: 4 },
      { label: "Products", href: "/products", order: 5 },
      { label: "Gallery", href: "/gallery", order: 6 },
      { label: "About", href: "/about", order: 7 },
    ]),
  });

  console.log("[demo] Seed data created successfully.");
}
