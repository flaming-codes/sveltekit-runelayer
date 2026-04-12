export type MarketingDoc = Record<string, any>;

export type MarketingBlock = MarketingDoc & {
  blockType: string;
  _key?: string;
};

export type MarketingPage = MarketingDoc & {
  title: string;
  slug: string;
  teaser?: string;
  pageType?: string;
  seo?: MarketingDoc;
  layout: MarketingBlock[];
};

export type SiteChrome = MarketingDoc & {
  siteName: string;
  siteTagline: string;
  siteDescription: string;
  announcementTitle?: string;
  announcementUrl?: string;
  headerLinks?: MarketingBlock[];
  utilityLinks?: MarketingBlock[];
  headerPrimaryCtaLabel?: string;
  headerPrimaryCtaUrl?: string;
  footerBlurb?: string;
  footerProductLinks?: MarketingBlock[];
  footerResourceLinks?: MarketingBlock[];
  footerCompanyLinks?: MarketingBlock[];
  footerLegalLinks?: MarketingBlock[];
  socialGithubUrl?: string;
  socialDocsUrl?: string;
  socialAdminUrl?: string;
};

export type LinkItem = {
  label: string;
  url: string;
  external?: boolean;
};

export function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function asDocs(value: unknown): MarketingDoc[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is MarketingDoc => !!entry && typeof entry === "object");
}

export function asBlocks(value: unknown): MarketingBlock[] {
  return asDocs(value).filter(
    (entry): entry is MarketingBlock => typeof entry.blockType === "string",
  );
}

export function asLinkItems(value: unknown): LinkItem[] {
  return asBlocks(value)
    .map((entry) => ({
      label: asText(entry.label),
      url: asText(entry.url),
      external: asBoolean(entry.external),
    }))
    .filter((entry) => entry.label.length > 0 && entry.url.length > 0);
}

export function asParagraphs(value: unknown): string[] {
  return asText(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
