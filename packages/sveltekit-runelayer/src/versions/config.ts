export interface NormalizedVersionConfig {
  enabled: true;
  drafts: boolean;
  maxPerDoc: number; // 0 = unlimited
}

/**
 * Normalize the `versions` collection/global config into a consistent shape.
 * Returns `null` when versioning is disabled.
 */
export function normalizeVersionConfig(
  versions: boolean | { drafts?: boolean; maxPerDoc?: number } | undefined,
): NormalizedVersionConfig | null {
  if (!versions) return null;
  if (versions === true) return { enabled: true, drafts: true, maxPerDoc: 0 };
  return {
    enabled: true,
    drafts: versions.drafts ?? true,
    maxPerDoc: versions.maxPerDoc ?? 0,
  };
}
