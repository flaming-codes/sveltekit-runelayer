import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import { createClient } from "@libsql/client";
import { migrateDatabaseForTests } from "../../__testutils__/migrations.js";
import type { CollectionConfig } from "../../schema/collections.js";
import { defineCollection } from "../../schema/collections.js";
import type { GlobalConfig } from "../../schema/globals.js";
import { defineGlobal } from "../../schema/globals.js";
import { group, text } from "../../schema/fields.js";
import { defineConfig } from "../../config.js";
import { createRunelayer } from "../../plugin.js";
import type {
  RunelayerAdminHealthData,
  RunelayerAdminLoginData,
  RunelayerAdminPageData,
  RunelayerManagedUserRole,
  SvelteKitUtils,
} from "../types.js";
import type { LoaderContext } from "../runtime-loaders.js";
import {
  loadHealth,
  loadLogin,
  loadCreateFirstUser,
  loadProfile,
  loadDashboard,
  loadCollectionList,
  loadCollectionCreate,
  loadCollectionEdit,
  loadGlobalEdit,
  loadUsersCreate,
  dispatchLoader,
} from "../runtime-loaders.js";
import { createQueryApi, systemRequest } from "../admin-queries.js";
import { updateGlobalDocument } from "../globals.js";

const kit: SvelteKitUtils = {
  redirect(status: number, location: string | URL): never {
    throw Object.assign(new Error(), { status, location: location.toString() });
  },
  error(status: number, body?: string | { message: string }): never {
    const message = typeof body === "string" ? body : (body?.message ?? "Error");
    throw Object.assign(new Error(message), {
      status,
      body: typeof body === "object" ? body : { message },
    });
  },
  fail(status: number, data?: any) {
    return { status, data } as any;
  },
};

const Posts = defineCollection({
  slug: "posts",
  fields: [{ name: "title", ...text({ required: true }) }],
});

const GroupedPosts = defineCollection({
  slug: "grouped_posts",
  fields: [
    { name: "title", ...text({ required: true }) },
    {
      name: "seo",
      ...group({
        fields: [
          { name: "metaTitle", ...text() },
          { name: "metaDescription", ...text() },
        ],
      }),
    },
  ],
});

const SiteSettings = defineGlobal({
  slug: "site-settings",
  fields: [
    {
      name: "seo",
      ...group({
        fields: [
          { name: "title", ...text() },
          { name: "description", ...text() },
        ],
      }),
    },
  ],
});

async function applyAuthSchemaForTests(url: string) {
  const client = createClient({ url });
  const now = new Date().toISOString();
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT,
        "banned" INTEGER NOT NULL DEFAULT 0,
        "banReason" TEXT,
        "banExpires" TEXT,
        "image" TEXT,
        "emailVerified" INTEGER NOT NULL,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);
    await client.execute({
      sql: `INSERT INTO "user" ("id","email","name","role","banned","banReason","banExpires","image","emailVerified","createdAt","updatedAt") VALUES (?,?,?,?,0,NULL,NULL,NULL,1,?,?)`,
      args: ["admin-1", "admin@example.com", "Admin", "admin", now, now],
    });
  } finally {
    client.close();
  }
}

async function createCtx(opts?: {
  collections?: CollectionConfig[];
  globals?: GlobalConfig[];
}): Promise<LoaderContext> {
  const tempDir = mkdtempSync(join(tmpdir(), "runelayer-loaders-"));
  const dbUrl = `file:${join(tempDir, "test.db")}`;
  const collections = opts?.collections ?? [Posts];
  const globals = opts?.globals ?? [];
  await migrateDatabaseForTests(dbUrl, collections);
  await applyAuthSchemaForTests(dbUrl);

  const runelayer = createRunelayer(
    defineConfig({
      collections,
      globals,
      auth: {
        secret: "test-secret-minimum-32-chars-long",
        baseURL: "http://localhost:5173",
      },
      database: { url: dbUrl },
    }),
  );

  const withRequest = (eventOrRequest: any) => {
    const req = eventOrRequest instanceof Request ? eventOrRequest : eventOrRequest.request;
    return createQueryApi(runelayer, () => req);
  };

  return {
    runelayer,
    adminPath: "/admin",
    ui: { appName: "Test", productName: "CMS", footerText: "Test footer" },
    kit,
    getCollectionBySlug: (_rl, slug) => {
      const c = runelayer.collections.find((c) => c.slug === slug);
      if (!c) throw kit.error(404, `Unknown collection: ${slug}`);
      return c;
    },
    resolveGlobalBySlug: (_rl, slug) => {
      const g = runelayer.globals.find((g) => g.slug === slug);
      if (!g) throw kit.error(404, `Unknown global: ${slug}`);
      return g;
    },
    withRequest,
    fetchManagedUserList: async () => ({
      users: [],
      total: 0,
      limit: 20,
      offset: 0,
    }),
    fetchManagedUser: async () => ({
      id: "u1",
      email: "u@b.c",
      name: "U",
      role: "user",
      image: null,
      emailVerified: true,
    }),
  };
}

function makeEvent(path?: string, locals: Record<string, unknown> = {}) {
  const pathname = path ? `/admin/${path}` : "/admin";
  const url = new URL(`http://localhost${pathname}`);
  const request = new Request(url, {
    headers: {
      "x-user-id": "admin-1",
      "x-user-role": "admin",
      "x-user-email": "admin@example.com",
    },
  });
  return {
    params: { path },
    request,
    url,
    locals: {
      user: {
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
        name: "Admin",
      },
      ...locals,
    },
  } as any;
}

