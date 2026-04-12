import type { RequestEvent } from "@sveltejs/kit";
import type { RunelayerApp } from "@flaming-codes/sveltekit-runelayer/sveltekit/server";
import { getRunelayerApp } from "./runelayer.js";
import type { MarketingPage, SiteChrome } from "$lib/marketing.js";

let seedPromise: Promise<void> | undefined;

const pageTypeOptions = [
  { label: "Home", value: "home" },
  { label: "Platform", value: "platform" },
  { label: "Docs", value: "docs" },
  { label: "Changelog", value: "changelog" },
];

type CreatedDoc = { id: string } & Record<string, unknown>;

async function createPublished(
  app: RunelayerApp,
  collection: string,
  data: Record<string, unknown>,
): Promise<CreatedDoc> {
  const created = (await app.system.create(collection, data)) as CreatedDoc;
  await app.system.publish(collection, created.id);
  return created;
}

function link(label: string, url: string, external = false) {
  return { blockType: "link_item", label, url, external };
}

function feature(
  title: string,
  icon: string,
  summary: string,
  badge: string,
  href: string,
  stat: string,
) {
  return { title, icon, summary, badge, href, stat };
}

function proofMetric(metricValue: string, metricLabel: string) {
  return { label: metricLabel, kind: "metric", metricValue, metricLabel };
}

function proofTestimonial(company: string, quote: string, personName: string, personRole: string) {
  return { label: company, kind: "testimonial", company, quote, personName, personRole };
}

function resource(title: string, kind: string, description: string, href: string, badge: string) {
  return { title, kind, description, href, badge };
}

function faq(question: string, answer: string, category: string) {
  return { question, answer, category };
}

function changelog(
  title: string,
  slug: string,
  releaseLabel: string,
  summary: string,
  href: string,
) {
  return { title, slug, releaseLabel, summary, href };
}

