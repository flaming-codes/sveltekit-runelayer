import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { svelteKitHandler } from "better-auth/svelte-kit";
import type { AuthConfig, RunekitAuth } from "./types.js";

export type { AuthConfig, User, Session, Role, AccessContext, RunekitAuth } from "./types.js";
export { isAdmin, isLoggedIn, hasRole } from "./access.js";
export { createAuthHandler } from "./handler.js";

/**
 * Initializes Runekit auth backed by Better Auth + Drizzle/SQLite.
 *
 * Returns the raw Better Auth instance and a SvelteKit `handle` hook
 * that manages sessions and injects user context into request headers.
 */
export function createAuth(
	config: AuthConfig,
	/** Drizzle database instance (from `drizzle(sqlite)`) */
	db: any,
): RunekitAuth {
	const auth = betterAuth({
		secret: config.secret,
		baseURL: config.baseURL,
		basePath: config.basePath ?? "/api/auth",
		database: drizzleAdapter(db, { provider: "sqlite" }),
		emailAndPassword: { enabled: true },
		session: {
			expiresIn: config.sessionMaxAge ?? 60 * 60 * 24 * 7, // 7 days
		},
		user: {
			additionalFields: {
				role: {
					type: "string",
					defaultValue: "user",
					required: false,
				},
			},
		},
	});

	const handle = async ({
		event,
		resolve,
	}: {
		event: any;
		resolve: (event: any) => Response | Promise<Response>;
	}) => {
		// Strip any externally-provided auth headers to prevent spoofing
		event.request.headers.delete("x-user-id");
		event.request.headers.delete("x-user-role");
		event.request.headers.delete("x-user-email");

		// Resolve session from Better Auth and inject into headers
		const session = await auth.api.getSession({ headers: event.request.headers }).catch(() => null);
		if (session?.user) {
			event.request.headers.set("x-user-id", session.user.id);
			event.request.headers.set("x-user-role", (session.user as any).role ?? "user");
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

	return { auth: auth as unknown as RunekitAuth["auth"], handle };
}
