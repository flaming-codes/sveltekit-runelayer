import type { Actions, Handle, RequestEvent } from "@sveltejs/kit";
import { defineConfig } from "../config.js";
import { createRunelayer } from "../plugin.js";
import { normalizeAdminPath } from "./admin-routing.js";
import { createQueryApi, getUser, toRequest } from "./admin-queries.js";
import { systemRequest } from "./admin-runtime-utils.js";
import type {
  RunelayerAdminRuntime,
  RunelayerApp,
  RunelayerAppConfig,
  RunelayerQueryApi,
} from "./types.js";
import { buildHealthPayload } from "./health.js";
import type { CreateAdminRuntimeInput } from "./admin-runtime.js";

const ADMIN_ACTION_NAMES = [
  "login",
  "createFirstUser",
  "create",
  "update",
  "delete",
  "publish",
  "unpublish",
  "saveDraft",
  "restoreVersion",
  "publishGlobal",
  "unpublishGlobal",
  "saveDraftGlobal",
  "restoreGlobalVersion",
  "logout",
  "createUser",
  "updateUser",
  "deleteUser",
] as const;

export function createRunelayerRuntime(config: RunelayerAppConfig): RunelayerApp {
  const adminPath = normalizeAdminPath(config.admin?.path ?? "/admin");
  const { admin: _admin, kit: _kit, ...runelayerConfig } = config;
  const runelayer = createRunelayer(
    defineConfig({
      ...runelayerConfig,
      adminPath,
    }),
  );

  const system = createQueryApi(runelayer, () => systemRequest(adminPath));

  const withRequest = (eventOrRequest: RequestEvent | Request): RunelayerQueryApi => {
    const req = toRequest(eventOrRequest);
    return createQueryApi(runelayer, () => req);
  };
  let adminRuntimePromise: Promise<RunelayerAdminRuntime> | undefined;
  const getAdminRuntime = async (): Promise<RunelayerAdminRuntime> => {
    if (!adminRuntimePromise) {
      adminRuntimePromise = import("./admin-runtime.js").then(({ createAdminRuntime }) =>
        createAdminRuntime({
          config,
          runelayer,
          adminPath,
          withRequest,
        } satisfies CreateAdminRuntimeInput),
      );
    }
    return adminRuntimePromise;
  };

  const load: RunelayerAdminRuntime["load"] = async (event) => {
    const adminRuntime = await getAdminRuntime();
    return adminRuntime.load(event);
  };

  const actions = {} as Actions;
  for (const actionName of ADMIN_ACTION_NAMES) {
    actions[actionName] = async (event) => {
      const adminRuntime = await getAdminRuntime();
      const handler = adminRuntime.actions[actionName];
      if (typeof handler !== "function") {
        throw config.kit.error(404, `Unknown admin action: ${actionName}`);
      }
      return handler(event);
    };
  }

  const healthPath = `${adminPath}/health`;
  const apiBase = `/runelayer/api/`;

  const handle: Handle = async ({ event, resolve }) => {
    // Intercept /admin/health for JSON API consumers (CI/CD, monitoring).
    if (
      event.url.pathname === healthPath &&
      event.request.method === "GET" &&
      event.request.headers.get("accept")?.includes("application/json")
    ) {
      const health = await buildHealthPayload(runelayer);
      return new Response(JSON.stringify(health), {
        status: health.database ? 200 : 503,
        headers: { "content-type": "application/json" },
      });
    }

    return (runelayer.handle as Handle)({
      event,
      resolve: async (authedEvent) => {
        // Intercept /runelayer/api/{collectionSlug} for admin relationship field options.
        // This must run inside the shared auth boundary so event.locals is trusted.
        if (authedEvent.url.pathname.startsWith(apiBase) && authedEvent.request.method === "GET") {
          const user = getUser(authedEvent as RequestEvent);
          if (!user || user.role !== "admin") {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "content-type": "application/json" },
            });
          }
          const slug = authedEvent.url.pathname.slice(apiBase.length).split("/")[0];
          const collection = runelayer.collections.find((c) => c.slug === slug);
          if (!collection || !slug) {
            return new Response(JSON.stringify({ error: "Unknown collection" }), {
              status: 404,
              headers: { "content-type": "application/json" },
            });
          }
          const limitParam = authedEvent.url.searchParams.get("limit");
          const limit = Math.min(
            Number.isFinite(Number.parseInt(limitParam ?? "", 10))
              ? Number.parseInt(limitParam!, 10)
              : 100,
            200,
          );
          const api = withRequest(authedEvent as RequestEvent);
          const docs = await api.find(collection, { limit });
          const useAsTitle = collection.admin?.useAsTitle;
          return new Response(JSON.stringify({ docs, useAsTitle }), {
            status: 200,
            headers: { "content-type": "application/json", "cache-control": "private, no-store" },
          });
        }

        return resolve(authedEvent);
      },
    });
  };

  return {
    handle,
    admin: {
      load,
      actions,
    },
    withRequest,
    system,
  };
}
