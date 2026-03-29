import type { NamedField } from './fields.js';
import type { AccessControl, CollectionAuthConfig, Hooks, UploadConfig } from './types.js';

export interface CollectionConfig {
	slug: string;
	fields: NamedField[];
	labels?: { singular: string; plural: string };
	admin?: { useAsTitle?: string; defaultColumns?: string[] };
	access?: AccessControl;
	hooks?: Hooks;
	auth?: boolean | CollectionAuthConfig;
	upload?: boolean | UploadConfig;
	versions?: boolean | { drafts?: boolean; maxPerDoc?: number };
	timestamps?: boolean;
}

export function defineCollection(config: CollectionConfig): CollectionConfig {
	return config;
}
