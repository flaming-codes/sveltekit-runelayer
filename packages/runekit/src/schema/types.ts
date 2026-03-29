// Shared types for the Runekit schema system

export type AccessFn = (args: { req: Request; id?: string; data?: unknown }) => boolean | Promise<boolean>;

export type AccessControl = {
	create?: AccessFn;
	read?: AccessFn;
	update?: AccessFn;
	delete?: AccessFn;
};

export type FieldAccess = {
	create?: AccessFn;
	read?: AccessFn;
	update?: AccessFn;
};

export type ValidationFn<T = unknown> = (value: T, args: { data: Record<string, unknown> }) => true | string;

export type HookArgs = {
	req: Request;
	data: Record<string, unknown>;
	originalDoc?: Record<string, unknown>;
	id?: string;
};

export type BeforeChangeHook = (args: HookArgs) => Record<string, unknown> | Promise<Record<string, unknown>>;
export type AfterChangeHook = (args: HookArgs) => void | Promise<void>;
export type BeforeDeleteHook = (args: Omit<HookArgs, 'data'>) => void | Promise<void>;
export type AfterDeleteHook = (args: Omit<HookArgs, 'data'>) => void | Promise<void>;

export type BeforeReadHook = (args: Omit<HookArgs, 'data'>) => void | Promise<void>;
export type AfterReadHook = (args: Omit<HookArgs, 'data'> & { doc: Record<string, unknown> }) => void | Promise<void>;

export type Hooks = {
	beforeChange?: BeforeChangeHook[];
	afterChange?: AfterChangeHook[];
	beforeDelete?: BeforeDeleteHook[];
	afterDelete?: AfterDeleteHook[];
	beforeRead?: BeforeReadHook[];
	afterRead?: AfterReadHook[];
};

export type CollectionAuthConfig = {
	tokenExpiration?: number;
	verify?: boolean;
	maxLoginAttempts?: number;
	lockTime?: number;
};

export type UploadConfig = {
	mimeTypes?: string[];
	maxSize?: number;
	imageSizes?: { name: string; width: number; height?: number }[];
};
