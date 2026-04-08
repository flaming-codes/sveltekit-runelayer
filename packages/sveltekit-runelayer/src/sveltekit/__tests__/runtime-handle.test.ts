import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SvelteKitUtils } from "../types.js";

const mocks = vi.hoisted(() => ({
  createRunelayer: vi.fn(),
  createAdminActions: vi.fn(() => ({})),
  createQueryApi: vi.fn(),
  countAdminUsers: vi.fn(async () => 1),
  buildHealthPayload: vi.fn(async () => ({
    status: "ok",
    database: true,
    collections: 0,
    globals: 0,
    timestamp: new Date().toISOString(),
  })),
}));

vi.mock("../../config.js", () => ({
  defineConfig: (config: unknown) => config,
}));

vi.mock("../../plugin.js", () => ({
  createRunelayer: mocks.createRunelayer,
}));

vi.mock("../admin-actions.js", () => ({
  createAdminActions: mocks.createAdminActions,
}));

vi.mock("../admin-queries.js", () => ({
  countAdminUsers: mocks.countAdminUsers,
  createQueryApi: mocks.createQueryApi,
  getUser: (event: any) => event.locals?.user ?? null,
  normalizeUserRole: (input: string) => input.trim().toLowerCase(),
  parseAuthErrorMessage: (_payload: unknown, fallback: string) => fallback,
  parseManagedUser: (payload: unknown) => payload,
  toRequest: (eventOrRequest: any) => eventOrRequest.request ?? eventOrRequest,
}));

vi.mock("../health.js", () => ({
  buildHealthPayload: mocks.buildHealthPayload,
}));

import { createRunelayerRuntime } from "../runtime.js";

function makeKit(): SvelteKitUtils {
  return {
    redirect(status: number, location: string | URL): never {
      throw Object.assign(new Error("redirect"), { status, location: String(location) });
    },
    error(status: number, body?: string | { message: string }): never {
      const message = typeof body === "string" ? body : (body?.message ?? "error");
      throw Object.assign(new Error(message), { status });
    },
    fail(status: number, data?: any) {
      return { status, data } as any;
    },
  };
}

function makeConfig() {
  return {
    kit: makeKit(),
    collections: [],
    globals: [],
    auth: {
      secret: "runtime-handle-test-secret-minimum-32",
      baseURL: "http://localhost:5173",
    },
    database: {
      url: "file:./runtime-handle.test.db",
    },
    admin: {
      path: "/admin",
    },
  };
}

function makeQueryApi(findImpl: (collection: unknown, args?: unknown) => Promise<unknown>) {
  return {
    find: findImpl,
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    saveDraft: vi.fn(),
    findVersionHistory: vi.fn(),
    restoreVersion: vi.fn(),
  };
}

describe("runtime handle endpoint guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes /runelayer/api through shared auth handle before admin check", async () => {
    const find = vi.fn(async () => [{ id: "doc-1", title: "Hello" }]);
    mocks.createQueryApi.mockReturnValue(makeQueryApi(find));

    const runelayerHandle = vi.fn(
      async ({ event, resolve }: { event: any; resolve: (event: any) => Promise<Response> }) => {
        event.locals.user = {
          id: "admin-1",
          email: "admin@example.com",
          role: "admin",
          name: "Admin",
        };
        return resolve(event);
      },
    );

    mocks.createRunelayer.mockReturnValue({
      collections: [{ slug: "posts", admin: { useAsTitle: "title" } }],
      globals: [],
      database: { client: { execute: vi.fn() } },
      handle: runelayerHandle,
    });

    const app = createRunelayerRuntime(makeConfig(), {} as any);
    const request = new Request("http://localhost/runelayer/api/posts?limit=25", {
      method: "GET",
    });
    const event = {
      url: new URL(request.url),
      request,
      locals: {},
      params: {},
      fetch: vi.fn(),
    } as any;
    const resolve = vi.fn(async () => new Response("fallback", { status: 200 }));

    const response = await app.handle({ event, resolve });

    expect(runelayerHandle).toHaveBeenCalledOnce();
    expect(resolve).not.toHaveBeenCalled();
    expect(find).toHaveBeenCalledOnce();
    expect(find).toHaveBeenCalledWith(
      { slug: "posts", admin: { useAsTitle: "title" } },
      {
        limit: 25,
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      docs: [{ id: "doc-1", title: "Hello" }],
      useAsTitle: "title",
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns 401 on /runelayer/api when shared auth layer has no admin user", async () => {
    const find = vi.fn(async () => [{ id: "doc-1" }]);
    mocks.createQueryApi.mockReturnValue(makeQueryApi(find));

    const runelayerHandle = vi.fn(
      async ({ event, resolve }: { event: any; resolve: (event: any) => Promise<Response> }) =>
        resolve(event),
    );

    mocks.createRunelayer.mockReturnValue({
      collections: [{ slug: "posts" }],
      globals: [],
      database: { client: { execute: vi.fn() } },
      handle: runelayerHandle,
    });

    const app = createRunelayerRuntime(makeConfig(), {} as any);
    const request = new Request("http://localhost/runelayer/api/posts", { method: "GET" });
    const event = {
      url: new URL(request.url),
      request,
      locals: {},
      params: {},
      fetch: vi.fn(),
    } as any;
    const resolve = vi.fn(async () => new Response("fallback", { status: 200 }));

    const response = await app.handle({ event, resolve });

    expect(runelayerHandle).toHaveBeenCalledOnce();
    expect(resolve).not.toHaveBeenCalled();
    expect(find).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("keeps /admin/health JSON public without requiring auth middleware", async () => {
    const runelayerHandle = vi.fn();
    mocks.createRunelayer.mockReturnValue({
      collections: [],
      globals: [],
      database: { client: { execute: vi.fn() } },
      handle: runelayerHandle,
    });
    mocks.createQueryApi.mockReturnValue(makeQueryApi(vi.fn(async () => [])));

    const app = createRunelayerRuntime(makeConfig(), {} as any);
    const request = new Request("http://localhost/admin/health", {
      method: "GET",
      headers: { accept: "application/json" },
    });
    const event = {
      url: new URL(request.url),
      request,
      locals: {},
      params: {},
      fetch: vi.fn(),
    } as any;
    const resolve = vi.fn(async () => new Response("fallback", { status: 200 }));

    const response = await app.handle({ event, resolve });

    expect(runelayerHandle).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      database: true,
    });
  });
});
