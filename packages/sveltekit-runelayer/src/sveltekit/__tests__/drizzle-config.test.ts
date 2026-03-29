import { describe, expect, it } from "vitest";
import { defineRunelayerDrizzleConfig } from "../drizzle-config.js";

describe("defineRunelayerDrizzleConfig", () => {
  it("builds sqlite config by default", () => {
    const config = defineRunelayerDrizzleConfig({
      schema: "./src/lib/server/drizzle-schema.ts",
      database: { url: "file:./data/demo.db" },
    });

    expect(config).toEqual({
      dialect: "sqlite",
      schema: "./src/lib/server/drizzle-schema.ts",
      out: "./drizzle",
      dbCredentials: { url: "file:./data/demo.db" },
    });
  });

  it("builds turso config when auth token is provided", () => {
    const config = defineRunelayerDrizzleConfig({
      schema: "./src/lib/server/drizzle-schema.ts",
      database: {
        url: "libsql://demo.turso.io",
        authToken: "token",
      },
    });

    expect(config).toEqual({
      dialect: "turso",
      schema: "./src/lib/server/drizzle-schema.ts",
      out: "./drizzle",
      dbCredentials: {
        url: "libsql://demo.turso.io",
        authToken: "token",
      },
    });
  });

  it("respects an explicit dialect override", () => {
    const config = defineRunelayerDrizzleConfig({
      schema: "./schema.ts",
      out: "./migrations",
      dialect: "sqlite",
      database: {
        url: "libsql://demo.turso.io",
        authToken: "token",
      },
    });

    expect(config).toEqual({
      dialect: "sqlite",
      schema: "./schema.ts",
      out: "./migrations",
      dbCredentials: {
        url: "libsql://demo.turso.io",
      },
    });
  });
});
