import type { HookContext } from './types.js';

type BeforeHook = (ctx: HookContext) => Promise<HookContext> | HookContext;
type AfterHook = (ctx: any) => Promise<any> | any;

export async function runBeforeHooks(
	hooks: BeforeHook[] | undefined,
	context: HookContext
): Promise<HookContext> {
	if (!hooks?.length) return context;

	let ctx = context;
	for (const hook of hooks) {
		ctx = await hook(ctx);
	}
	return ctx;
}

export async function runAfterHooks(
	hooks: AfterHook[] | undefined,
	context: unknown
): Promise<void> {
	if (!hooks?.length) return;

	for (const hook of hooks) {
		try {
			await hook(context);
		} catch (err) {
			console.error('[runekit] afterHook error:', err);
		}
	}
}
