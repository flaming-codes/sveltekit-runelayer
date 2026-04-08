import { describe, expect, it } from "vitest";
import { authAdminPath, safeInt, systemRequest } from "../admin-runtime-utils.js";

describe("admin-runtime-utils", () => {
  it("builds auth admin paths with optional query params", () => {
    expect(authAdminPath("/api/auth", "list-users")).toBe("/api/auth/admin/list-users");
    expect(authAdminPath("/api/auth", "get-user", new URLSearchParams({ id: "u-1" }))).toBe(
      "/api/auth/admin/get-user?id=u-1",
    );
  });

  it("parses positive integers with fallback and optional max cap", () => {
    expect(safeInt("2", 1)).toBe(2);
    expect(safeInt("0", 1)).toBe(1);
    expect(safeInt(null, 1)).toBe(1);
    expect(safeInt("400", 1, 100)).toBe(100);
  });

  it("creates the system admin request", () => {
    const request = systemRequest("/admin");
    expect(request.url).toBe("http://localhost/admin");
    expect(request.headers.get("x-user-id")).toBe("runelayer-system");
    expect(request.headers.get("x-user-role")).toBe("admin");
    expect(request.headers.get("x-user-email")).toBe("system@runelayer.local");
  });
});
