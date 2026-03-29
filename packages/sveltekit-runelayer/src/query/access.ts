import type { AccessFn } from "../schema/types.js";

export async function checkAccess(
  accessFn: AccessFn | undefined,
  req: Request | undefined,
  data?: unknown,
  id?: string,
): Promise<void> {
  // No access function defined = public access
  if (!accessFn) return;
  // Access function defined but no request = deny by default (server-side must explicitly bypass)
  if (!req) {
    throw Object.assign(new Error("Forbidden: no request context for access check"), {
      status: 403,
    });
  }
  const allowed = await accessFn({ req, id, data });
  if (!allowed) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
}
