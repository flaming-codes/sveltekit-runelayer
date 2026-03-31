import { describe, expect, it, vi } from "vitest";
import { createAdminActions, resolveGuardedRoute } from "../admin-actions.js";
import type { AdminActionsConfig } from "../admin-actions.js";
import type { SvelteKitUtils } from "../types.js";

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

function makeEvent(path: string | undefined, locals: Record<string, unknown> = {}) {
  return {
    params: { path },
    url: new URL(`http://localhost/admin/${path ?? ""}`),
    request: new Request("http://localhost"),
    locals,
  } as any;
}

function makeCfg(overrides?: Partial<AdminActionsConfig>): AdminActionsConfig {
  return {
    kit,
    runelayer: {
      database: {
        client: {
          execute: async () => ({ rows: [{ count: 1 }] }),
        },
      },
      collections: [],
      globals: [],
    } as any,
    adminPath: "/admin",
    authBasePath: "/api/auth",
    getCollectionBySlug: () => ({ slug: "posts", fields: [] }) as any,
    resolveGlobalBySlug: () => ({ slug: "settings", fields: [] }) as any,
    guardAdminRoute: vi.fn().mockResolvedValue(undefined),
    withRequest: () => ({}) as any,
    ...overrides,
  };
}

function actionEvent(
  path: string,
  options?: {
    method?: string;
    form?: Record<string, string>;
    fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  },
) {
  const url = new URL(`http://localhost/admin/${path}`);
  const body = options?.form ? new URLSearchParams(options.form) : undefined;
  const headers = new Headers();
  if (body) {
    headers.set("content-type", "application/x-www-form-urlencoded");
  }
  return {
    params: { path },
    url,
    request: new Request(url, {
      method: options?.method ?? (body ? "POST" : "GET"),
      headers,
      body,
    }),
    locals: {},
    fetch: options?.fetch ?? (async () => new Response(null, { status: 200 })),
  } as any;
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe("resolveGuardedRoute", () => {
  it("returns the parsed route when kind matches", async () => {
    const event = makeEvent("collections/posts/create", {
      user: { id: "1", role: "admin", email: "a@b.c", name: "A" },
    });
    const cfg = makeCfg();
    const route = await resolveGuardedRoute(event, "collection-create", cfg);
    expect(route.kind).toBe("collection-create");
    expect(route.slug).toBe("posts");
    expect(cfg.guardAdminRoute).toHaveBeenCalledOnce();
  });

  it("throws 404 when route kind does not match expected", async () => {
    const event = makeEvent("collections/posts");
    const cfg = makeCfg();
    await expect(resolveGuardedRoute(event, "collection-create", cfg)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws 404 for unparseable paths", async () => {
    const event = makeEvent("totally/invalid/deep/path/here");
    const cfg = makeCfg();
    await expect(resolveGuardedRoute(event, "dashboard", cfg)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("accepts an array of expected kinds", async () => {
    const eventEdit = makeEvent("collections/posts/123", {
      user: { id: "1", role: "admin", email: "a@b.c", name: "A" },
    });
    const cfg = makeCfg();
    const route = await resolveGuardedRoute(eventEdit, ["collection-edit", "global-edit"], cfg);
    expect(route.kind).toBe("collection-edit");
  });

  it("calls guardAdminRoute with the correct arguments", async () => {
    const event = makeEvent("users/create", {
      user: { id: "1", role: "admin", email: "a@b.c", name: "A" },
    });
    const guardMock = vi.fn().mockResolvedValue(undefined);
    const cfg = makeCfg({ guardAdminRoute: guardMock });
    await resolveGuardedRoute(event, "users-create", cfg);
    expect(guardMock).toHaveBeenCalledWith(event, { kind: "users-create" }, "/admin", true);
  });
});

describe("createAdminActions", () => {
  it("handles first-admin setup races and signs out the losing bootstrap session", async () => {
    let countCalls = 0;
    const execute = vi.fn(async (query: unknown) => {
      if (typeof query === "string" && query.includes("COUNT(*) AS count")) {
        countCalls += 1;
        return { rows: [{ count: countCalls === 1 ? 0 : 1 }] };
      }
      if (
        query &&
        typeof query === "object" &&
        "sql" in query &&
        typeof (query as { sql?: unknown }).sql === "string"
      ) {
        return { rows: [], rowsAffected: 0 };
      }
      return { rows: [] };
    });

    const cfg = makeCfg({
      runelayer: {
        database: { client: { execute } },
        collections: [],
        globals: [],
      } as any,
    });
    const actions = createAdminActions(cfg);
    const calledUrls: string[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      calledUrls.push(requestUrl(input));
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const result = await (actions.createFirstUser as any)(
      actionEvent("create-first-user", {
        method: "POST",
        form: {
          name: "First Admin",
          email: "admin@example.com",
          password: "super-secret-password",
        },
        fetch,
      }),
    );

    expect(result).toMatchObject({
      status: 409,
      data: {
        error: "Another setup request already created the first admin. Please sign in.",
      },
    });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining("NOT EXISTS"),
      }),
    );
    expect(calledUrls).toEqual(["/api/auth/sign-up/email", "/api/auth/sign-out"]);
  });

  it("revokes user sessions when role changes even without a password change", async () => {
    const cfg = makeCfg();
    const actions = createAdminActions(cfg);
    const calledUrls: string[] = [];
    const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      calledUrls.push(url);
      if (url.includes("/api/auth/admin/get-user")) {
        return new Response(
          JSON.stringify({
            id: "u-2",
            name: "Editor",
            email: "editor@example.com",
            role: "user",
            emailVerified: true,
            banned: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.endsWith("/api/auth/admin/update-user")) {
        return new Response(
          JSON.stringify({
            id: "u-2",
            name: "Editor",
            email: "editor@example.com",
            role: "editor",
            emailVerified: true,
            banned: false,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.endsWith("/api/auth/admin/revoke-user-sessions")) {
        const body = init?.body;
        expect(typeof body).toBe("string");
        expect(JSON.parse(body as string)).toEqual({ userId: "u-2" });
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ status: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const result = await (actions.updateUser as any)(
      actionEvent("users/u-2", {
        method: "POST",
        form: {
          name: "Editor",
          email: "editor@example.com",
          role: "editor",
          password: "",
        },
        fetch,
      }),
    );

    expect(result).toMatchObject({
      success: true,
      user: {
        id: "u-2",
        role: "editor",
      },
    });
    expect(calledUrls).toEqual([
      "/api/auth/admin/get-user?id=u-2",
      "/api/auth/admin/update-user",
      "/api/auth/admin/revoke-user-sessions",
    ]);
  });
});
