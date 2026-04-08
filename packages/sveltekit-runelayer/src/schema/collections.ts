import type { NamedField } from "./fields.js";
import type { CollectionHooks } from "../hooks/types.js";
import type { AccessControl, CollectionAuthConfig, UploadConfig } from "./types.js";

export interface CollectionConfig {
  slug: string;
  fields: NamedField[];
  labels?: { singular: string; plural: string };
  admin?: { useAsTitle?: string; defaultColumns?: string[] };
  access?: AccessControl;
  hooks?: CollectionHooks;
  auth?: boolean | CollectionAuthConfig;
  upload?: boolean | UploadConfig;
  versions?: boolean | { drafts?: boolean; maxPerDoc?: number };
}

function hasLocalizedField(fields: NamedField[]): boolean {
  for (const field of fields) {
    if ("localized" in field && field.localized) return true;
    if ("fields" in field && Array.isArray(field.fields) && hasLocalizedField(field.fields)) {
      return true;
    }
  }
  return false;
}

export function defineCollection(config: CollectionConfig): CollectionConfig {
  if (hasLocalizedField(config.fields)) {
    console.warn(
      `[runelayer] Collection "${config.slug}": "localized: true" has no effect in v1. Localization support is planned for a future release.`,
    );
  }
  return config;
}