async function seedCollections(app: RunelayerApp) {
  const features = [
    feature(
      "Schema drives everything",
      "ReferenceArchitecture",
      "Collections and blocks define the database, admin editors, validation rules, and public rendering in one place.",
      "Core",
      "/platform",
      "Single source of truth",
    ),
    feature(
      "Admin included",
      "Dashboard",
      "Route wiring, authentication, version history, and collection editors ship inside the package instead of becoming a second project.",
      "Ops",
      "/platform",
      "One runtime surface",
    ),
    feature(
      "SvelteKit-native runtime",
      "Embed",
      "Runelayer runs inside the host Node process, shares the app's auth context, and keeps deployment simple for product teams.",
      "Infra",
      "/docs",
      "No external CMS process",
    ),
    feature(
      "Carbon-shaped authoring",
      "ContentDesign",
      "Structured layouts, measured spacing, and expressive typography keep the admin and public site speaking the same visual language.",
      "Design",
      "/docs",
      "Design system ready",
    ),
  ];

  const proof = [
    proofMetric(
      "1 package",
      "Schema, admin, auth, storage, and queries stay in the same install surface.",
    ),
    proofMetric(
      "0 sync debt",
      "No split between page-builder config and production UI components.",
    ),
    proofTestimonial(
      "Product teams",
      "We wanted Payload-style control without leaving the SvelteKit deployment model. Runelayer keeps authoring, types, and rendering in one stack.",
      "Example team",
      "Platform engineering",
    ),
  ];

  const faqs = [
    faq(
      "Is Runelayer headless or page-builder-first?",
      "Both. Collections and blocks define the authoring model, while your SvelteKit routes decide how much of the public site is CMS-driven.\n\nYou can use it as an admin-backed content API, a full marketing-site page builder, or both.",
      "Product",
    ),
    faq(
      "Why not use a separate CMS process?",
      "The package runs in the host Node process, so auth, deployment, and access rules live in the same runtime boundary.\n\nThat reduces integration drift and keeps infrastructure choices with the product team.",
      "Architecture",
    ),
    faq(
      "Can I keep using Drizzle migrations?",
      "Yes. Host-managed migrations are the intended workflow. Runelayer exports Drizzle helpers so the app keeps control over schema application before startup.",
      "Data",
    ),
    faq(
      "Does Runelayer support Turso?",
      "Yes. The database client is libsql, which works with both a local SQLite file and a Turso remote endpoint. Switch by updating the url and adding an authToken in defineConfig().",
      "Data",
    ),
    faq(
      "How does authentication work?",
      "Runelayer uses Better Auth with role-based access (admin, editor, user). Sessions are managed via HTTP-only cookies. The first admin is created through a bootstrap flow at /admin/create-first-user.\n\nAccess functions on collections and fields receive the Request object and deny access by default when no request context is present.",
      "Security",
    ),
  ];

  const resources = [
    resource(
      "Getting started",
      "guide",
      "Mount the admin route, configure auth and database settings, and generate the first migrations.",
      "/docs",
      "Guide",
    ),
    resource(
      "Architecture",
      "reference",
      "See how schema, query orchestration, auth, storage, and admin rendering fit together inside the package.",
      "/platform",
      "Reference",
    ),
    resource(
      "Example admin",
      "example",
      "Jump into the package-owned admin and edit the public marketing blocks rendered by this site.",
      "/admin",
      "Live surface",
    ),
  ];

  const releases = [
    changelog(
      "v0.3 — Carbon admin rebuild",
      "v0-3-carbon-admin",
      "v0.3",
      "Admin rebuilt with Carbon Design System. Includes drag-and-drop block reordering, version history tabs, relationship ComboBox with live document fetching, and paginated collection tables.",
      "/changelog",
    ),
    changelog(
      "v0.2 — Draft and publish workflow",
      "v0-2-versioning",
      "v0.2",
      "Collections and globals gained full versioning support: save as draft, publish, unpublish, browse history, and restore from any snapshot.",
      "/changelog",
    ),
    changelog(
      "v0.1 — Initial package release",
      "v0-1-initial",
      "v0.1",
      "First release of @flaming-codes/sveltekit-runelayer with schema-driven collections, 16 field types, Better Auth, local filesystem storage, lifecycle hooks, and the query API.",
      "/changelog",
    ),
    changelog(
      "Example site: tile grid system",
      "example-tile-grid",
      "Wave 3",
      "The example app switched to a 12-column tile grid system aligned to the background grid. All block sections use the unified layout.",
      "/changelog",
    ),
    changelog(
      "Versioned site chrome",
      "versioned-chrome",
      "Wave 2",
      "Navigation, footer, and site metadata moved into a versioned collection so public chrome is authored like the rest of the site.",
      "/changelog",
    ),
    changelog(
      "Marketing site rebuilt on Runelayer",
      "marketing-site-initial",
      "Wave 1",
      "The example app demonstrates a CMS-driven SvelteKit marketing site with Carbon-inspired blocks, seeded collections, and live admin editing.",
      "/changelog",
    ),
  ];

  const chrome = await createPublished(app, "site_chrome", {
    title: "Runelayer site",
    handle: "primary",
    siteName: "Runelayer",
    siteTagline: "CMS-as-a-package for SvelteKit teams that do not want a second platform.",
    siteDescription:
      "Runelayer keeps schemas, admin UI, auth, storage, and queries inside the host SvelteKit application.",
    announcementTitle:
      "New example: Carbon-inspired marketing site driven by Runelayer content blocks.",
    announcementUrl: "/changelog",
    headerLinks: [
      link("Platform", "/platform"),
      link("Docs", "/docs"),
      link("Changelog", "/changelog"),
    ],
    utilityLinks: [link("GitHub", "https://github.com/flaming-codes/sveltekit-runelayer", true)],
    headerPrimaryCtaLabel: "Open admin",
    headerPrimaryCtaUrl: "/admin",
    footerBlurb:
      "Runelayer keeps content modeling, authoring, and rendering in one SvelteKit-native stack.",
    footerProductLinks: [link("Platform", "/platform")],
    footerResourceLinks: [
      link("Docs", "/docs"),
      link("Changelog", "/changelog"),
      link("Admin", "/admin"),
    ],
    footerCompanyLinks: [
      link("GitHub", "https://github.com/flaming-codes/sveltekit-runelayer", true),
    ],
    footerLegalLinks: [link("Robots", "/robots.txt")],
    socialGithubUrl: "https://github.com/flaming-codes/sveltekit-runelayer",
    socialDocsUrl: "/docs",
    socialAdminUrl: "/admin",
  });

  void chrome;

  await createPublished(app, "pages", {
    title: "Runelayer",
    slug: "home",
    teaser: "Use the package to ship a content system without leaving SvelteKit.",
    pageType: pageTypeOptions[0].value,
    seo: {
      metaTitle: "Runelayer",
      metaDescription:
        "A Carbon-inspired SvelteKit marketing site driven by Runelayer collections, blocks, and versioned singletons.",
    },
    layout: [
      {
        blockType: "hero",
        eyebrow: "Runelayer for SvelteKit",
        heading: "A CMS you ship inside the app instead of around it.",
        body: "Schemas define admin editors, database tables, validation, and public rendering from the same source.\n\nThe result is a content platform that behaves like application code, not a separate integration program.",
        primaryLabel: "Open admin",
        primaryUrl: "/admin",
        secondaryLabel: "Read the docs",
        secondaryUrl: "/docs",
        signalLabel: "Design principle",
        signalValue: "Single source of truth",
        panelEyebrow: "Example app",
        panelTitle: "This site is authored by Runelayer",
        panelCode:
          "defineCollection({\n  slug: 'pages',\n  fields: [title, seo, layout],\n  versions: { drafts: true }\n})",
        themeTone: "dark",
      },
      {
        blockType: "feature_grid",
        eyebrow: "What the package owns",
        title: "The public site and the admin are coupled on purpose.",
        intro:
          "Each section below is backed by the same content model authors use in the package-owned admin.",
        features,
      },
      {
        blockType: "proof_band",
        eyebrow: "Why teams care",
        title: "Fewer integration seams, tighter runtime control.",
        intro:
          "Runelayer avoids the usual handoff between CMS configuration, app routes, and deployment topology.",
        items: proof,
        variant: "mixed",
      },
      {
        blockType: "editorial",
        eyebrow: "License",
        title: "MIT licensed. No SaaS control plane added to your stack.",
        lead: "Runelayer ships as a standard npm package. No metered API, no managed cloud, no vendor runtime.",
        body: "You bring your own infrastructure. The package wires into what you already run: your SvelteKit server, your database, your storage, your auth.\n\nTeams that want to keep their deployment surface small do not benefit from a separately hosted CMS. They benefit from keeping the content layer in the same process as the rest of the application.",
        asideTitle: "License",
        asideValue: "MIT",
        asideCaption: "Clone, fork, and ship it as part of your product without asking permission.",
      },
      {
        blockType: "faq_panel",
        eyebrow: "Common questions",
        title: "Operational simplicity is the point.",
        intro: "Runelayer is opinionated about keeping architecture decisions explicit.",
        items: faqs,
      },
      {
        blockType: "cta_band",
        eyebrow: "Next step",
        title: "Edit the content model. Then edit the site. In the same stack.",
        body: "Use the example app as the reference surface for how public marketing pages can be modeled with the same package that ships the admin.",
        primaryLabel: "Go to /admin",
        primaryUrl: "/admin",
        secondaryLabel: "See the platform page",
        secondaryUrl: "/platform",
        themeTone: "dark",
      },
    ],
  });

  await createPublished(app, "pages", {
    title: "Platform",
    slug: "platform",
    teaser: "How the package keeps content, auth, storage, and rendering inside one runtime.",
    pageType: pageTypeOptions[1].value,
    seo: {
      metaTitle: "Platform | Runelayer",
      metaDescription:
        "See how Runelayer keeps schema, admin, auth, and public rendering aligned inside SvelteKit.",
    },
    layout: [
      {
        blockType: "hero",
        eyebrow: "Platform",
        heading: "The runtime boundary stays with the host application.",
        body: "Runelayer does not ask product teams to re-platform around a separate CMS service.\n\nYou keep routing, auth, migration ownership, and deployment in the SvelteKit app that already runs the product.",
        primaryLabel: "Read docs",
        primaryUrl: "/docs",
        secondaryLabel: "See releases",
        secondaryUrl: "/changelog",
        signalLabel: "Runtime",
        signalValue: "In-process",
        panelEyebrow: "Included",
        panelTitle: "Schema -> DB -> Admin -> Site",
        panelCode:
          "collections -> drizzle tables\ncollections -> admin forms\ncollections -> public blocks",
        themeTone: "light",
      },
      {
        blockType: "compare_table",
        eyebrow: "Architecture",
        title: "What changes when content lives in-process.",
        intro: "The operational difference between hosting a CMS service and shipping a CMS package.",
        leftLabel: "Separate CMS service",
        rightLabel: "Runelayer package",
        rows: [
          { label: "Deployment", left: "Two services to operate and update independently", right: "One SvelteKit process, one deployment target" },
          { label: "Auth", left: "Duplicate auth logic or an API key bridge between services", right: "Shared session context from the host application" },
          { label: "Data access", left: "HTTP requests across a network boundary on every read", right: "Direct in-process query with no round-trip cost" },
          { label: "Schema", left: "CMS config, API types, and UI types drift apart over time", right: "Single TypeScript definition drives all three" },
          { label: "Migrations", left: "CMS-managed and opaque to the engineering team", right: "Host-managed with drizzle-kit, versioned in git" },
          { label: "Cost model", left: "SaaS subscription or separately hosted infrastructure", right: "MIT license, runs wherever Node runs" },
        ],
      },
      {
        blockType: "feature_grid",
        eyebrow: "Surface area",
        title: "The package is broad enough to ship, small enough to reason about.",
        intro:
          "These capabilities are the pieces most teams end up rebuilding across separate tools.",
        features,
      },
      {
        blockType: "resource_cards",
        eyebrow: "Explore",
        title: "Move from architecture to implementation.",
        intro: "Use the docs, the example admin, and the changelog as the three reference points.",
        items: resources,
      },
      {
        blockType: "cta_band",
        eyebrow: "Implementation",
        title: "Treat content modeling like application engineering.",
        body: "The public UI, the database schema, and the editing experience should not drift apart. Runelayer is built to prevent that drift.",
        primaryLabel: "Open the docs",
        primaryUrl: "/docs",
        secondaryLabel: "Review releases",
        secondaryUrl: "/changelog",
        themeTone: "light",
      },
    ],
  });

  await createPublished(app, "pages", {
    title: "Docs",
    slug: "docs",
    teaser: "Reference the docs, inspect the example, then change the schema yourself.",
    pageType: pageTypeOptions[2].value,
    seo: {
      metaTitle: "Docs | Runelayer",
      metaDescription:
        "Getting started, architecture, and example admin references for the Runelayer package.",
    },
    layout: [
      {
        blockType: "hero",
        eyebrow: "Documentation",
        heading: "Documentation should reflect the package, not compensate for it.",
        body: "Runelayer keeps the API surface narrow and explicit.\n\nThat makes the docs usable as implementation guidance instead of a second system to memorize.",
        primaryLabel: "See architecture",
        primaryUrl: "/platform",
        secondaryLabel: "Review changes",
        secondaryUrl: "/changelog",
        signalLabel: "Start here",
        signalValue: "Mount the admin route",
        panelEyebrow: "Reference set",
        panelTitle: "Three views of the system",
        panelCode: "1. Docs\n2. Example site\n3. Example admin",
        themeTone: "light",
      },
      {
        blockType: "step_list",
        eyebrow: "Getting started",
        title: "From install to first authored page in four steps.",
        intro: "Each step maps to a single file or command. Node >= 22.18 required.",
        steps: [
          { number: "01", title: "Install and define collections", body: "Add @flaming-codes/sveltekit-runelayer to your project. Define collections with defineCollection() in TypeScript. Each collection drives the database table, admin editor, validation, and query behavior from a single source." },
          { number: "02", title: "Generate and run migrations", body: "Export createDrizzleKitSchema() in a drizzle.config.ts file. Run drizzle-kit generate then drizzle-kit migrate before startup. The host application controls when schema changes are applied." },
          { number: "03", title: "Wire the handle hook", body: "Call createRunelayerHandle() in hooks.server.ts and add it to your handle chain. This resolves auth sessions, injects request headers, and registers admin routing in one step." },
          { number: "04", title: "Mount the admin route", body: "Add a catch-all route at /admin/[...path] that delegates to createRunelayerAdminRoute(). The full admin UI, auth flows, version history, and user management are served from this route automatically." },
        ],
      },
      {
        blockType: "resource_cards",
        eyebrow: "References",
        title: "Use the docs as the operational map.",
        intro: "These cards mirror the first surfaces most teams need during adoption.",
        items: resources,
      },
      {
        blockType: "faq_panel",
        eyebrow: "Integration questions",
        title: "The setup surface is small by design.",
        intro: "These questions cover the decisions most teams encounter when wiring the package.",
        items: [
          faq(
            "What does the integration actually look like?",
            "Define collections with defineCollection(), wire createRunelayerHandle() in hooks.server.ts, and mount the admin catch-all route. Drizzle Kit generates and applies the migrations before startup.",
            "Setup",
          ),
          faq(
            "How does Runelayer handle migrations?",
            "It does not run migrations automatically. You call createDrizzleKitSchema() to export the schema and use drizzle-kit generate + migrate in your build pipeline. The host application controls when changes are applied.",
            "Data",
          ),
          faq(
            "Can I restrict which users can edit content?",
            "Yes. Every collection and field can define access functions that receive the current Request. Built-in helpers (isAdmin, hasRole) cover common cases. Access is denied by default when no request context is present.",
            "Security",
          ),
          faq(
            "Does the package work with SvelteKit adapter-node?",
            "Yes. Runelayer targets Node-hosted SvelteKit applications. The libsql client, local storage adapter, and Better Auth session management all assume a persistent Node process.",
            "Deployment",
          ),
        ],
      },
      {
        blockType: "release_strip",
        eyebrow: "Recent updates",
        title: "Track how the example evolves alongside the package.",
        intro: "The example app is useful because it changes with the architecture.",
        items: releases,
      },
      {
        blockType: "cta_band",
        eyebrow: "Edit mode",
        title: "After the docs, change the schema and watch the public site move with it.",
        body: "That is the main product promise: the authored surface and the shipped surface should share the same model.",
        primaryLabel: "Open admin",
        primaryUrl: "/admin",
        secondaryLabel: "Back home",
        secondaryUrl: "/",
        themeTone: "light",
      },
    ],
  });

  await createPublished(app, "pages", {
    title: "Changelog",
    slug: "changelog",
    teaser: "The example app evolves in visible waves so the package stays honest.",
    pageType: pageTypeOptions[3].value,
    seo: {
      metaTitle: "Changelog | Runelayer",
      metaDescription:
        "Recent example-app changes that demonstrate how Runelayer is used in practice.",
    },
    layout: [
      {
        blockType: "hero",
        eyebrow: "Changelog",
        heading: "The example app is part of the product argument.",
        body: "A package like Runelayer should prove itself through implementation detail.\n\nThat is why this site is built from the same content model it promotes.",
        primaryLabel: "View docs",
        primaryUrl: "/docs",
        secondaryLabel: "Back home",
        secondaryUrl: "/",
        signalLabel: "Release style",
        signalValue: "Small, traceable waves",
        panelEyebrow: "Current focus",
        panelTitle: "Marketing + CMS parity",
        panelCode: "schema reset\ncomponent rebuild\nreview pass",
        themeTone: "dark",
      },
      {
        blockType: "release_strip",
        eyebrow: "Entries",
        title: "Visible changes to the example site.",
        intro: "These entries are curated as content, not hardcoded release notes.",
        items: releases,
      },
      {
        blockType: "roadmap_strip",
        eyebrow: "Planned",
        title: "What is scoped for future versions.",
        intro: "These items are tracked but not yet available in the package. Scope may change.",
        items: [
          { label: "Image resizing", status: "planned", description: "Automatic multi-size image generation on upload, configured per upload collection with custom dimension sets." },
          { label: "Cloud storage adapters", status: "planned", description: "S3-compatible and Cloudflare R2 storage adapters to replace the local filesystem adapter for production deployments." },
          { label: "Localization runtime", status: "planned", description: "The per-field localized flag is already implemented in the schema layer. Runtime querying and admin UI per-locale editing are deferred." },
          { label: "Soft delete and trash", status: "planned", description: "Move documents to a recoverable trash state before permanent removal, with configurable retention windows." },
          { label: "Scheduled publishing", status: "in_progress", description: "Publish versioned documents at a specified future date and time without manual intervention." },
          { label: "API key authentication", status: "in_progress", description: "Machine-to-machine authentication for headless API use cases where session cookies are not appropriate." },
        ],
      },
      {
        blockType: "cta_band",
        eyebrow: "Keep exploring",
        title: "Use the changelog as another authored section, not a hardcoded page.",
        body: "The more public surfaces share the content model, the more useful the package becomes.",
        primaryLabel: "Explore platform",
        primaryUrl: "/platform",
        secondaryLabel: "Open admin",
        secondaryUrl: "/admin",
        themeTone: "dark",
      },
    ],
  });
}

