import type { AccessFn } from "../schema/types.js";
import { httpError } from "./errors.js";

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
    throw httpError(403, "Forbidden: no request context for access check");
  }
  const allowed = await accessFn({ req, id, data });
  if (!allowed) {
    throw httpError(403, "Forbidden");
  }
}
