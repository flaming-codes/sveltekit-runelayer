/**
 * E2E Journey: Auth User Journeys with Testcontainers
 *
 * Verifies complete auth lifecycle journeys against the real runtime/auth
 * handlers with persistent cookie/session state:
 * - first-time setup
 * - repeated login
 * - login and logout
 *
 * REQUIRES DOCKER: These tests are automatically skipped if Docker is not running.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { defineCollection, text, type CollectionConfig } from "../index.js";
import type { SvelteKitUtils } from "../sveltekit/types.js";
import type { RunelayerApp } from "../sveltekit/types.js";
import { createRunelayerRuntime } from "../sveltekit/runtime.js";
import { migrateDatabaseForTests } from "../__testutils__/migrations.js";
import { isDockerRunning } from "./docker-check.js";

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

const Accounts: CollectionConfig = defineCollection({
  slug: "accounts",
  fields: [{ name: "title", ...text({ required: true }) }],
  timestamps: true,
});

interface SessionPayload {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  } | null;
  session?: {
    id?: string;
    token?: string;
  } | null;
}

interface Harness {
  app: RunelayerApp;
  dbClient: Client;
  adminLoad: (path?: string) => Promise<Record<string, unknown>>;
  runAdminAction: (
    action: keyof RunelayerApp["admin"]["actions"],
    path: string,
    options?: {
      method?: string;
      form?: Record<string, string>;
    },
  ) => Promise<unknown>;
  getSession: () => Promise<SessionPayload | null>;
  countAdmins: () => Promise<number>;
  countUsersByRole: (role: string) => Promise<number>;
  createUserViaAuth: (input: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) => Promise<{ ok: boolean; status: number; payload: unknown }>;
  cleanup: () => Promise<void>;
}

class CookieJar {
  #cookies = new Map<string, string>();

  apply(headers: Headers): void {
    const serialized = [...this.#cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
    if (serialized) headers.set("cookie", serialized);
  }

  ingest(response: Response): void {
    const rawSetCookies = this.#readSetCookies(response);
    for (const rawSetCookie of rawSetCookies) {
      const parts = rawSetCookie.split(";").map((part) => part.trim());
      const [nameValue, ...attrs] = parts;
      const separator = nameValue.indexOf("=");
      if (separator <= 0) continue;
      const name = nameValue.slice(0, separator);
      const value = nameValue.slice(separator + 1);
      const expiresImmediately = attrs.some((attr) => /^max-age=0$/i.test(attr));

      if (!value || expiresImmediately) {
        this.#cookies.delete(name);
      } else {
        this.#cookies.set(name, value);
      }
    }
  }

  #readSetCookies(response: Response): string[] {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    if (typeof headers.getSetCookie === "function") {
      return headers.getSetCookie();
    }

    const single = response.headers.get("set-cookie");
    return single ? [single] : [];
  }
}

function requestPath(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return `${input.pathname}${input.search}`;
  const url = new URL(input.url);
  return `${url.pathname}${url.search}`;
}

async function applyBetterAuthSchemaForTests(url: string): Promise<void> {
  const client = createClient({ url });
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "emailVerified" INTEGER NOT NULL DEFAULT 0,
        "image" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user',
        "banned" INTEGER NOT NULL DEFAULT 0,
        "banReason" TEXT,
        "banExpires" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "expiresAt" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "impersonatedBy" TEXT,
        "userId" TEXT NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TEXT,
        "refreshTokenExpiresAt" TEXT,
        "scope" TEXT,
        "password" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
      )
    `);

    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_account_idx"
      ON "account" ("providerId", "accountId")
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "identifier" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "expiresAt" TEXT NOT NULL,
        "createdAt" TEXT,
        "updatedAt" TEXT
      )
    `);
  } finally {
    client.close();
  }
}

async function createAuthJourneyHarness(): Promise<Harness> {
  const tempDir = await mkdtemp(join(tmpdir(), "runelayer-auth-journey-e2e-"));
  const dbUrl = `file:${join(tempDir, "auth-journeys.db")}`;
  await migrateDatabaseForTests(dbUrl, [Accounts]);
  await applyBetterAuthSchemaForTests(dbUrl);

  const app = createRunelayerRuntime(
    {
      kit,
      collections: [Accounts],
      auth: {
        secret: "auth-journey-secret-minimum-32-chars!",
        baseURL: "http://localhost:3000",
      },
      database: { url: dbUrl },
      admin: {
        path: "/admin",
      },
    },
    {} as any,
  );

  const dbClient = createClient({ url: dbUrl });
  const cookieJar = new CookieJar();

  const appFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const path = requestPath(input);
    const url = new URL(path, "http://localhost:3000");
    const headers = new Headers(init?.headers ?? {});
    cookieJar.apply(headers);
    if (!headers.has("origin")) {
      headers.set("origin", "http://localhost:3000");
    }

    const request = new Request(url, {
      ...init,
      headers,
    });

    const response = await app.handle({
      event: {
        request,
        url,
        params: {},
        locals: {},
        fetch,
      } as any,
      resolve: async () => new Response(null, { status: 404 }),
    });

    cookieJar.ingest(response);
    return response;
  };

  const resolveLocals = async (pathname: string): Promise<Record<string, unknown>> => {
    const url = new URL(`http://localhost:3000${pathname}`);
    const headers = new Headers();
    cookieJar.apply(headers);

    let locals: Record<string, unknown> = {};
    await app.handle({
      event: {
        request: new Request(url, { headers }),
        url,
        params: {},
        locals: {},
        fetch,
      } as any,
      resolve: async (event: any) => {
        locals = event.locals ?? {};
        return new Response(null, { status: 200 });
      },
    });

    return locals;
  };

  const adminEvent = async (
    path?: string,
    options?: {
      method?: string;
      form?: Record<string, string>;
    },
  ) => {
    const pathname = path ? `/admin/${path}` : "/admin";
    const url = new URL(`http://localhost:3000${pathname}`);
    const headers = new Headers();
    cookieJar.apply(headers);

    let body: URLSearchParams | undefined;
    if (options?.form) {
      body = new URLSearchParams(options.form);
      headers.set("content-type", "application/x-www-form-urlencoded");
    }

    return {
      params: { path },
      request: new Request(url, {
        method: options?.method ?? (body ? "POST" : "GET"),
        headers,
        body,
      }),
      url,
      locals: await resolveLocals(pathname),
      fetch: appFetch,
    } as any;
  };

  return {
    app,
    dbClient,
    async adminLoad(path?: string) {
      return await app.admin.load(await adminEvent(path));
    },
    async runAdminAction(action, path, options) {
      const handler = app.admin.actions[action] as any;
      if (typeof handler !== "function") {
        throw new Error(`Unsupported admin action: ${String(action)}`);
      }
      return await handler(await adminEvent(path, options));
    },
    async getSession() {
      for (const path of ["/api/auth/get-session", "/api/auth/session"]) {
        const response = await appFetch(path, { method: "GET" });
        if (!response.ok) continue;
        const payload = (await response.json().catch(() => null)) as SessionPayload | null;
        if (!payload) continue;
        if (payload.user || payload.session) return payload;
      }
      return null;
    },
    async countAdmins() {
      const result = await dbClient.execute(
        `SELECT COUNT(*) AS count FROM "user" WHERE LOWER(COALESCE(role, '')) = 'admin'`,
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      return Number((row?.count ?? 0) as number);
    },
    async countUsersByRole(role: string) {
      const normalizedRole = role.toLowerCase().replaceAll(`'`, `''`);
      const result = await dbClient.execute(
        `SELECT COUNT(*) AS count FROM "user" WHERE LOWER(COALESCE(role, '')) = '${normalizedRole}'`,
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      return Number((row?.count ?? 0) as number);
    },
    async createUserViaAuth(input) {
      const response = await appFetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: input.name,
          email: input.email,
          password: input.password,
          role: input.role,
          callbackURL: "/admin",
        }),
      });

      return {
        ok: response.ok,
        status: response.status,
        payload: await response.json().catch(() => null),
      };
    },
    async cleanup() {
      dbClient.close();
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}

describe.skipIf(!isDockerRunning())("Testcontainers — Auth User Journey Suite", () => {
  let mailpitContainer: StartedTestContainer;
  let mailpitApiUrl: string;

  beforeAll(async () => {
    mailpitContainer = await new GenericContainer("axllent/mailpit:latest")
      .withExposedPorts(1025, 8025)
      .withStartupTimeout(30_000)
      .start();

    const mailpitApiPort = mailpitContainer.getMappedPort(8025);
    mailpitApiUrl = `http://${mailpitContainer.getHost()}:${mailpitApiPort}`;

    const res = await fetch(`${mailpitApiUrl}/api/v1/messages`);
    expect(res.status).toBe(200);
  }, 60_000);

  afterAll(async () => {
    await mailpitContainer?.stop();
  });

  it("first-time setup journey creates the first admin and starts an authenticated session", async () => {
    const harness = await createAuthJourneyHarness();

    try {
      const preSetupAdminCount = await harness.countAdmins();
      expect(preSetupAdminCount).toBe(0);

      await expect(harness.adminLoad()).rejects.toMatchObject({
        status: 303,
        location: "/admin/create-first-user",
      });

      await expect(harness.adminLoad("login")).rejects.toMatchObject({
        status: 303,
        location: "/admin/create-first-user",
      });

      const setupView = await harness.adminLoad("create-first-user");
      expect(setupView.view).toBe("create-first-user");

      const invalidSetup = await harness.runAdminAction("createFirstUser", "create-first-user", {
        method: "POST",
        form: {
          name: "",
          email: "admin@example.com",
          password: "super-secret-password",
        },
      });
      expect(invalidSetup).toMatchObject({
        status: 400,
        data: { error: "Name, email, and password are required." },
      });

      await expect(
        harness.runAdminAction("createFirstUser", "create-first-user", {
          method: "POST",
          form: {
            name: "First Admin",
            email: "admin@example.com",
            password: "super-secret-password",
          },
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin",
      });

      const session = await harness.getSession();
      expect(session?.user?.email).toBe("admin@example.com");
      expect(session?.user?.role).toBe("admin");

      const adminCount = await harness.countAdmins();
      expect(adminCount).toBe(1);
      const adminRoleCount = await harness.countUsersByRole("admin");
      expect(adminRoleCount).toBe(1);

      const dashboard = await harness.adminLoad();
      expect(dashboard.view).toBe("dashboard");
      expect((dashboard.user as Record<string, unknown>).role).toBe("admin");

      await expect(harness.adminLoad("create-first-user")).rejects.toMatchObject({
        status: 303,
        location: "/admin",
      });

      await expect(
        harness.runAdminAction("logout", "logout", {
          method: "POST",
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });

      await expect(harness.adminLoad("create-first-user")).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });

      await expect(
        harness.runAdminAction("createFirstUser", "create-first-user", {
          method: "POST",
          form: {
            name: "Second Admin",
            email: "another-admin@example.com",
            password: "super-secret-password",
          },
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });

      const postAttemptAdminCount = await harness.countAdmins();
      expect(postAttemptAdminCount).toBe(1);
    } finally {
      await harness.cleanup();
    }
  });

  it("repeated login journey creates fresh sessions while preserving the same admin identity", async () => {
    const harness = await createAuthJourneyHarness();

    try {
      await expect(
        harness.runAdminAction("createFirstUser", "create-first-user", {
          method: "POST",
          form: {
            name: "Admin User",
            email: "admin@example.com",
            password: "super-secret-password",
          },
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin",
      });

      await expect(
        harness.runAdminAction("logout", "logout", {
          method: "POST",
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });

      await expect(
        harness.runAdminAction("login", "login", {
          method: "POST",
          form: {
            email: "admin@example.com",
            password: "wrong-password",
          },
        }),
      ).resolves.toMatchObject({
        status: 401,
        data: { error: "Invalid email or password." },
      });

      const sessionAfterInvalidLogin = await harness.getSession();
      expect(sessionAfterInvalidLogin).toBeNull();

      await expect(
        harness.runAdminAction("login", "login", {
          method: "POST",
          form: {
            email: "admin@example.com",
            password: "super-secret-password",
          },
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin",
      });

      const firstSession = await harness.getSession();
      expect(firstSession?.user?.email).toBe("admin@example.com");
      const firstToken = firstSession?.session?.token ?? "";
      expect(firstToken.length).toBeGreaterThan(0);
      await expect(harness.adminLoad("login")).rejects.toMatchObject({
        status: 303,
        location: "/admin",
      });

      await expect(
        harness.runAdminAction("logout", "logout", {
          method: "POST",
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });

      await expect(
        harness.runAdminAction("login", "login", {
          method: "POST",
          form: {
            email: "admin@example.com",
            password: "super-secret-password",
          },
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin",
      });

      const secondSession = await harness.getSession();
      expect(secondSession?.user?.email).toBe("admin@example.com");
      const secondToken = secondSession?.session?.token ?? "";
      expect(secondToken.length).toBeGreaterThan(0);
      expect(secondToken).not.toBe(firstToken);

      const adminRoleCount = await harness.countUsersByRole("admin");
      expect(adminRoleCount).toBe(1);
    } finally {
      await harness.cleanup();
    }
  });

  it("login and logout journey gates dashboard access correctly across session state changes", async () => {
    const harness = await createAuthJourneyHarness();

    try {
      await expect(
        harness.runAdminAction("createFirstUser", "create-first-user", {
          method: "POST",
          form: {
            name: "Admin User",
            email: "admin@example.com",
            password: "super-secret-password",
          },
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin",
      });

      await expect(
        harness.runAdminAction("logout", "logout", {
          method: "POST",
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });

      const nonAdminSignup = await harness.createUserViaAuth({
        name: "Regular User",
        email: "user@example.com",
        password: "plain-user-password",
      });
      expect(nonAdminSignup.ok).toBe(true);

      const nonAdminSession = await harness.getSession();
      expect(nonAdminSession?.user?.email).toBe("user@example.com");
      expect(nonAdminSession?.user?.role).not.toBe("admin");

      await expect(harness.adminLoad()).rejects.toMatchObject({
        status: 403,
      });

      await expect(
        harness.runAdminAction("logout", "logout", {
          method: "POST",
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });

      await expect(harness.adminLoad()).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });

      await expect(
        harness.runAdminAction("login", "login", {
          method: "POST",
          form: {
            email: "admin@example.com",
            password: "super-secret-password",
          },
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin",
      });

      const dashboard = await harness.adminLoad();
      expect(dashboard.view).toBe("dashboard");

      await expect(
        harness.runAdminAction("logout", "logout", {
          method: "POST",
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });

      await expect(harness.adminLoad()).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });
    } finally {
      await harness.cleanup();
    }
  });

  it("revokes active sessions after admin changes a user's password", async () => {
    const harness = await createAuthJourneyHarness();

    try {
      await expect(
        harness.runAdminAction("createFirstUser", "create-first-user", {
          method: "POST",
          form: {
            name: "Admin User",
            email: "admin@example.com",
            password: "super-secret-password",
          },
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin",
      });

      const initialSession = await harness.getSession();
      const adminId = initialSession?.user?.id;
      expect(typeof adminId).toBe("string");

      const updateResult = await harness.runAdminAction("updateUser", `users/${adminId}`, {
        method: "POST",
        form: {
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
          password: "rotated-password-123",
        },
      });
      expect(updateResult).toMatchObject({
        success: true,
      });

      const sessionAfterPasswordChange = await harness.getSession();
      expect(sessionAfterPasswordChange).toBeNull();

      await expect(harness.adminLoad()).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });
    } finally {
      await harness.cleanup();
    }
  });

  it("treats newly banned users as logged out on the next admin request", async () => {
    const harness = await createAuthJourneyHarness();

    try {
      await expect(
        harness.runAdminAction("createFirstUser", "create-first-user", {
          method: "POST",
          form: {
            name: "Admin User",
            email: "admin@example.com",
            password: "super-secret-password",
          },
        }),
      ).rejects.toMatchObject({
        status: 303,
        location: "/admin",
      });

      const activeSession = await harness.getSession();
      const adminId = activeSession?.user?.id;
      expect(typeof adminId).toBe("string");

      await harness.dbClient.execute({
        sql: `UPDATE "user" SET "banned" = 1 WHERE "id" = ?`,
        args: [adminId as string],
      });

      await expect(harness.adminLoad()).rejects.toMatchObject({
        status: 303,
        location: "/admin/login",
      });

      const sessionAfterBan = await harness.getSession();
      expect(sessionAfterBan).toBeNull();
    } finally {
      await harness.cleanup();
    }
  });
});
