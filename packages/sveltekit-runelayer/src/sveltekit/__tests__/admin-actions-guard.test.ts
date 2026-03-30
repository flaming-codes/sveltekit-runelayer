import { describe, expect, it, vi } from "vitest";
import { resolveGuardedRoute } from "../admin-actions.js";
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
