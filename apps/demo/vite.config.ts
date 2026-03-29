import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig(async () => {
  return {
    plugins: [await sveltekit()],
    resolve: {
      alias: {
        // better-auth@1.5.6 imports `from "zod"` but uses zod v4 native API (.meta()).
        // zod v4's default export is a v3-compat layer that lacks .meta().
        // Redirect to the v4 native subpath.
        zod: "zod/v4",
      },
    },
  };
});
