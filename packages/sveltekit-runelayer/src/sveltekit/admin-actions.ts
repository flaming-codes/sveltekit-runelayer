import type { Actions, RequestEvent } from "@sveltejs/kit";
import type { RunelayerInstance } from "../plugin.js";
import type { CollectionConfig } from "../schema/collections.js";
import type { NamedField } from "../schema/fields.js";
import type { GlobalConfig } from "../schema/globals.js";
import {
  updateGlobalDocument,
  publishGlobal,
  unpublishGlobal,
  restoreGlobalVersion,
} from "./globals.js";
import { toSerializable } from "./serializable.js";
import type { AdminRoute } from "./admin-routing.js";
import { parseAdminRoute } from "./admin-routing.js";
import type { RunelayerQueryApi, SvelteKitUtils } from "./types.js";
import {
  countAdminUsers,
  formField,
  getUser,
  normalizeUserRole,
  parseAuthErrorMessage,
  parseManagedUser,
} from "./admin-queries.js";
import { RESERVED_WRITE_FIELDS } from "../query/enforcement.js";

function parseDocumentPayload(
  formData: FormData,
  _fields: NamedField[],
  kit: Pick<SvelteKitUtils, "error">,
): Record<string, unknown> {
  const payload = formField(formData, "payload");
  if (!payload) {
    throw kit.error(400, "Admin form payload is missing.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw kit.error(400, "Admin form payload must be valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw kit.error(400, "Admin form payload must be an object.");
  }

  const document = { ...(parsed as Record<string, unknown>) };
  for (const key of RESERVED_WRITE_FIELDS) {
    delete document[key];
  }
  return document;
}

export interface AdminActionsConfig {
  kit: SvelteKitUtils;
  runelayer: RunelayerInstance;
  adminPath: string;
  authBasePath: string;
  getCollectionBySlug: (runelayer: RunelayerInstance, slug: string) => CollectionConfig;
  resolveGlobalBySlug: (runelayer: RunelayerInstance, slug: string) => GlobalConfig;
  guardAdminRoute: (
    event: RequestEvent,
    route: AdminRoute,
    adminPath: string,
    adminExists: boolean,
  ) => Promise<void>;
  withRequest: (eventOrRequest: RequestEvent | Request) => RunelayerQueryApi;
}

/**
 * Parse and validate the admin route, assert the expected kind, check
 * admin existence, and run the auth guard. Returns the narrowed route
 * on success.
 */
export async function resolveGuardedRoute<K extends AdminRoute["kind"]>(
  event: RequestEvent,
  expectedKind: K | K[],
  cfg: AdminActionsConfig,
): Promise<Extract<AdminRoute, { kind: K }>> {
  const route = parseAdminRoute(event.params.path);
  const kinds = Array.isArray(expectedKind) ? expectedKind : [expectedKind];
  if (!route || !kinds.includes(route.kind as K)) {
    throw cfg.kit.error(404, `Action is only valid on ${kinds.join("/")} routes`);
  }
  const adminExists = (await countAdminUsers(cfg.runelayer)) > 0;
  await cfg.guardAdminRoute(event, route, cfg.adminPath, adminExists);
  return route as Extract<AdminRoute, { kind: K }>;
}

export function createAdminActions(cfg: AdminActionsConfig): Actions {
  const { redirect, error, fail } = cfg.kit;

  const authAdminPath = (suffix: string, searchParams?: URLSearchParams): string => {
    const query = searchParams?.toString();
    const path = `${cfg.authBasePath}/admin/${suffix}`;
    return query && query.length > 0 ? `${path}?${query}` : path;
  };

  const callAuthAdmin = async (
    event: RequestEvent,
    suffix: string,
    init?: RequestInit,
  ): Promise<{
    ok: boolean;
    status: number;
    payload: unknown;
  }> => {
    const headers = new Headers(init?.headers);
    headers.set("content-type", "application/json");
    const response = await event.fetch(authAdminPath(suffix), {
      ...init,
      headers,
    });
    const payload = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  };

  return {
    login: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "login") {
        throw error(404, "Login action is only valid on /admin/login");
      }

      if ((await countAdminUsers(cfg.runelayer)) === 0) {
        throw redirect(303, `${cfg.adminPath}/create-first-user`);
      }

      const formData = await event.request.formData();
      const email = formField(formData, "email").trim();
      const password = formField(formData, "password");

      if (!email || !password) {
        return fail(400, { error: "Email and password are required." });
      }

      const response = await event.fetch(`${cfg.authBasePath}/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          callbackURL: cfg.adminPath,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        if (response.status === 403) {
          return fail(403, {
            error: parseAuthErrorMessage(payload, "Sign-in is blocked for this account."),
          });
        }
        return fail(401, { error: "Invalid email or password." });
      }

      throw redirect(303, cfg.adminPath);
    },

    createFirstUser: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "create-first-user") {
        throw error(404, "Create-first-user action is only valid on /admin/create-first-user");
      }

      if ((await countAdminUsers(cfg.runelayer)) > 0) {
        throw redirect(303, `${cfg.adminPath}/login`);
      }

      const formData = await event.request.formData();
      const name = formField(formData, "name").trim();
      const email = formField(formData, "email").trim();
      const password = formField(formData, "password");

      if (!name || !email || !password) {
        return fail(400, { error: "Name, email, and password are required." });
      }

      const response = await event.fetch(`${cfg.authBasePath}/sign-up/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          callbackURL: cfg.adminPath,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : "Unable to create the first admin user.";

        return fail(400, { error: message });
      }

      // Promote exactly one bootstrap account to admin, even under concurrent setup requests.
      const promotionResult = await cfg.runelayer.database.client.execute({
        sql: `
          UPDATE "user"
          SET role = 'admin'
          WHERE LOWER(email) = LOWER(?)
            AND NOT EXISTS (
              SELECT 1
              FROM "user"
              WHERE (',' || LOWER(COALESCE(role, '')) || ',') LIKE '%,admin,%'
                AND LOWER(email) <> LOWER(?)
            )
        `,
        args: [email, email],
      });

      const promotedRows =
        promotionResult &&
        typeof promotionResult === "object" &&
        "rowsAffected" in promotionResult &&
        typeof (promotionResult as { rowsAffected?: unknown }).rowsAffected === "number"
          ? (promotionResult as { rowsAffected: number }).rowsAffected
          : null;

      if (promotedRows === 0 && (await countAdminUsers(cfg.runelayer)) > 0) {
        await event.fetch(`${cfg.authBasePath}/sign-out`, { method: "POST" }).catch(() => null);
        return fail(409, {
          error: "Another setup request already created the first admin. Please sign in.",
        });
      }

      throw redirect(303, cfg.adminPath);
    },

    create: async (event) => {
      const route = await resolveGuardedRoute(event, "collection-create", cfg);
      const collection = cfg.getCollectionBySlug(cfg.runelayer, route.slug);
      const query = cfg.withRequest(event);

      const formData = await event.request.formData();
      const data = parseDocumentPayload(formData, collection.fields, cfg.kit);
      const document = await query.create(collection, data);

      const newId = (document as Record<string, string>).id;
      throw redirect(303, `${cfg.adminPath}/collections/${route.slug}/${newId}`);
    },

    update: async (event) => {
      const route = await resolveGuardedRoute(event, ["collection-edit", "global-edit"], cfg);
      const formData = await event.request.formData();

      let document: unknown;
      if (route.kind === "global-edit") {
        const global = cfg.resolveGlobalBySlug(cfg.runelayer, route.slug);
        const data = parseDocumentPayload(formData, global.fields, cfg.kit);
        document = await updateGlobalDocument(cfg.runelayer, global, event.request, data);
      } else {
        const collection = cfg.getCollectionBySlug(cfg.runelayer, route.slug);
        const data = parseDocumentPayload(formData, collection.fields, cfg.kit);
        const query = cfg.withRequest(event);
        const id = typeof data.id === "string" ? data.id : route.id;
        delete data.id;
        document = await query.update(collection, id, data);
      }

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    delete: async (event) => {
      const route = await resolveGuardedRoute(event, "collection-edit", cfg);
      const collection = cfg.getCollectionBySlug(cfg.runelayer, route.slug);
      const query = cfg.withRequest(event);

      const formData = await event.request.formData();
      const formId = formData.get("id");
      const id = typeof formId === "string" && formId.length > 0 ? formId : route.id;
      const document = await query.remove(collection, id);

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    createUser: async (event) => {
      await resolveGuardedRoute(event, "users-create", cfg);
      const formData = await event.request.formData();
      const name = formField(formData, "name").trim();
      const email = formField(formData, "email").trim().toLowerCase();
      const role = normalizeUserRole(formField(formData, "role"));
      const password = formField(formData, "password");

      if (!name || !email || !password) {
        return fail(400, { error: "Name, email, and password are required." });
      }

      const result = await callAuthAdmin(event, "create-user", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          role,
          password,
        }),
      });

      if (!result.ok) {
        return fail(result.status, {
          error: parseAuthErrorMessage(result.payload, "Unable to create user."),
        });
      }

      const payloadRecord =
        result.payload && typeof result.payload === "object"
          ? (result.payload as Record<string, unknown>)
          : null;
      const createdUser = parseManagedUser(payloadRecord?.user);
      if (!createdUser) {
        return fail(500, {
          error: "Auth provider returned an invalid user payload.",
        });
      }

      throw redirect(303, `${cfg.adminPath}/users/${createdUser.id}`);
    },

    updateUser: async (event) => {
      const route = await resolveGuardedRoute(event, "users-edit", cfg);
      const formData = await event.request.formData();
      const name = formField(formData, "name").trim();
      const email = formField(formData, "email").trim().toLowerCase();
      const role = normalizeUserRole(formField(formData, "role"));
      const password = formField(formData, "password");

      if (!name || !email) {
        return fail(400, { error: "Name and email are required." });
      }

      const currentUserParams = new URLSearchParams({ id: route.id });
      const currentUserResponse = await event.fetch(authAdminPath("get-user", currentUserParams), {
        method: "GET",
      });
      const currentUserPayload = await currentUserResponse.json().catch(() => null);
      if (!currentUserResponse.ok) {
        return fail(currentUserResponse.status, {
          error: parseAuthErrorMessage(currentUserPayload, "Unable to load user."),
        });
      }

      const currentUser = parseManagedUser(currentUserPayload);
      if (!currentUser) {
        return fail(500, {
          error: "Auth provider returned an invalid user payload.",
        });
      }

      const updateResult = await callAuthAdmin(event, "update-user", {
        method: "POST",
        body: JSON.stringify({
          userId: route.id,
          data: {
            name,
            email,
            role,
          },
        }),
      });

      if (!updateResult.ok) {
        return fail(updateResult.status, {
          error: parseAuthErrorMessage(updateResult.payload, "Unable to update user."),
        });
      }

      if (password.length > 0) {
        const passwordResult = await callAuthAdmin(event, "set-user-password", {
          method: "POST",
          body: JSON.stringify({
            userId: route.id,
            newPassword: password,
          }),
        });

        if (!passwordResult.ok) {
          return fail(passwordResult.status, {
            error: parseAuthErrorMessage(passwordResult.payload, "Unable to set user password."),
          });
        }
      }

      const roleChanged = currentUser.role !== role;
      if (roleChanged || password.length > 0) {
        const revokeResult = await callAuthAdmin(event, "revoke-user-sessions", {
          method: "POST",
          body: JSON.stringify({ userId: route.id }),
        });

        if (!revokeResult.ok) {
          return fail(revokeResult.status, {
            error: parseAuthErrorMessage(
              revokeResult.payload,
              "User updated, but existing sessions could not be revoked.",
            ),
          });
        }
      }

      const updatedUser = parseManagedUser(updateResult.payload);
      return {
        success: true,
        user: toSerializable(updatedUser),
      };
    },

    deleteUser: async (event) => {
      const route = await resolveGuardedRoute(event, "users-edit", cfg);
      const currentUser = getUser(event);
      if (currentUser?.id === route.id) {
        return fail(400, { error: "You cannot delete your own account." });
      }

      const fetchUserParams = new URLSearchParams({ id: route.id });
      const fetchUserResponse = await event.fetch(authAdminPath("get-user", fetchUserParams), {
        method: "GET",
      });
      const fetchUserPayload = await fetchUserResponse.json().catch(() => null);
      if (!fetchUserResponse.ok) {
        throw error(
          fetchUserResponse.status,
          parseAuthErrorMessage(fetchUserPayload, "Unable to load user."),
        );
      }
      const targetUser = parseManagedUser(fetchUserPayload);
      if (!targetUser) {
        throw error(500, "Auth provider returned an invalid user payload.");
      }

      if (targetUser.role === "admin" && (await countAdminUsers(cfg.runelayer)) <= 1) {
        return fail(400, { error: "At least one admin account must remain." });
      }

      const removeResult = await callAuthAdmin(event, "remove-user", {
        method: "POST",
        body: JSON.stringify({ userId: route.id }),
      });

      if (!removeResult.ok) {
        return fail(removeResult.status, {
          error: parseAuthErrorMessage(removeResult.payload, "Unable to delete user."),
        });
      }

      throw redirect(303, `${cfg.adminPath}/users`);
    },

    publish: async (event) => {
      const route = await resolveGuardedRoute(event, "collection-edit", cfg);
      const collection = cfg.getCollectionBySlug(cfg.runelayer, route.slug);
      const query = cfg.withRequest(event);

      const formData = await event.request.formData();
      const id = formField(formData, "id") || route.id;
      const document = await query.publish(collection, id);

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    unpublish: async (event) => {
      const route = await resolveGuardedRoute(event, "collection-edit", cfg);
      const collection = cfg.getCollectionBySlug(cfg.runelayer, route.slug);
      const query = cfg.withRequest(event);

      const formData = await event.request.formData();
      const id = formField(formData, "id") || route.id;
      const document = await query.unpublish(collection, id);

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    saveDraft: async (event) => {
      const route = await resolveGuardedRoute(event, "collection-edit", cfg);
      const collection = cfg.getCollectionBySlug(cfg.runelayer, route.slug);
      const query = cfg.withRequest(event);

      const formData = await event.request.formData();
      const data = parseDocumentPayload(formData, collection.fields, cfg.kit);
      const id = typeof data.id === "string" ? data.id : route.id;
      delete data.id;
      const document = await query.saveDraft(collection, id, data);

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    restoreVersion: async (event) => {
      const route = await resolveGuardedRoute(event, "collection-edit", cfg);
      const collection = cfg.getCollectionBySlug(cfg.runelayer, route.slug);
      const query = cfg.withRequest(event);

      const formData = await event.request.formData();
      const id = formField(formData, "id") || route.id;
      const versionId = formField(formData, "versionId");
      if (!versionId) {
        return fail(400, { error: "Version ID is required." });
      }
      const document = await query.restoreVersion(collection, id, versionId);

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    publishGlobal: async (event) => {
      const route = await resolveGuardedRoute(event, "global-edit", cfg);
      const global = cfg.resolveGlobalBySlug(cfg.runelayer, route.slug);
      const document = await publishGlobal(cfg.runelayer, global, event.request);

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    unpublishGlobal: async (event) => {
      const route = await resolveGuardedRoute(event, "global-edit", cfg);
      const global = cfg.resolveGlobalBySlug(cfg.runelayer, route.slug);
      const document = await unpublishGlobal(cfg.runelayer, global, event.request);

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    saveDraftGlobal: async (event) => {
      const route = await resolveGuardedRoute(event, "global-edit", cfg);
      const global = cfg.resolveGlobalBySlug(cfg.runelayer, route.slug);

      const formData = await event.request.formData();
      const data = parseDocumentPayload(formData, global.fields, cfg.kit);
      const document = await updateGlobalDocument(cfg.runelayer, global, event.request, data, {
        forceDraft: true,
      });

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    restoreGlobalVersion: async (event) => {
      const route = await resolveGuardedRoute(event, "global-edit", cfg);
      const global = cfg.resolveGlobalBySlug(cfg.runelayer, route.slug);

      const formData = await event.request.formData();
      const versionId = formField(formData, "versionId");
      if (!versionId) {
        return fail(400, { error: "Version ID is required." });
      }
      const document = await restoreGlobalVersion(cfg.runelayer, global, event.request, versionId);

      return {
        success: true,
        document: toSerializable(document),
      };
    },

    logout: async (event) => {
      const route = parseAdminRoute(event.params.path);
      if (!route || route.kind !== "logout") {
        throw error(405, "Unsupported admin action");
      }

      if (getUser(event)) {
        await event.fetch(`${cfg.authBasePath}/sign-out`, { method: "POST" }).catch(() => null);
      }

      throw redirect(303, `${cfg.adminPath}/login`);
    },
  };
}
