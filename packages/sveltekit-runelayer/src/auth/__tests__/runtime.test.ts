import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { createAuth } from "../index.js";

describe("createAuth runtime behavior", () => {
  const clients: Client[] = [];

  afterEach(() => {
    for (const client of clients) {
      client.close();
    }
    clients.length = 0;
  });

  function createDb() {
    const client = createClient({ url: ":memory:" });
    clients.push(client);
    return drizzle(client);
  }

  it("treats actively banned sessions as anonymous and revokes the session", async () => {
    const runelayerAuth = createAuth(
      {
        secret: "runtime-test-secret-minimum-32-chars",
        baseURL: "http://localhost:3000",
      },
      createDb(),
    );

    const api = (runelayerAuth.auth as any).api as {
      getSession: (args: unknown) => Promise<unknown>;
      signOut: (args: unknown) => Promise<unknown>;
    };
    const signOut = vi.fn().mockResolvedValue({ success: true });
    api.getSession = vi.fn().mockResolvedValue({
      user: {
        id: "u-1",
        email: "banned@example.com",
        role: "admin",
        banned: true,
      },
      session: { id: "s-1" },
    });
    api.signOut = signOut;

    const request = new Request("http://localhost:3000/admin", {
      headers: {
        "x-user-id": "spoofed",
        "x-user-role": "admin",
        "x-user-email": "spoofed@example.com",
      },
    });
    const event = { request, url: new URL(request.url), locals: {} as Record<string, unknown> };

    await runelayerAuth.handle({
      event,
      resolve: async (resolvedEvent: any) => {
        expect(resolvedEvent.request.headers.get("x-user-id")).toBeNull();
        expect(resolvedEvent.request.headers.get("x-user-role")).toBeNull();
        expect(resolvedEvent.request.headers.get("x-user-email")).toBeNull();
        expect("user" in resolvedEvent.locals).toBe(false);
        expect("session" in resolvedEvent.locals).toBe(false);
        return new Response(null, { status: 200 });
      },
    });

    expect(signOut).toHaveBeenCalledOnce();
  });

  it("allows expired bans by keeping session context", async () => {
    const runelayerAuth = createAuth(
      {
        secret: "runtime-test-secret-minimum-32-chars",
        baseURL: "http://localhost:3000",
      },
      createDb(),
    );

    const api = (runelayerAuth.auth as any).api as {
      getSession: (args: unknown) => Promise<unknown>;
      signOut: (args: unknown) => Promise<unknown>;
    };
    const signOut = vi.fn().mockResolvedValue({ success: true });
    api.getSession = vi.fn().mockResolvedValue({
      user: {
        id: "u-2",
        email: "admin@example.com",
        role: "admin",
        banned: true,
        banExpires: Date.now() - 60_000,
      },
      session: { id: "s-2" },
    });
    api.signOut = signOut;

    const request = new Request("http://localhost:3000/admin");
    const event = { request, url: new URL(request.url), locals: {} as Record<string, unknown> };

    await runelayerAuth.handle({
      event,
      resolve: async (resolvedEvent: any) => {
        expect(resolvedEvent.request.headers.get("x-user-id")).toBe("u-2");
        expect(resolvedEvent.request.headers.get("x-user-role")).toBe("admin");
        expect(resolvedEvent.request.headers.get("x-user-email")).toBe("admin@example.com");
        expect((resolvedEvent.locals.user as Record<string, unknown>).id).toBe("u-2");
        expect((resolvedEvent.locals.session as Record<string, unknown>).id).toBe("s-2");
        return new Response(null, { status: 200 });
      },
    });

    expect(signOut).not.toHaveBeenCalled();
  });

  it("enables requireEmailVerification in Better Auth options and defaults sendOnSignIn", () => {
    const runelayerAuth = createAuth(
      {
        secret: "runtime-test-secret-minimum-32-chars",
        baseURL: "http://localhost:3000",
        requireEmailVerification: true,
        emailVerification: {
          sendVerificationEmail: async () => {},
        },
      },
      createDb(),
    );

    const options = (runelayerAuth.auth as any).options as Record<string, unknown>;
    const emailAndPassword = options.emailAndPassword as Record<string, unknown>;
    const emailVerification = options.emailVerification as Record<string, unknown>;

    expect(emailAndPassword.requireEmailVerification).toBe(true);
    expect(emailVerification.sendOnSignIn).toBe(true);
  });

  it("throws when requireEmailVerification is enabled without a verification sender", () => {
    expect(() =>
      createAuth(
        {
          secret: "runtime-test-secret-minimum-32-chars",
          baseURL: "http://localhost:3000",
          requireEmailVerification: true,
        },
        createDb(),
      ),
    ).toThrowError(/sendVerificationEmail/i);
  });
});
