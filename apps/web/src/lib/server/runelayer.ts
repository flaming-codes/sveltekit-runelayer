import { redirect, error, fail } from "@sveltejs/kit";
import { AUTH_SECRET, ORIGIN, DATABASE_URL, DATABASE_AUTH_TOKEN } from "$env/static/private";
import {
  createRunelayerApp,
  type RunelayerApp,
} from "@flaming-codes/sveltekit-runelayer/sveltekit/server";
import { allCollections } from "./schema.js";

let _app: RunelayerApp | undefined;

export function getRunelayerApp(): RunelayerApp {
  if (!_app) {
    _app = createRunelayerApp({
      kit: { redirect, error, fail },
      collections: allCollections,
      globals: [],
      auth: {
        secret: AUTH_SECRET,
        baseURL: ORIGIN,
      },
      database: {
        url: DATABASE_URL,
        authToken: DATABASE_AUTH_TOKEN || undefined,
      },
      admin: {
        path: "/admin",
        ui: {
          appName: "Runelayer",
          productName: "Web Test",
          footerText: "Block-based page testing app.",
        },
      },
    });
  }

  return _app;
}
