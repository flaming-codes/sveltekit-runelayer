import { redirect, error, fail } from "@sveltejs/kit";
import {
  createRunelayerApp,
  type RunelayerApp,
} from "@flaming-codes/sveltekit-runelayer/sveltekit/server";
import { allCollections, allGlobals } from "./schema.js";

let _app: RunelayerApp | undefined;

export function getRunelayerApp(): RunelayerApp {
  if (!_app) {
    _app = createRunelayerApp({
      kit: { redirect, error, fail },
      collections: allCollections,
      globals: allGlobals,
      auth: {
        secret: process.env.AUTH_SECRET || "demo-secret-do-not-use-in-production-minimum-32-chars",
        baseURL: process.env.ORIGIN || "http://localhost:5173",
      },
      database: {
        url: process.env.DATABASE_URL || "file:./data/demo.db",
        authToken: process.env.DATABASE_AUTH_TOKEN,
      },
      admin: {
        path: "/admin",
        strictAccess: false,
        ui: {
          appName: "Runelayer",
          productName: "Demo Admin",
          footerText: "Runelayer CMS admin built with Carbon UI Shell.",
        },
      },
    });
  }

  return _app;
}
