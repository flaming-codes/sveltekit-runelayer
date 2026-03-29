import { find } from "@flaming-codes/sveltekit-runelayer";
import { ctx } from "$lib/server/query-helpers.js";
import { parseJson } from "$lib/parse-json.js";
import { SiteSettings, Navigation } from "$lib/server/schema.js";
import type { SiteSettingsRow, NavItem } from "$lib/types.js";

export async function load() {
  const [settingsRows, navRows] = await Promise.all([
    find(ctx(SiteSettings), { limit: 1 }),
    find(ctx(Navigation), { limit: 1 }),
  ]);

  const settings = (settingsRows[0] as SiteSettingsRow) ?? {
    siteName: "Runekit Demo",
    tagline: "CMS-as-a-Package",
  };

  const navDoc = navRows[0] as { items?: string | NavItem[] } | undefined;
  let navItems: NavItem[] = parseJson<NavItem[]>(navDoc?.items, []);
  navItems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return {
    siteSettings: {
      siteName: settings.siteName ?? "Runekit Demo",
      tagline: settings.tagline ?? "",
      description: settings.description ?? "",
      footerText: settings.footerText ?? "",
    },
    navItems,
  };
}
