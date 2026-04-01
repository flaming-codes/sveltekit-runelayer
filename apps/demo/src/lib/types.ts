/** Row shapes returned by the CMS query layer for demo collections. */

export interface PostRow {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: unknown;
  author?: string;
  category?: string;
  status?: "draft" | "published" | "archived";
  publishedAt?: string;
  featured?: boolean;
  readTime?: number;
  metadata?: string;
  seo_metaTitle?: string;
  seo_metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EnrichedPost extends PostRow {
  authorName?: string;
  categoryName?: string;
}

export interface AuthorRow {
  id: string;
  name: string;
  slug: string;
  email: string;
  bio?: string;
  role?: "staff" | "guest" | "contributor";
  active?: boolean;
  postCount?: number;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  featured?: boolean;
  postCount?: number;
}

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  price: number;
  description?: unknown;
  features?: string;
  specs?: string;
  category?: string;
  image?: string;
  inStock?: boolean;
}

export interface EnrichedProduct extends ProductRow {
  categoryName: string;
  parsedFeatures: string[];
}

export interface MediaRow {
  id: string;
  filename: string;
  alt?: string;
  caption?: string;
  url: string;
  mimeType?: string;
  tags?: string;
}

export interface EnrichedMedia extends MediaRow {
  parsedTags: string[];
}

export interface PageRow {
  id: string;
  title: string;
  slug: string;
  layout?: "default" | "wide" | "sidebar";
  hero_heading?: string;
  hero_subheading?: string;
  hero_showCta?: boolean;
  showRecent?: boolean;
  showCategories?: boolean;
  customHtml?: string;
  email?: string;
  phone?: string;
}

export interface SiteSettingsRow {
  id: string;
  siteName: string;
  tagline?: string;
  description?: string;
  footerText?: string;
}

export interface NavItem {
  label: string;
  href: string;
  order: number;
}
