import { query } from "$lib/server/query-helpers.js";
import { parseJson } from "$lib/parse-json.js";
import { SiteSettings, Navigation } from "$lib/server/schema.js";
import type { SiteSettingsRow, NavItem } from "$lib/types.js";

export async function load() {
  const [settingsRows, navRows] = await Promise.all([
    query().find(SiteSettings, { limit: 1 }),
    query().find(Navigation, { limit: 1 }),
  ]);

  const settings = (settingsRows[0] as SiteSettingsRow) ?? {
    siteName: "Runelayer Demo",
    tagline: "CMS-as-a-Package",
  };

  const navDoc = navRows[0] as { items?: string | NavItem[] } | undefined;
  let navItems: NavItem[] = parseJson<NavItem[]>(navDoc?.items, []);
  navItems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return {
    siteSettings: {
      siteName: settings.siteName ?? "Runelayer Demo",
      tagline: settings.tagline ?? "",
      description: settings.description ?? "",
      footerText: settings.footerText ?? "",
    },
    navItems,
  };
}
