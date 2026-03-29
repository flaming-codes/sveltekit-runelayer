import type { User, Session } from "@flaming-codes/sveltekit-runelayer";

declare global {
  namespace App {
    interface Locals {
      user?: User;
      session?: Session;
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      /** Auth signing secret. Required in production. */
      AUTH_SECRET?: string;
      /** Public base URL (e.g. "http://localhost:5173"). */
      ORIGIN?: string;
      /** libsql/Turso database URL. @default "file:./data/demo.db" */
      DATABASE_URL?: string;
      /** Turso auth token for remote databases. */
      DATABASE_AUTH_TOKEN?: string;
      /**
       * Admin access control.
       * "true" (default) — require authenticated admin session.
       * "false"          — disable auth guards (development only).
       */
      RUNELAYER_STRICT_ACCESS?: string;
    }
  }
}

export {};
