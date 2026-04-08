import { defineConfig } from "drizzle-kit";
import { defineRunelayerDrizzleConfig } from "@flaming-codes/sveltekit-runelayer/sveltekit/drizzle";

export default defineConfig(
  defineRunelayerDrizzleConfig({
    schema: "./src/lib/server/drizzle-schema.ts",
    out: "./drizzle",
    database: {
      url: "file:./data/web.db",
    },
  }),
);
