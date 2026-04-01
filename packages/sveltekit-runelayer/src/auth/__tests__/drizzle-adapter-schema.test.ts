import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { createAuth } from "../index.js";
import { applySchemaForTests } from "../../__testutils__/migrations.js";
import { betterAuthSchema } from "../schema.js";

describe("better-auth drizzle adapter schema wiring", () => {
  let tempDir: string | undefined;
  let client: Client | undefined;

  afterEach(async () => {
    client?.close();
    client = undefined;
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("creates users via auth API when drizzle db is initialized without fullSchema", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "runelayer-auth-drizzle-schema-"));
    const dbUrl = `file:${join(tempDir, "auth-schema.db")}`;
    client = createClient({ url: dbUrl });

    await applySchemaForTests({
      client,
      tables: betterAuthSchema,
    });

    const db = drizzle(client);
    const runelayerAuth = createAuth(
      {
        secret: "drizzle-adapter-schema-test-secret-minimum-32-chars",
        baseURL: "http://localhost:3000",
      },
      db,
    );

    const result = await (runelayerAuth.auth as any).api.createUser({
      body: {
        name: "First Admin",
        email: "admin@example.com",
        password: "super-secret-password",
        role: "admin",
      },
    });

    expect(result?.user?.email).toBe("admin@example.com");
    expect(result?.user?.role).toBe("admin");
  });
});
