export function systemRequest(adminPath: string): Request {
  return new Request(`http://localhost${adminPath}`, {
    headers: {
      "x-user-id": "runelayer-system",
      "x-user-role": "admin",
      "x-user-email": "system@runelayer.local",
    },
  });
}

export function authAdminPath(
  authBasePath: string,
  suffix: string,
  searchParams?: URLSearchParams,
): string {
  const query = searchParams?.toString();
  const path = `${authBasePath}/admin/${suffix}`;
  return query && query.length > 0 ? `${path}?${query}` : path;
}

export function safeInt(value: string | null, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  const clamped = Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
  return max ? Math.min(clamped, max) : clamped;
}
