import {
  createRunelayerApp,
  type RunelayerApp,
} from "@flaming-codes/sveltekit-runelayer/sveltekit";
import { allCollections, allGlobals } from "./schema.js";

let _app: RunelayerApp | undefined;

export function getRunelayerApp(): RunelayerApp {
  if (!_app) {
    _app = createRunelayerApp({
      collections: allCollections,
      globals: allGlobals,
      auth: {
        secret: process.env.AUTH_SECRET || "demo-secret-do-not-use-in-production-minimum-32-chars",
        baseURL: process.env.ORIGIN || "http://localhost:5173",
      },
      database: {
        url: "file:./data/demo.db",
        authToken: process.env.DATABASE_AUTH_TOKEN,
      },
      admin: {
        path: "/admin",
        strictAccess: false,
        ui: {
          theme: "g100",
          appName: "Runelayer",
          productName: "Demo Admin",
          footerText: "Runelayer CMS admin built with Carbon UI Shell.",
        },
      },
    });
  }

  return _app;
}
