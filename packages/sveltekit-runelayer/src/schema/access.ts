// Re-export auth access helpers for use in schema definitions.
// This keeps the ./schema export path lightweight (no @sveltejs/kit, no better-auth).
export { isAdmin, isLoggedIn, hasRole } from "../auth/access.js";
