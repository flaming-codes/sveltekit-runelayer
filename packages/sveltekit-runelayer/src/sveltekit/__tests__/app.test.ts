import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migrateDatabaseForTests } from "../../__testutils__/migrations.js";
import { isLoggedIn } from "../../auth/index.js";
import { defineCollection } from "../../schema/collections.js";
import { text } from "../../schema/fields.js";
import { defineGlobal } from "../../schema/globals.js";
import { createRunelayerRuntime } from "../runtime.js";

const Posts = defineCollection({
  slug: "posts",
  fields: [{ name: "title", ...text({ required: true }) }],
  access: {
    read: isLoggedIn(),
    create: isLoggedIn(),
    update: isLoggedIn(),
    delete: isLoggedIn(),
  },
});

const SiteSettings = defineGlobal({
  slug: "site-settings",
  label: "Site Settings",
  fields: [{ name: "siteName", ...text({ required: true }) }],
  access: {
    read: () => true,
    update: isLoggedIn(),
  },
  hooks: {
    beforeChange: [
      (ctx) => ({
        ...ctx,
        data: {
          ...ctx.data,
          siteName: typeof ctx.data.siteName === "string" ? ctx.data.siteName.trim() : "",
        },
      }),
    ],
  },
});

async function createTestApp(strictAccess: boolean) {
  const tempDir = mkdtempSync(join(tmpdir(), "runelayer-sveltekit-"));
  const dbUrl = `file:${join(tempDir, "test.db")}`;
  await migrateDatabaseForTests(dbUrl, [Posts]);

  return createRunelayerRuntime(
    {
      collections: [Posts],
      globals: [SiteSettings],
      auth: {
        secret: "test-secret-minimum-32-chars-long",
        baseURL: "http://localhost:5173",
      },
      database: {
        url: dbUrl,
      },
      admin: {
        path: "/admin",
        strictAccess,
      },
    },
    {} as any,
  );
}

function makeEvent(
  path?: string,
  options?: {
    method?: string;
    form?: Record<string, string>;
    locals?: Record<string, unknown>;
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  },
) {
  const pathname = path ? `/admin/${path}` : "/admin";
  const url = new URL(`http://localhost${pathname}`);

  const body = options?.form ? new URLSearchParams(options.form) : undefined;
  const request = new Request(url, {
    method: options?.method ?? (body ? "POST" : "GET"),
    headers: body ? { "content-type": "application/x-www-form-urlencoded" } : undefined,
    body,
  });

  return {
    params: { path },
    request,
    url,
    locals: options?.locals ?? {},
    fetch: options?.fetch ?? (async () => new Response(null, { status: 200 })),
  } as any;
}

describe("createRunelayerApp", () => {
  it("resolves admin paths and returns serializable payloads", async () => {
    const app = await createTestApp(false);
    const created = (await app.system.create(Posts, { title: "Hello" })) as { id: string };

    const dashboard = await app.admin.load(makeEvent());
    expect(dashboard.view).toBe("dashboard");

    const list = await app.admin.load(makeEvent("collections/posts"));
    expect(list.view).toBe("collection-list");
    expect((list.docs as unknown[]).length).toBe(1);
    expect(() => JSON.stringify(list)).not.toThrow();
    expect((list.collection as Record<string, unknown>).access).toEqual({});

    const createView = await app.admin.load(makeEvent("collections/posts/create"));
    expect(createView.view).toBe("collection-create");

    const editView = await app.admin.load(makeEvent(`collections/posts/${created.id}`));
    expect(editView.view).toBe("collection-edit");

    const globalView = await app.admin.load(makeEvent("globals/site-settings"));
    expect(globalView.view).toBe("global-edit");
    expect((globalView.global as Record<string, unknown>).slug).toBe("site-settings");
  });

  it("dispatches create/update/delete admin actions", async () => {
    const app = await createTestApp(false);

    const created = await (app.admin.actions.create as any)(
      makeEvent("collections/posts/create", {
        form: { title: "Draft" },
      }),
    );

    expect(created.success).toBe(true);
    const id = created.document.id as string;

    const updated = await (app.admin.actions.update as any)(
      makeEvent(`collections/posts/${id}`, {
        form: {
          id,
          title: "Published",
        },
      }),
    );

    expect(updated.success).toBe(true);
    expect(updated.document.title).toBe("Published");

    const deleted = await (app.admin.actions.delete as any)(
      makeEvent(`collections/posts/${id}`, {
        form: { id },
      }),
    );

    expect(deleted.success).toBe(true);
    const docs = await app.system.find(Posts);
    expect(docs).toHaveLength(0);
  });

  it("dispatches global update action and persists the singleton document", async () => {
    const app = await createTestApp(false);

    const updated = await (app.admin.actions.update as any)(
      makeEvent("globals/site-settings", {
        form: {
          siteName: "  Runelayer CMS  ",
        },
      }),
    );

    expect(updated.success).toBe(true);
    expect(updated.document.id).toBe("site-settings");
    expect(updated.document.siteName).toBe("Runelayer CMS");

    const globalView = await app.admin.load(makeEvent("globals/site-settings"));
    expect(globalView.document).toMatchObject({
      id: "site-settings",
      siteName: "Runelayer CMS",
    });
  });

  it("throws 404 for unknown collections in admin routes", async () => {
    const app = await createTestApp(false);
    await expect(app.admin.load(makeEvent("collections/missing"))).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws 404 for unknown globals in admin routes", async () => {
    const app = await createTestApp(false);
    await expect(app.admin.load(makeEvent("globals/missing"))).rejects.toMatchObject({
      status: 404,
    });
  });

  it("enforces strict admin access when enabled", async () => {
    const app = await createTestApp(true);

    await expect(app.admin.load(makeEvent())).rejects.toMatchObject({
      status: 303,
      location: "/admin/login",
    });

    await expect(
      app.admin.load(
        makeEvent(undefined, {
          locals: { user: { email: "editor@example.com", role: "editor" } },
        }),
      ),
    ).rejects.toMatchObject({
      status: 403,
    });

    const adminView = await app.admin.load(
      makeEvent(undefined, {
        locals: { user: { email: "admin@example.com", role: "admin" } },
      }),
    );

    expect(adminView.view).toBe("dashboard");
  });

  it("supports withRequest and system query APIs", async () => {
    const app = await createTestApp(false);

    await expect(
      app.withRequest(new Request("http://localhost")).create(Posts, { title: "Nope" }),
    ).rejects.toThrow("Forbidden");

    const authed = await app
      .withRequest(
        new Request("http://localhost", {
          headers: {
            "x-user-id": "u-1",
            "x-user-role": "admin",
            "x-user-email": "admin@example.com",
          },
        }),
      )
      .create(Posts, { title: "Allowed" });

    expect(authed.id).toBeTruthy();

    const systemDoc = await app.system.create(Posts, { title: "System" });
    expect(systemDoc.id).toBeTruthy();
  });
});
