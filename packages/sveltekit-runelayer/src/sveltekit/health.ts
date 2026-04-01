import type { RunelayerInstance } from "../plugin.js";

export interface HealthPayload {
  status: "ok" | "degraded";
  database: boolean;
  collections: number;
  globals: number;
  timestamp: string;
}

/**
 * Build a health-check payload by pinging the database and counting
 * registered collections/globals. Used by both the HTML `load()` path
 * and the JSON `handle()` interceptor.
 */
export async function buildHealthPayload(runelayer: RunelayerInstance): Promise<HealthPayload> {
  let dbOk = false;
  try {
    await runelayer.database.client.execute("SELECT 1");
    dbOk = true;
  } catch {
    // database unreachable
  }

  return {
    status: dbOk ? "ok" : "degraded",
    database: dbOk,
    collections: runelayer.collections.length,
    globals: runelayer.globals.length,
    timestamp: new Date().toISOString(),
  };
}
