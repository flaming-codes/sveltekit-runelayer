/**
 * Typed environment variable reader for Runelayer.
 *
 * All Runelayer env vars use the `RUNELAYER_` prefix.
 * Host-app env vars (AUTH_SECRET, ORIGIN, DATABASE_URL, etc.)
 * are read directly by the app, not by this module.
 */

/** Known Runelayer environment variables and their types. */
export interface RunelayerEnv {
  /**
   * Disable admin auth guards. Set to "false" to allow unauthenticated access.
   * Any other value (or unset) keeps strict access enabled.
   * @default "true"
   */
  RUNELAYER_STRICT_ACCESS: string | undefined;
}

/**
 * Read a `RUNELAYER_*` env var from `process.env`, returning `undefined` if absent.
 */
function readEnv(key: keyof RunelayerEnv): string | undefined {
  return typeof process !== "undefined" && process.env ? process.env[key] : undefined;
}

/**
 * Parse `RUNELAYER_STRICT_ACCESS`.
 * Returns `true` unless the env var is explicitly set to `"false"` or `"0"`.
 * When the env var is unset, returns `undefined` so the caller can fall back to config.
 */
export function readStrictAccess(): boolean | undefined {
  const raw = readEnv("RUNELAYER_STRICT_ACCESS");
  if (raw === undefined || raw === "") return undefined;
  return raw !== "false" && raw !== "0";
}
