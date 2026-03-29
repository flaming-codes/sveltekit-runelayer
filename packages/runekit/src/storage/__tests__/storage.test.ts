import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLocalStorage } from '../local.js';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import type { StorageAdapter } from '../types.js';

let storage: StorageAdapter;
let testDir: string;

beforeEach(() => {
	testDir = join(tmpdir(), `runekit-test-${randomUUID()}`);
	storage = createLocalStorage({ directory: testDir, urlPrefix: '/files' });
});

afterEach(async () => {
	await rm(testDir, { recursive: true, force: true });
});

describe('createLocalStorage', () => {
	it('upload writes a file and returns metadata', async () => {
		const buf = Buffer.from('hello world');
		const result = await storage.upload(buf, {
			filename: 'test.txt',
			mimeType: 'text/plain',
		});
		expect(result.filename).toBe('test.txt');
		expect(result.mimeType).toBe('text/plain');
		expect(result.size).toBe(buf.byteLength);
		expect(result.url).toMatch(/^\/files\//);
		expect(result.path).toBeTypeOf('string');
	});

	it('upload supports folder option', async () => {
		const buf = Buffer.from('data');
		const result = await storage.upload(buf, {
			filename: 'doc.pdf',
			mimeType: 'application/pdf',
			folder: 'documents',
		});
		expect(result.path).toContain('documents/');
		expect(result.url).toContain('documents/');
	});

	it('exists returns true for uploaded file', async () => {
		const buf = Buffer.from('check');
		const result = await storage.upload(buf, {
			filename: 'exists.txt',
			mimeType: 'text/plain',
		});
		expect(await storage.exists(result.path)).toBe(true);
	});

	it('exists returns false for missing file', async () => {
		expect(await storage.exists('no-such-file.txt')).toBe(false);
	});

	it('delete removes a file', async () => {
		const buf = Buffer.from('delete me');
		const result = await storage.upload(buf, {
			filename: 'gone.txt',
			mimeType: 'text/plain',
		});
		await storage.delete(result.path);
		expect(await storage.exists(result.path)).toBe(false);
	});

	it('getUrl returns prefixed path', () => {
		const url = storage.getUrl('some/path.jpg');
		expect(url).toBe('/files/some/path.jpg');
	});
});