async function clearCollection(app: RunelayerApp, collection: string) {
  const docs = await app.system.find(collection, { draft: true, limit: 200 });
  for (const doc of docs as CreatedDoc[]) {
    await app.system.remove(collection, doc.id);
  }
}

async function seedSiteContent(app: RunelayerApp) {
  const [existingPages, existingChrome] = await Promise.all([
    app.system.find("pages", { draft: true, limit: 1, where: { slug: "home" } }),
    app.system.find("site_chrome", { draft: true, limit: 1, where: { handle: "primary" } }),
  ]);

  if (existingPages.length > 0 && existingChrome.length > 0) return;

  for (const collection of ["pages", "site_chrome"]) {
    await clearCollection(app, collection);
  }

  await seedCollections(app);
}

export async function ensureMarketingContent() {
  if (!seedPromise) {
    seedPromise = seedSiteContent(getRunelayerApp()).catch((error) => {
      seedPromise = undefined;
      throw error;
    });
  }
  await seedPromise;
}

async function readSingleton(collection: string, event: RequestEvent | Request) {
  const app = getRunelayerApp();
  await ensureMarketingContent();
  const docs = await app.withRequest(event).find(collection, {
    limit: 1,
    where: { handle: "primary" },
  });
  return (docs[0] ?? null) as SiteChrome | null;
}

export async function loadSiteChrome(event: RequestEvent): Promise<SiteChrome> {
  const chrome = await readSingleton("site_chrome", event);
  if (!chrome) {
    throw new Error("Site chrome is missing");
  }
  return chrome;
}

export async function loadPageBySlug(
  event: RequestEvent,
  slug: string,
): Promise<MarketingPage | null> {
  const app = getRunelayerApp();
  await ensureMarketingContent();
  const docs = await app.withRequest(event).find("pages", {
    limit: 1,
    depth: 1,
    where: { slug },
  });
  return (docs[0] ?? null) as MarketingPage | null;
}
