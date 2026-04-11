import type { LayoutServerLoad } from "./$types.js";
import { loadSiteChrome } from "$lib/server/content.js";

export const load: LayoutServerLoad = async (event) => {
  const chrome = await loadSiteChrome(event);

  return {
    chrome,
    currentPath: event.url.pathname,
  };
};
