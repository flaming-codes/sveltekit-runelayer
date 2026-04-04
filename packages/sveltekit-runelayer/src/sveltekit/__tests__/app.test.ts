import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createClient } from "@libsql/client";
import { migrateDatabaseForTests } from "../../__testutils__/migrations.js";
import { isLoggedIn } from "../../auth/index.js";
import { defineCollection } from "../../schema/collections.js";
import { text } from "../../schema/fields.js";
import { defineGlobal } from "../../schema/globals.js";
import type { SvelteKitUtils } from "../types.js";
import { createRunelayerRuntime } from "../runtime.js";

// Test-compatible stubs that mirror @sveltejs/kit's redirect/error/fail behaviour.
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

interface TestAuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

const DEFAULT_ADMIN_USER: TestAuthUser = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  role: "admin",
};

const ADMIN_LOCALS = {
  user: {
    id: "admin-1",
    email: "admin@example.com",
    role: "admin",
    name: "Admin",
  },
};

const ADMIN_HEADERS = {
  "x-user-id": "admin-1",
  "x-user-role": "admin",
  "x-user-email": "admin@example.com",
};

async function applyAuthSchemaForTests(url: string, users: TestAuthUser[] = []) {
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

    for (const user of users) {
      await client.execute({
        sql: `
          INSERT INTO "user" ("id", "email", "name", "role", "banned", "banReason", "banExpires", "image", "emailVerified", "createdAt", "updatedAt")
          VALUES (?, ?, ?, ?, 0, NULL, NULL, NULL, 1, ?, ?)
        `,
        args: [user.id, user.email, user.name, user.role, now, now],
      });
    }
  } finally {
    client.close();
  }
}

