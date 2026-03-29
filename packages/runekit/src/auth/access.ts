import type { AccessContext, Role } from "./types.js";

type AccessFn = (args: AccessContext) => boolean | Promise<boolean>;

/**
 * Access function: allows only authenticated users with the "admin" role.
 * Requires a session cookie — inspects the `x-user-role` header set by auth middleware.
 */
export function isAdmin(): AccessFn {
	return hasRole("admin");
}

/**
 * Access function: allows any authenticated user.
 * Returns true if the request carries a valid session (indicated by `x-user-id` header).
 */
export function isLoggedIn(): AccessFn {
	return ({ req }) => {
		return req.headers.has("x-user-id");
	};
}

/**
 * Factory: returns an access function that checks for a specific role.
 * The role is read from the `x-user-role` header injected by the auth handle hook.
 */
export function hasRole(role: Role): AccessFn {
	return ({ req }) => {
		return req.headers.get("x-user-role") === role;
	};
}
