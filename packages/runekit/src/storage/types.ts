export interface UploadOptions {
	filename: string;
	mimeType: string;
	folder?: string;
}

export interface StoredFile {
	path: string;
	filename: string;
	mimeType: string;
	size: number;
	url: string;
}

export interface StorageAdapter {
	upload(file: File | Buffer, opts: UploadOptions): Promise<StoredFile>;
	delete(path: string): Promise<void>;
	getUrl(path: string): string;
	getStream(path: string): ReadableStream | null;
	exists(path: string): Promise<boolean>;
}
