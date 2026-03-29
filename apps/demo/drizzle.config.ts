import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/server/drizzle-schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "file:./data/demo.db",
  },
});
