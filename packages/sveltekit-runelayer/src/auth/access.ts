import type { AccessContext, Role } from "./types.js";

type AccessFn = (args: AccessContext) => boolean | Promise<boolean>;

/**
 * Access function: allows only authenticated users with the "admin" role.
 * Composes isLoggedIn + hasRole for defense-in-depth.
 */
export function isAdmin(): AccessFn {
  const loggedIn = isLoggedIn();
  const adminRole = hasRole("admin");
  return (args) => {
    if (!loggedIn(args)) return false;
    return adminRole(args);
  };
}

/**
 * Access function: allows any authenticated user.
 * Returns true if the request carries a valid, non-empty session user ID.
 */
export function isLoggedIn(): AccessFn {
  return ({ req }) => {
    const userId = req.headers.get("x-user-id");
    return !!userId && userId.trim().length > 0;
  };
}

/**
 * Factory: returns an access function that checks for a specific role.
 * The role is read from the `x-user-role` header injected by the auth handle hook.
 * Supports comma-delimited role strings for multi-role users.
 */
export function hasRole(role: Role): AccessFn {
  return ({ req }) => {
    const userRoles =
      req.headers
        .get("x-user-role")
        ?.split(",")
        .map((r) => r.trim().toLowerCase()) ?? [];
    return userRoles.includes(role);
  };
}
