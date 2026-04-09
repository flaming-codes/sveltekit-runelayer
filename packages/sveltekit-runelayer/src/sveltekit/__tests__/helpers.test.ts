import { describe, expect, it, vi } from "vitest";
import {
  createRunelayerAdminRoute as createRunelayerAdminRouteFromHelpers,
  createRunelayerHandle as createRunelayerHandleFromHelpers,
} from "../helpers.js";
import {
  createRunelayerAdminRoute as createRunelayerAdminRouteFromServer,
  createRunelayerHandle as createRunelayerHandleFromServer,
} from "../server.js";

vi.mock("../AdminPage.svelte", () => ({
  default: { __name: "AdminPageMock" },
}));
vi.mock("../AdminErrorPage.svelte", () => ({
  default: { __name: "AdminErrorPageMock" },
}));

describe("sveltekit helpers", () => {
  it("re-exports helper wrappers through server entrypoint", () => {
    expect(typeof createRunelayerHandleFromServer).toBe("function");
    expect(typeof createRunelayerAdminRouteFromServer).toBe("function");
  });

  it("keeps deprecated and component entrypoint re-exports wired", async () => {
    const deprecated = await import("../index.js");
    const components = await import("../components.js");

    expect(typeof deprecated.createRunelayerHandle).toBe("function");
    expect(typeof deprecated.createRunelayerAdminRoute).toBe("function");
    expect(deprecated.AdminRoutePage).toBe(components.AdminRoutePage);
  });

  it("defers getApp() resolution until hook/action execution", async () => {
    const handleImpl = vi.fn(async () => new Response("ok", { status: 200 }));
    const loadImpl = vi.fn(async () => ({ view: "dashboard" }));
    const loginImpl = vi.fn(async () => ({ ok: true }));

    const app = {
      handle: handleImpl,
      admin: {
        load: loadImpl,
        actions: {
          login: loginImpl,
        },
      },
    } as any;

    let appReads = 0;
    const getApp = () => {
      appReads += 1;
      return app;
    };

    const handle = createRunelayerHandleFromHelpers(getApp);
    const route = createRunelayerAdminRouteFromHelpers(getApp);

    expect(appReads).toBe(0);

    const request = new Request("http://localhost/admin/login", { method: "POST" });
    const event = {
      url: new URL(request.url),
      request,
      params: { path: "login" },
      locals: {},
      fetch: vi.fn(),
    } as any;

    const response = await handle({
      event,
      resolve: vi.fn(async () => new Response("fallback", { status: 200 })),
    });
    const loadData = await route.load(event);
    const actionData = await route.actions.login?.(event);

    expect(response.status).toBe(200);
    expect(loadData).toEqual({ view: "dashboard" });
    expect(actionData).toEqual({ ok: true });

    expect(handleImpl).toHaveBeenCalledOnce();
    expect(loadImpl).toHaveBeenCalledOnce();
    expect(loginImpl).toHaveBeenCalledOnce();
    expect(appReads).toBeGreaterThan(0);
  });
});
