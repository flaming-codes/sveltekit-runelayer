import type { NamedField } from "./fields.js";
import type { GlobalHooks } from "../hooks/types.js";
import type { AccessControl } from "./types.js";

export interface GlobalConfig {
  slug: string;
  fields: NamedField[];
  label?: string;
  admin?: { group?: string };
  access?: Omit<AccessControl, "create" | "delete">;
  hooks?: GlobalHooks;
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

export function defineGlobal(config: GlobalConfig): GlobalConfig {
  if (hasLocalizedField(config.fields)) {
    console.warn(
      `[runelayer] Global "${config.slug}": "localized: true" has no effect in v1. Localization support is planned for a future release.`,
    );
  }
  return config;
}
