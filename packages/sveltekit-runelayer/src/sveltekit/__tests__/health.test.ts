import { describe, expect, it } from "vitest";
import { buildHealthPayload } from "../health.js";
import type { RunelayerInstance } from "../../plugin.js";

function makeRunelayer(opts?: { dbFails?: boolean }): RunelayerInstance {
  return {
    collections: [{ slug: "posts" }, { slug: "pages" }],
    globals: [{ slug: "settings" }],
    database: {
      client: {
        execute: opts?.dbFails
          ? async () => {
              throw new Error("connection refused");
            }
          : async () => ({ rows: [{ "1": 1 }] }),
      },
    },
    handle: async () => new Response(),
  } as unknown as RunelayerInstance;
}

describe("buildHealthPayload", () => {
  it("returns ok status when database is reachable", async () => {
    const health = await buildHealthPayload(makeRunelayer());
    expect(health.status).toBe("ok");
    expect(health.database).toBe(true);
    expect(health.collections).toBe(2);
    expect(health.globals).toBe(1);
    expect(typeof health.timestamp).toBe("string");
  });

  it("returns degraded status when database is unreachable", async () => {
    const health = await buildHealthPayload(makeRunelayer({ dbFails: true }));
    expect(health.status).toBe("degraded");
    expect(health.database).toBe(false);
    expect(health.collections).toBe(2);
    expect(health.globals).toBe(1);
  });

  it("includes an ISO timestamp", async () => {
    const health = await buildHealthPayload(makeRunelayer());
    // Must be parseable as a date.
    const parsed = new Date(health.timestamp);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});