describe("runtime-loaders", () => {
  it("loadHealth returns health payload with database status", async () => {
    const ctx = await createCtx();
    const result = await loadHealth(ctx, makeEvent("health"));
    expectTypeOf(result).toMatchTypeOf<RunelayerAdminHealthData>();
    expect(result.view).toBe("health");
    expect((result.health as any).database).toBe(true);
    expect((result.health as any).status).toBe("ok");
  });

  it("loadLogin returns login view", async () => {
    const ctx = await createCtx();
    const result = loadLogin(ctx, makeEvent("login"));
    expectTypeOf(result).toMatchTypeOf<RunelayerAdminLoginData>();
    expect(result.view).toBe("login");
    expect(result.basePath).toBe("/admin");
  });

  it("loadCreateFirstUser returns create-first-user view", async () => {
    const ctx = await createCtx();
    const result = loadCreateFirstUser(ctx, makeEvent("create-first-user"));
    expect(result.view).toBe("create-first-user");
  });

  it("loadProfile returns profile view", async () => {
    const ctx = await createCtx();
    const result = loadProfile(ctx, makeEvent("profile"));
    expect(result.view).toBe("profile");
    expect(result.user).toMatchObject({ id: "admin-1" });
  });

  it("loadDashboard returns dashboard with collection counts", async () => {
    const ctx = await createCtx();
    const result = await loadDashboard(ctx, makeEvent());
    expect(result.view).toBe("dashboard");
    expect((result.dashboardCollections as any[]).length).toBe(1);
    expect((result.dashboardCollections as any[])[0].slug).toBe("posts");
  });

  it("loadCollectionList returns paginated documents", async () => {
    const ctx = await createCtx();
    // Seed a document first.
    const sys = createQueryApi(ctx.runelayer, () => systemRequest("/admin"));
    await sys.create(Posts, { title: "Test post" });

    const result = await loadCollectionList(ctx, makeEvent("collections/posts"), {
      kind: "collection-list",
      slug: "posts",
    });
    expect(result.view).toBe("collection-list");
    expect((result.docs as any[]).length).toBe(1);
    expect(result.page).toBe(1);
  });

  it("loadCollectionCreate returns create view with collection config", async () => {
    const ctx = await createCtx();
    const result = loadCollectionCreate(ctx, makeEvent("collections/posts/create"), {
      kind: "collection-create",
      slug: "posts",
    });
    expect(result.view).toBe("collection-create");
    expect((result.collection as any).slug).toBe("posts");
  });

  it("loadCollectionEdit returns nested grouped data", async () => {
    const ctx = await createCtx({ collections: [GroupedPosts] });
    const sys = createQueryApi(ctx.runelayer, () => systemRequest("/admin"));
    const created = await sys.create(GroupedPosts, {
      title: "Nested post",
      seo: {
        metaTitle: "Meta title",
        metaDescription: "Meta description",
      },
    });

    const result = await loadCollectionEdit(
      ctx,
      makeEvent(`collections/grouped_posts/${created.id}`),
      {
        kind: "collection-edit",
        slug: "grouped_posts",
        id: created.id as string,
      },
    );

    expect(result.document).toMatchObject({
      title: "Nested post",
      seo: {
        metaTitle: "Meta title",
        metaDescription: "Meta description",
      },
    });
  });

  it("loadGlobalEdit returns nested grouped data", async () => {
    const ctx = await createCtx({ collections: [], globals: [SiteSettings] });
    await updateGlobalDocument(ctx.runelayer, SiteSettings, systemRequest("/admin"), {
      seo: {
        title: "Site title",
        description: "Site description",
      },
    });

    const result = await loadGlobalEdit(ctx, makeEvent("globals/site-settings"), {
      kind: "global-edit",
      slug: "site-settings",
    });

    expect(result.document).toMatchObject({
      seo: {
        title: "Site title",
        description: "Site description",
      },
    });
  });

  it("loadUsersCreate returns users-create view with roles", async () => {
    const ctx = await createCtx();
    const result = loadUsersCreate(ctx, makeEvent("users/create"));
    expectTypeOf(result.roles).toEqualTypeOf<RunelayerManagedUserRole[]>();
    expect(result.view).toBe("users-create");
    expect(result.roles).toEqual(["admin", "editor", "user"]);
  });

  it("dispatchLoader routes to the correct loader by kind", async () => {
    const ctx = await createCtx();
    const result = await dispatchLoader(ctx, makeEvent("login"), {
      kind: "login",
    });
    expectTypeOf(result).toMatchTypeOf<RunelayerAdminPageData>();
    expect(result.view).toBe("login");

    const healthResult = await dispatchLoader(ctx, makeEvent("health"), {
      kind: "health",
    });
    expect(healthResult.view).toBe("health");

    const dashResult = await dispatchLoader(ctx, makeEvent(), {
      kind: "dashboard",
    });
    if (dashResult.view === "dashboard") {
      expectTypeOf(dashResult.dashboardCollections).toEqualTypeOf<
        Array<{ slug: string; label: string; count: number }>
      >();
    }
    expect(dashResult.view).toBe("dashboard");
  });
});
