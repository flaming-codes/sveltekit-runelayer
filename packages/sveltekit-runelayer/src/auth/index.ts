import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { svelteKitHandler } from "better-auth/svelte-kit";
import type { AuthConfig, RunelayerAuth } from "./types.js";
import { betterAuthSchema } from "./schema.js";

export type { AuthConfig, User, Session, Role, AccessContext, RunelayerAuth } from "./types.js";
export { isAdmin, isLoggedIn, hasRole } from "./access.js";
export { createAuthHandler } from "./handler.js";

function parseTimestamp(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const parsedNumber = Number(trimmed);
  if (Number.isFinite(parsedNumber)) return parsedNumber;

  const parsedDate = Date.parse(trimmed);
  return Number.isNaN(parsedDate) ? null : parsedDate;
}

function hasActiveBan(user: Record<string, unknown>): boolean {
  const banned = user.banned === true || user.banned === 1 || user.banned === "1";
  if (!banned) return false;

  const banExpiresAt = parseTimestamp(user.banExpires);
  if (banExpiresAt === null) return true;
  return banExpiresAt > Date.now();
}

function clearAuthContext(event: any): void {
  event.request.headers.delete("x-user-id");
  event.request.headers.delete("x-user-role");
  event.request.headers.delete("x-user-email");
  if (event.locals && typeof event.locals === "object") {
    delete event.locals.user;
    delete event.locals.session;
  }
}

/**
 * Initializes Runelayer auth backed by Better Auth + Drizzle/SQLite.
 *
 * Returns the raw Better Auth instance and a SvelteKit `handle` hook
 * that manages sessions and injects user context into request headers.
 */
export function createAuth(
  config: AuthConfig,
  /** Drizzle database instance (from `drizzle(sqlite)`) */
  db: any,
): RunelayerAuth {
  const emailVerification = config.emailVerification ? { ...config.emailVerification } : undefined;
  if (config.requireEmailVerification) {
    if (!emailVerification?.sendVerificationEmail) {
      throw new Error(
        "Auth config requires auth.emailVerification.sendVerificationEmail when requireEmailVerification is enabled.",
      );
    }
    if (emailVerification.sendOnSignIn === undefined) {
      emailVerification.sendOnSignIn = true;
    }
  }

  const auth = betterAuth({
    secret: config.secret,
    baseURL: config.baseURL,
    basePath: config.basePath ?? "/api/auth",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: betterAuthSchema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: config.requireEmailVerification ?? false,
    },
    emailVerification,
    session: {
      expiresIn: config.sessionMaxAge ?? 60 * 60 * 24 * 7, // 7 days
    },
    plugins: [admin({ adminRoles: ["admin"], defaultRole: "user" })],
  });

  const handle = async ({
    event,
    resolve,
  }: {
    event: any;
    resolve: (event: any) => Response | Promise<Response>;
  }) => {
    // Strip any externally-provided auth headers to prevent spoofing
    clearAuthContext(event);

    // Resolve session from Better Auth and inject into headers
    const session = await auth.api.getSession({ headers: event.request.headers }).catch(() => null);
    const sessionUser =
      session?.user && typeof session.user === "object"
        ? (session.user as Record<string, unknown>)
        : null;

    if (sessionUser && hasActiveBan(sessionUser)) {
      await auth.api.signOut({ headers: event.request.headers }).catch(() => null);
      clearAuthContext(event);
    } else if (session?.user) {
      event.request.headers.set("x-user-id", session.user.id);
      event.request.headers.set(
        "x-user-role",
        typeof sessionUser?.role === "string" ? sessionUser.role : "user",
      );
      event.request.headers.set("x-user-email", session.user.email);
      event.locals.user = session.user;
      event.locals.session = session.session;
    }

    // Let Better Auth handle its own API routes
    const authBasePath = config.basePath ?? "/api/auth";
    if (event.url.pathname.startsWith(authBasePath)) {
      return svelteKitHandler({ auth, event, resolve, building: false });
    }

    return resolve(event);
  };

  return { auth: auth as unknown as RunelayerAuth["auth"], handle };
}
