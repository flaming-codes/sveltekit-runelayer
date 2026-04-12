import type { PageServerLoad } from "./$types.js";
import { error } from "@sveltejs/kit";
import { loadPageBySlug } from "$lib/server/content.js";

export const load: PageServerLoad = async (event) => {
  const page = await loadPageBySlug(event, event.params.slug);

  if (!page) {
    throw error(404, "Page not found");
  }

  return { page };
};
