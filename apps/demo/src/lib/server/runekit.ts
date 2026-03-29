import {
  defineConfig,
  createRunekit,
  type RunekitInstance,
} from "@flaming-codes/sveltekit-runelayer";
import { allCollections } from "./schema.js";

let _instance: RunekitInstance | undefined;

export function getRunekit(): RunekitInstance {
  if (!_instance) {
    const config = defineConfig({
      collections: allCollections,
      auth: {
        secret: process.env.AUTH_SECRET || "demo-secret-do-not-use-in-production-minimum-32-chars",
        baseURL: process.env.ORIGIN || "http://localhost:5173",
      },
      dbPath: "./data/demo.db",
    });
    _instance = createRunekit(config);
  }
  return _instance;
}