async function createTestApp(options?: { authUsers?: TestAuthUser[] }) {
  const tempDir = mkdtempSync(join(tmpdir(), "runelayer-sveltekit-"));
  const dbUrl = `file:${join(tempDir, "test.db")}`;
  await migrateDatabaseForTests(dbUrl, [Posts]);
  await applyAuthSchemaForTests(dbUrl, options?.authUsers ?? [DEFAULT_ADMIN_USER]);

  return createRunelayerRuntime(
    {
      kit,
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
    headers?: Record<string, string>;
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  },
) {
  const pathname = path ? `/admin/${path}` : "/admin";
  const url = new URL(`http://localhost${pathname}`);

  const body = options?.form ? new URLSearchParams(options.form) : undefined;
  const headers = new Headers(options?.headers ?? {});
  if (body) {
    headers.set("content-type", "application/x-www-form-urlencoded");
  }

  const request = new Request(url, {
    method: options?.method ?? (body ? "POST" : "GET"),
    headers,
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

function adminEvent(
  path?: string,
  options?: Omit<Parameters<typeof makeEvent>[1], "locals" | "headers">,
) {
  return makeEvent(path, {
    ...options,
    locals: ADMIN_LOCALS,
    headers: ADMIN_HEADERS,
  });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe("createRunelayerApp", () => {
  it("resolves admin paths and returns serializable payloads", async () => {
    const app = await createTestApp();
    const created = (await app.system.create(Posts, { title: "Hello" })) as {
      id: string;
    };

    const dashboard = await app.admin.load(adminEvent());
    expect(dashboard.view).toBe("dashboard");

    const list = await app.admin.load(adminEvent("collections/posts"));
    expect(list.view).toBe("collection-list");
    expect((list.docs as unknown[]).length).toBe(1);
    expect(() => JSON.stringify(list)).not.toThrow();
    expect((list.collection as Record<string, unknown>).access).toEqual({});

    const createView = await app.admin.load(adminEvent("collections/posts/create"));
    expect(createView.view).toBe("collection-create");

    const editView = await app.admin.load(adminEvent(`collections/posts/${created.id}`));
    expect(editView.view).toBe("collection-edit");

    const globalView = await app.admin.load(adminEvent("globals/site-settings"));
    expect(globalView.view).toBe("global-edit");
    expect((globalView.global as Record<string, unknown>).slug).toBe("site-settings");
  });

  it("dispatches create/update/delete admin actions", async () => {
    const app = await createTestApp();

    const createRedirect = await (app.admin.actions.create as any)(
      adminEvent("collections/posts/create", {
        form: { payload: JSON.stringify({ title: "Draft" }) },
      }),
    ).catch((e: unknown) => e);

    expect(createRedirect).toMatchObject({ status: 303 });
    const id = (createRedirect as { location: string }).location.split("/").pop() as string;

    const updated = await (app.admin.actions.update as any)(
      adminEvent(`collections/posts/${id}`, {
        form: {
          payload: JSON.stringify({ title: "Published" }),
        },
      }),
    );

    expect(updated.success).toBe(true);
    expect(updated.document.title).toBe("Published");

    const deleted = await (app.admin.actions.delete as any)(
      adminEvent(`collections/posts/${id}`, {
        form: { id },
      }),
    );

    expect(deleted.success).toBe(true);
    const docs = await app.system.find(Posts);
    expect(docs).toHaveLength(0);
  });

  it("dispatches global update action and persists the singleton document", async () => {
    const app = await createTestApp();

    const updated = await (app.admin.actions.update as any)(
      adminEvent("globals/site-settings", {
        form: {
          payload: JSON.stringify({ siteName: "  Runelayer CMS  " }),
        },
      }),
    );

    expect(updated.success).toBe(true);
    expect(updated.document.id).toBe("site-settings");
    expect(updated.document.siteName).toBe("Runelayer CMS");

    const globalView = await app.admin.load(adminEvent("globals/site-settings"));
    expect(globalView.document).toMatchObject({
      id: "site-settings",
      siteName: "Runelayer CMS",
    });
  });

  it("throws 404 for unknown collections in admin routes", async () => {
    const app = await createTestApp();
    await expect(app.admin.load(adminEvent("collections/missing"))).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws 404 for unknown globals in admin routes", async () => {
    const app = await createTestApp();
    await expect(app.admin.load(adminEvent("globals/missing"))).rejects.toMatchObject({
      status: 404,
    });
  });

  it("enforces admin auth access", async () => {
    const app = await createTestApp();

    await expect(app.admin.load(makeEvent())).rejects.toMatchObject({
      status: 303,
      location: "/admin/login",
    });

    await expect(
      app.admin.load(
        makeEvent(undefined, {
          locals: {
            user: {
              id: "editor-1",
              email: "editor@example.com",
              role: "editor",
            },
          },
        }),
      ),
    ).rejects.toMatchObject({
      status: 403,
    });

    const adminView = await app.admin.load(adminEvent());

    expect(adminView.view).toBe("dashboard");
  });

  it("redirects to first-user setup when no admin exists", async () => {
    const app = await createTestApp({ authUsers: [] });

    await expect(app.admin.load(makeEvent())).rejects.toMatchObject({
      status: 303,
      location: "/admin/create-first-user",
    });

    const setupView = await app.admin.load(makeEvent("create-first-user"));
    expect(setupView.view).toBe("create-first-user");
  });

  it("redirects login action to first-user setup when no admin exists", async () => {
    const app = await createTestApp({ authUsers: [] });

    await expect(
      (app.admin.actions.login as any)(
        makeEvent("login", {
          form: {
            email: "admin@example.com",
            password: "secret",
          },
        }),
      ),
    ).rejects.toMatchObject({
      status: 303,
      location: "/admin/create-first-user",
    });
  });

  it("surfaces auth-provider 403 login errors", async () => {
    const app = await createTestApp();

    const result = await (app.admin.actions.login as any)(
      makeEvent("login", {
        form: {
          email: "admin@example.com",
          password: "super-secret-password",
        },
        fetch: async () =>
          new Response(
            JSON.stringify({
              message: "Please verify your email address before signing in.",
            }),
            {
              status: 403,
              headers: { "content-type": "application/json" },
            },
          ),
      }),
    );

    expect(result).toMatchObject({
      status: 403,
      data: { error: "Please verify your email address before signing in." },
    });
  });

  it("does not auto-promote non-admin users — redirects to first-user setup", async () => {
    const app = await createTestApp({
      authUsers: [
        {
          id: "legacy-user-1",
          email: "legacy@example.com",
          name: "Legacy User",
          role: "user",
        },
      ],
    });

    // A non-admin user should NOT be silently promoted to admin.
    // Since no admin exists, the setup flow is required.
    await expect(app.admin.load(makeEvent())).rejects.toMatchObject({
      status: 303,
      location: "/admin/create-first-user",
    });
  });

  it("creates the first admin user through the setup action", async () => {
    const app = await createTestApp({ authUsers: [] });
    const requests: Array<{ url: string; body: string }> = [];

    await expect(
      (app.admin.actions.createFirstUser as any)(
        makeEvent("create-first-user", {
          form: {
            name: "First Admin",
            email: "admin@example.com",
            password: "super-secret-password",
          },
          fetch: async (input, init) => {
            const body = init?.body;
            if (typeof body !== "string") {
              throw new Error("Expected JSON string body");
            }
            requests.push({ url: requestUrl(input), body });
            return new Response(JSON.stringify({}), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          },
        }),
      ),
    ).rejects.toMatchObject({
      status: 303,
      location: "/admin",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("/api/auth/sign-up/email");

    const payload = JSON.parse(requests[0].body) as Record<string, unknown>;
    expect(payload.name).toBe("First Admin");
    expect(payload.email).toBe("admin@example.com");
    expect(payload.password).toBe("super-secret-password");
    expect(payload.role).toBeUndefined();
    expect(payload.callbackURL).toBe("/admin");
  });

  it("blocks first-user setup once an admin already exists", async () => {
    const app = await createTestApp();

    let called = false;

    await expect(
      (app.admin.actions.createFirstUser as any)(
        makeEvent("create-first-user", {
          form: {
            name: "Another Admin",
            email: "other@example.com",
            password: "super-secret-password",
          },
          fetch: async () => {
            called = true;
            return new Response(null, { status: 200 });
          },
        }),
      ),
    ).rejects.toMatchObject({
      status: 303,
      location: "/admin/login",
    });

    expect(called).toBe(false);
  });

  it("loads user management views from Better Auth admin endpoints", async () => {
    const app = await createTestApp();

    const usersView = await app.admin.load(
      adminEvent("users", {
        fetch: async (input: RequestInfo | URL) => {
          const url = requestUrl(input);
          expect(url).toContain("/api/auth/admin/list-users");
          return new Response(
            JSON.stringify({
              users: [
                {
                  id: "u-1",
                  name: "Ada Admin",
                  email: "ada@example.com",
                  role: "admin",
                  emailVerified: true,
                  banned: false,
                },
              ],
              total: 1,
              limit: 20,
              offset: 0,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        },
      }),
    );

    expect(usersView.view).toBe("users-list");
    expect((usersView.users as Array<Record<string, unknown>>)[0]?.email).toBe("ada@example.com");

    const userEditView = await app.admin.load(
      adminEvent("users/u-1", {
        fetch: async (input: RequestInfo | URL) => {
          const url = requestUrl(input);
          expect(url).toContain("/api/auth/admin/get-user");
          return new Response(
            JSON.stringify({
              id: "u-1",
              name: "Ada Admin",
              email: "ada@example.com",
              role: "admin",
              emailVerified: true,
              banned: false,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          );
        },
      }),
    );

    expect(userEditView.view).toBe("users-edit");
    expect((userEditView.managedUser as Record<string, unknown>).id).toBe("u-1");
  });

  it("creates users through the admin create-user endpoint", async () => {
    const app = await createTestApp();
    const calls: Array<{ url: string; body: string }> = [];

    await expect(
      (app.admin.actions.createUser as any)(
        adminEvent("users/create", {
          form: {
            name: "Editor User",
            email: "editor@example.com",
            role: "editor",
            password: "test-password-123",
          },
          fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
            const body = init?.body;
            if (typeof body !== "string") {
              throw new Error("Expected JSON body");
            }
            calls.push({ url: requestUrl(input), body });
            return new Response(
              JSON.stringify({
                user: {
                  id: "u-2",
                  name: "Editor User",
                  email: "editor@example.com",
                  role: "editor",
                  emailVerified: true,
                  banned: false,
                },
              }),
              {
                status: 200,
                headers: { "content-type": "application/json" },
              },
            );
          },
        }),
      ),
    ).rejects.toMatchObject({
      status: 303,
      location: "/admin/users/u-2",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/auth/admin/create-user");
    const payload = JSON.parse(calls[0].body) as Record<string, unknown>;
    expect(payload.email).toBe("editor@example.com");
    expect(payload.role).toBe("editor");
  });

  it("updates users and optionally rotates password via admin endpoints", async () => {
    const app = await createTestApp();
    const calls: string[] = [];

    const result = await (app.admin.actions.updateUser as any)(
      adminEvent("users/u-2", {
        form: {
          name: "Editor Updated",
          email: "editor.updated@example.com",
          role: "editor",
          password: "new-password-123",
        },
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = requestUrl(input);
          calls.push(url);
          if (url.includes("/api/auth/admin/get-user")) {
            return new Response(
              JSON.stringify({
                id: "u-2",
                name: "Editor User",
                email: "editor@example.com",
                role: "editor",
                emailVerified: true,
                banned: false,
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          if (url.endsWith("/admin/update-user")) {
            const body = init?.body;
            if (typeof body !== "string") {
              throw new Error("Expected JSON body");
            }
            return new Response(
              JSON.stringify({
                id: "u-2",
                name: "Editor Updated",
                email: "editor.updated@example.com",
                role: "editor",
                emailVerified: true,
                banned: false,
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          if (url.endsWith("/admin/set-user-password")) {
            const body = init?.body;
            if (typeof body !== "string") {
              throw new Error("Expected JSON body");
            }
            return new Response(JSON.stringify({ status: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
          if (url.endsWith("/admin/revoke-user-sessions")) {
            const body = init?.body;
            if (typeof body !== "string") {
              throw new Error("Expected JSON body");
            }
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ status: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      }),
    );

    expect(result.success).toBe(true);
    expect(calls).toEqual([
      "/api/auth/admin/get-user?id=u-2",
      "/api/auth/admin/update-user",
      "/api/auth/admin/set-user-password",
      "/api/auth/admin/revoke-user-sessions",
    ]);
  });

  it("prevents deleting yourself or the last admin account", async () => {
    const app = await createTestApp();

    const selfDelete = await (app.admin.actions.deleteUser as any)(
      adminEvent("users/admin-1", {
        form: {},
      }),
    );
    expect(selfDelete.status).toBe(400);

    const lastAdminDelete = await (app.admin.actions.deleteUser as any)(
      adminEvent("users/another-admin", {
        form: {},
        fetch: async (input: RequestInfo | URL) => {
          const url = requestUrl(input);
          if (url.includes("/api/auth/admin/get-user")) {
            return new Response(
              JSON.stringify({
                id: "another-admin",
                name: "Another Admin",
                email: "another@example.com",
                role: "admin",
                emailVerified: true,
                banned: false,
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        },
      }),
    );

    expect(lastAdminDelete.status).toBe(400);
  });

  it("supports withRequest and system query APIs", async () => {
    const app = await createTestApp();

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
