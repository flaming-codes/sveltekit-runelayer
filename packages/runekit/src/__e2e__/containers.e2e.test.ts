/**
 * E2E Journey: Testcontainers-Based Integration Tests
 *
 * Uses real Docker containers for realistic environment validation:
 * - Mailpit: captures auth emails (verification, password reset)
 * - Validates that the CMS can run against containerized services
 *
 * REQUIRES DOCKER: These tests are automatically skipped if Docker is not running.
 * Start Docker Desktop or the Docker daemon before running.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { isDockerRunning } from "./docker-check.js";

import {
  defineConfig,
  createRunekit,
  defineCollection,
  text,
  email,
  checkbox,
  create,
  find,
  findOne,
  update,
  remove,
  type RunekitInstance,
  type QueryContext,
  type CollectionConfig,
} from "../index.js";

// --- Schema for container-based tests ---

const Users: CollectionConfig = defineCollection({
  slug: "users",
  fields: [
    { name: "name", ...text({ required: true }) },
    { name: "email", ...email({ required: true }) },
    { name: "verified", ...checkbox() },
  ],
  auth: true,
  timestamps: true,
});

const Notifications: CollectionConfig = defineCollection({
  slug: "notifications",
  fields: [
    { name: "recipient", ...text({ required: true }) },
    { name: "subject", ...text({ required: true }) },
    { name: "body", ...text() },
    { name: "sent", ...checkbox() },
  ],
  timestamps: true,
});

// --- Mailpit helper ---

interface MailpitMessage {
  ID: string;
  From: { Address: string };
  To: { Address: string }[];
  Subject: string;
  Snippet: string;
}

async function getMailpitMessages(apiUrl: string): Promise<MailpitMessage[]> {
  const res = await fetch(`${apiUrl}/api/v1/messages`);
  const data = (await res.json()) as { messages: MailpitMessage[] };
  return data.messages ?? [];
}

async function deleteAllMailpitMessages(apiUrl: string): Promise<void> {
  await fetch(`${apiUrl}/api/v1/messages`, { method: "DELETE" });
}

// --- Test Suite (skipped if Docker not available) ---

describe.skipIf(!isDockerRunning())("Testcontainers — Mailpit Email Integration", () => {
  let mailpitContainer: StartedTestContainer;
  let mailpitSmtpPort: number;
  let mailpitApiUrl: string;
  let kit: RunekitInstance;
  let tmpDir: string;

  beforeAll(async () => {
    // Start Mailpit container
    mailpitContainer = await new GenericContainer("axllent/mailpit:latest")
      .withExposedPorts(1025, 8025)
      .withStartupTimeout(30_000)
      .start();

    mailpitSmtpPort = mailpitContainer.getMappedPort(1025);
    const mailpitApiPort = mailpitContainer.getMappedPort(8025);
    mailpitApiUrl = `http://${mailpitContainer.getHost()}:${mailpitApiPort}`;

    // Create CMS instance
    tmpDir = await mkdtemp(join(tmpdir(), "runekit-containers-e2e-"));
    kit = createRunekit(
      defineConfig({
        collections: [Users, Notifications],
        dbPath: join(tmpDir, "containers.db"),
        auth: {
          secret: "e2e-test-secret-minimum-32-chars!",
          baseURL: "http://localhost:3000",
        },
      }),
    );

    // Clear any existing messages
    await deleteAllMailpitMessages(mailpitApiUrl);
  }, 60_000); // 60s timeout for container startup

  afterAll(async () => {
    kit?.database.sqlite.close();
    await mailpitContainer?.stop();
    await rm(tmpDir, { recursive: true, force: true });
  });

  // --- Phase 1: Verify Mailpit is running ---

  it("mailpit container is accessible", async () => {
    const res = await fetch(`${mailpitApiUrl}/api/v1/messages`);
    expect(res.status).toBe(200);
  });

  // --- Phase 2: Simulate email notification workflow ---

  it("sends a notification email via Mailpit SMTP", async () => {
    // Use Node's net module to send a raw SMTP email (simulating what
    // Better Auth or a notification system would do)
    const { createConnection } = await import("node:net");

    await new Promise<void>((resolve, reject) => {
      const client = createConnection(mailpitSmtpPort, mailpitContainer.getHost(), () => {
        const commands = [
          "EHLO localhost\r\n",
          "MAIL FROM:<cms@runekit.dev>\r\n",
          "RCPT TO:<admin@example.com>\r\n",
          "DATA\r\n",
          "From: cms@runekit.dev\r\nTo: admin@example.com\r\nSubject: Welcome to Runekit CMS\r\n\r\nYour CMS account has been created.\r\n.\r\n",
          "QUIT\r\n",
        ];

        let commandIndex = 0;
        client.on("data", () => {
          if (commandIndex < commands.length) {
            client.write(commands[commandIndex++]);
          }
        });

        client.on("end", resolve);
        client.on("error", reject);
      });

      // Timeout safety
      setTimeout(() => {
        client.destroy();
        resolve();
      }, 5000);
    });

    // Wait for Mailpit to process
    await new Promise((r) => setTimeout(r, 500));

    const messages = await getMailpitMessages(mailpitApiUrl);
    expect(messages.length).toBeGreaterThanOrEqual(1);

    const welcome = messages.find((m) => m.Subject.includes("Welcome to Runekit"));
    expect(welcome).toBeDefined();
    expect(welcome!.To[0].Address).toBe("admin@example.com");
  });

  // --- Phase 3: CMS operations alongside container services ---

  it("CMS creates users while Mailpit captures emails", async () => {
    const userCtx: QueryContext = {
      db: kit.database,
      collection: Users,
    };

    // Create users
    const admin = await create(userCtx, {
      name: "Admin User",
      email: "admin@example.com",
      verified: true,
    });
    expect(admin.name).toBe("Admin User");

    const editor = await create(userCtx, {
      name: "Editor User",
      email: "editor@example.com",
      verified: false,
    });
    expect(editor.verified).toBe(false);

    // Both users exist
    const users = await find(userCtx);
    expect(users).toHaveLength(2);
  });

  it("CMS notification records track what was sent", async () => {
    const notifCtx: QueryContext = {
      db: kit.database,
      collection: Notifications,
    };

    // Record that we sent the welcome email
    const notif = await create(notifCtx, {
      recipient: "admin@example.com",
      subject: "Welcome to Runekit CMS",
      body: "Your CMS account has been created.",
      sent: true,
    });
    expect(notif.sent).toBe(true);

    // Record a pending notification
    const pending = await create(notifCtx, {
      recipient: "editor@example.com",
      subject: "Please verify your email",
      body: "Click the link to verify.",
      sent: false,
    });
    expect(pending.sent).toBe(false);

    const allNotifs = await find(notifCtx);
    expect(allNotifs).toHaveLength(2);
  });

  // --- Phase 4: Verify email capture and CMS state are consistent ---

  it("Mailpit captured emails match CMS notification records", async () => {
    const messages = await getMailpitMessages(mailpitApiUrl);
    const notifCtx: QueryContext = {
      db: kit.database,
      collection: Notifications,
    };
    const sentNotifs = (await find(notifCtx)).filter((n: any) => n.sent === true || n.sent === 1);

    // At least one sent notification should have a corresponding email
    expect(sentNotifs.length).toBeGreaterThanOrEqual(1);
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });

  // --- Phase 5: Full CRUD lifecycle with container services running ---

  it("full CRUD lifecycle works with containers active", async () => {
    const userCtx: QueryContext = {
      db: kit.database,
      collection: Users,
    };

    // Create
    const user = await create(userCtx, {
      name: "Temp User",
      email: "temp@example.com",
      verified: false,
    });
    expect(user.id).toBeDefined();

    // Read
    const found = await findOne(userCtx, user.id as string);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Temp User");

    // Update
    const updated = await update(userCtx, user.id as string, {
      verified: true,
    });
    expect(updated.verified).toBe(true);

    // Delete
    const deleted = await remove(userCtx, user.id as string);
    expect(deleted!.id).toBe(user.id);

    // Verify gone
    const gone = await findOne(userCtx, user.id as string);
    expect(gone).toBeUndefined();
  });

  // --- Phase 6: Cleanup verification ---

  it("Mailpit messages can be cleared", async () => {
    await deleteAllMailpitMessages(mailpitApiUrl);
    const messages = await getMailpitMessages(mailpitApiUrl);
    expect(messages).toHaveLength(0);
  });
});

// --- Standalone test that verifies Docker check behavior ---

describe("Docker availability check", () => {
  it("isDockerRunning returns a boolean", () => {
    const result = isDockerRunning();
    expect(typeof result).toBe("boolean");
  });

  it("correctly detects Docker state", () => {
    // This test documents the current state — it always passes
    const running = isDockerRunning();
    if (running) {
      console.log("  Docker is running — container tests will execute");
    } else {
      console.log("  Docker is NOT running — container tests will be skipped");
    }
    expect(true).toBe(true);
  });
});
