import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDatabase: vi.fn(() => ({ db: {} })),
  createAuth: vi.fn(),
  createLocalStorage: vi.fn(() => ({
    upload: vi.fn(),
    delete: vi.fn(),
    getUrl: vi.fn(),
    getStream: vi.fn(),
    exists: vi.fn(),
  })),
  createServeHandler: vi.fn(),
}));

vi.mock("../db/index.js", () => ({
  createDatabase: mocks.createDatabase,
}));

vi.mock("../auth/index.js", () => ({
  createAuth: mocks.createAuth,
}));

vi.mock("../storage/index.js", () => ({
  createLocalStorage: mocks.createLocalStorage,
  createServeHandler: mocks.createServeHandler,
}));

import { createRunelayer } from "../plugin.js";

type MockEvent = {
  request: Request;
  url: URL;
  locals: Record<string, unknown>;
};

function createConfig() {
  return {
    collections: [],
    auth: {
      secret: "plugin-test-secret-minimum-32-chars",
      baseURL: "http://localhost:3000",
    },
    database: {
      url: "file:./test.db",
    },
    storage: {
      directory: "./uploads",
      urlPrefix: "/uploads",
    },
  };
}

describe("createRunelayer plugin handle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes storage requests through auth before serving files", async () => {
    const serveHandler = vi.fn(async ({ request }: { request: Request }) => {
      expect(request.headers.get("x-user-id")).toBe("verified-user");
      expect(request.headers.get("x-user-role")).toBe("admin");
      expect(request.headers.get("x-user-email")).toBe("verified@example.com");
      return new Response("file-body", { status: 200 });
    });
    mocks.createServeHandler.mockReturnValue(serveHandler);

    const authHandle = vi.fn(
      async ({
        event,
        resolve,
      }: {
        event: MockEvent;
        resolve: (event: MockEvent) => Promise<Response>;
      }) => {
        event.request.headers.delete("x-user-id");
        event.request.headers.delete("x-user-role");
        event.request.headers.delete("x-user-email");
        event.request.headers.set("x-user-id", "verified-user");
        event.request.headers.set("x-user-role", "admin");
        event.request.headers.set("x-user-email", "verified@example.com");
        return resolve(event);
      },
    );
    mocks.createAuth.mockReturnValue({ auth: {}, handle: authHandle });

    const runelayer = createRunelayer(createConfig());

    const request = new Request("http://localhost:3000/uploads/image.png", {
      headers: {
        "x-user-id": "spoofed-user",
        "x-user-role": "spoofed-role",
        "x-user-email": "spoofed@example.com",
      },
    });
    const event: MockEvent = { request, url: new URL(request.url), locals: {} };
    const resolve = vi.fn(async () => new Response("app-response", { status: 200 }));

    const response = await runelayer.handle({ event, resolve });

    expect(authHandle).toHaveBeenCalledOnce();
    expect(serveHandler).toHaveBeenCalledOnce();
    expect(resolve).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("file-body");
  });

  it("falls back to SvelteKit resolve for missing storage files after auth", async () => {
    const serveHandler = vi.fn(async () => new Response("Not found", { status: 404 }));
    mocks.createServeHandler.mockReturnValue(serveHandler);

    const authHandle = vi.fn(
      async ({
        event,
        resolve,
      }: {
        event: MockEvent;
        resolve: (event: MockEvent) => Promise<Response>;
      }) => {
        event.request.headers.delete("x-user-id");
        event.request.headers.set("x-user-id", "verified-user");
        return resolve(event);
      },
    );
    mocks.createAuth.mockReturnValue({ auth: {}, handle: authHandle });

    const runelayer = createRunelayer(createConfig());

    const request = new Request("http://localhost:3000/uploads/missing.png", {
      headers: {
        "x-user-id": "spoofed-user",
      },
    });
    const event: MockEvent = { request, url: new URL(request.url), locals: {} };
    const resolve = vi.fn(async (resolvedEvent: MockEvent) => {
      expect(resolvedEvent.request.headers.get("x-user-id")).toBe("verified-user");
      return new Response("app-response", { status: 200 });
    });

    const response = await runelayer.handle({ event, resolve });

    expect(authHandle).toHaveBeenCalledOnce();
    expect(serveHandler).toHaveBeenCalledOnce();
    expect(resolve).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });
});
