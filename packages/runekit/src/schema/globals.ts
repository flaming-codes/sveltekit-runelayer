import type { NamedField } from "./fields.js";
import type { AccessControl, Hooks } from "./types.js";

export interface GlobalConfig {
  slug: string;
  fields: NamedField[];
  label?: string;
  admin?: { group?: string };
  access?: Omit<AccessControl, "create" | "delete">;
  hooks?: Pick<Hooks, "beforeChange" | "afterChange">;
  versions?: boolean | { drafts?: boolean; maxPerDoc?: number };
}

export function defineGlobal(config: GlobalConfig): GlobalConfig {
  return config;
}
