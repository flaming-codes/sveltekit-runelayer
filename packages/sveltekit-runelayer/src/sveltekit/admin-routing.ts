export type AdminRoute =
  | { kind: "dashboard" }
  | { kind: "login" }
  | { kind: "create-first-user" }
  | { kind: "logout" }
  | { kind: "profile" }
  | { kind: "health" }
  | { kind: "users-list" }
  | { kind: "users-create" }
  | { kind: "users-edit"; id: string }
  | { kind: "collection-list"; slug: string }
  | { kind: "collection-create"; slug: string }
  | { kind: "collection-edit"; slug: string; id: string }
  | { kind: "global-edit"; slug: string };

export function normalizeAdminPath(path: string): string {
  let normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function parseAdminRoute(path: string | undefined): AdminRoute | null {
  const segments = (path ?? "")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) return { kind: "dashboard" };
  if (segments.length === 1 && segments[0] === "login") return { kind: "login" };
  if (segments.length === 1 && segments[0] === "create-first-user") {
    return { kind: "create-first-user" };
  }
  if (segments.length === 1 && segments[0] === "logout") return { kind: "logout" };
  if (segments.length === 1 && segments[0] === "profile") return { kind: "profile" };
  if (segments.length === 1 && segments[0] === "health") return { kind: "health" };
  if (segments.length === 1 && segments[0] === "users") return { kind: "users-list" };
  if (segments.length === 2 && segments[0] === "users" && segments[1] === "create") {
    return { kind: "users-create" };
  }
  if (segments.length === 2 && segments[0] === "users") {
    return { kind: "users-edit", id: segments[1] };
  }

  if (segments[0] === "collections") {
    if (segments.length === 2) {
      return { kind: "collection-list", slug: segments[1] };
    }

    if (segments.length === 3 && segments[2] === "create") {
      return { kind: "collection-create", slug: segments[1] };
    }

    if (segments.length === 3) {
      return {
        kind: "collection-edit",
        slug: segments[1],
        id: segments[2],
      };
    }
  }

  if (segments[0] === "globals" && segments.length === 2) {
    return { kind: "global-edit", slug: segments[1] };
  }

  return null;
}
