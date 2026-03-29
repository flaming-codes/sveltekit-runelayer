import { describe, it, expect } from 'vitest';
import {
	text, textarea, number, richText, select, multiSelect,
	checkbox, date, relationship, upload, json, slug, email,
	group, array, row, collapsible,
	defineCollection, defineGlobal, defineSchema,
} from '../index.js';

describe('field builders', () => {
	it('returns correct type discriminant for each builder', () => {
		expect(text().type).toBe('text');
		expect(textarea().type).toBe('textarea');
		expect(number().type).toBe('number');
		expect(richText().type).toBe('richText');
		expect(checkbox().type).toBe('checkbox');
		expect(date().type).toBe('date');
		expect(json().type).toBe('json');
		expect(email().type).toBe('email');
		expect(select({ options: [{ label: 'A', value: 'a' }] }).type).toBe('select');
		expect(multiSelect({ options: [{ label: 'A', value: 'a' }] }).type).toBe('multiSelect');
		expect(relationship({ relationTo: 'posts' }).type).toBe('relationship');
		expect(upload({ relationTo: 'media' }).type).toBe('upload');
		expect(slug({ from: 'title' }).type).toBe('slug');
		expect(group({ fields: [] }).type).toBe('group');
		expect(array({ fields: [] }).type).toBe('array');
		expect(row({ fields: [] }).type).toBe('row');
		expect(collapsible({ label: 'Meta', fields: [] }).type).toBe('collapsible');
	});

	it('preserves options passed to builders', () => {
		const t = text({ required: true, maxLength: 100 });
		expect(t.required).toBe(true);
		expect(t.maxLength).toBe(100);

		const n = number({ min: 0, max: 10, defaultValue: 5 });
		expect(n.min).toBe(0);
		expect(n.max).toBe(10);
		expect(n.defaultValue).toBe(5);
	});
});

describe('defineCollection', () => {
	it('returns the config object unchanged', () => {
		const config = defineCollection({
			slug: 'posts',
			fields: [{ name: 'title', ...text({ required: true }) }],
			labels: { singular: 'Post', plural: 'Posts' },
		});
		expect(config.slug).toBe('posts');
		expect(config.fields).toHaveLength(1);
		expect(config.fields[0].name).toBe('title');
		expect(config.labels?.plural).toBe('Posts');
	});
});

describe('defineGlobal', () => {
	it('returns the config object unchanged', () => {
		const config = defineGlobal({
			slug: 'settings',
			fields: [{ name: 'siteName', ...text() }],
			label: 'Site Settings',
		});
		expect(config.slug).toBe('settings');
		expect(config.fields[0].name).toBe('siteName');
		expect(config.label).toBe('Site Settings');
	});
});

describe('defineSchema', () => {
	it('combines collections and globals', () => {
		const schema = defineSchema({
			collections: [
				defineCollection({ slug: 'posts', fields: [] }),
				defineCollection({ slug: 'users', fields: [] }),
			],
			globals: [
				defineGlobal({ slug: 'settings', fields: [] }),
			],
		});
		expect(schema.collections).toHaveLength(2);
		expect(schema.globals).toHaveLength(1);
	});

	it('allows omitting globals', () => {
		const schema = defineSchema({
			collections: [defineCollection({ slug: 'posts', fields: [] })],
		});
		expect(schema.globals).toBeUndefined();
	});
});
