import { describe, it, expect } from "vitest";
import { isAdmin, isLoggedIn, hasRole } from "../access.js";

function mockReq(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost", { headers });
}

describe("isLoggedIn", () => {
  it("returns true when x-user-id header is present", () => {
    const fn = isLoggedIn();
    expect(fn({ req: mockReq({ "x-user-id": "u1" }) })).toBe(true);
  });

  it("returns false when x-user-id header is missing", () => {
    const fn = isLoggedIn();
    expect(fn({ req: mockReq() })).toBe(false);
  });

  it("returns false when x-user-id header is empty string", () => {
    const fn = isLoggedIn();
    expect(fn({ req: mockReq({ "x-user-id": "" }) })).toBe(false);
  });

  it("returns false when x-user-id header is whitespace only", () => {
    const fn = isLoggedIn();
    expect(fn({ req: mockReq({ "x-user-id": "  " }) })).toBe(false);
  });
});

describe("hasRole", () => {
  it("returns true when x-user-role matches", () => {
    const fn = hasRole("editor");
    expect(fn({ req: mockReq({ "x-user-role": "editor" }) })).toBe(true);
  });

  it("returns false when x-user-role does not match", () => {
    const fn = hasRole("editor");
    expect(fn({ req: mockReq({ "x-user-role": "user" }) })).toBe(false);
  });

  it("returns false when x-user-role is absent", () => {
    const fn = hasRole("admin");
    expect(fn({ req: mockReq() })).toBe(false);
  });
});

describe("isAdmin", () => {
  it("returns true when role is admin and user id is present", () => {
    const fn = isAdmin();
    expect(fn({ req: mockReq({ "x-user-id": "u1", "x-user-role": "admin" }) })).toBe(true);
  });

  it("returns false when role is not admin", () => {
    const fn = isAdmin();
    expect(fn({ req: mockReq({ "x-user-id": "u1", "x-user-role": "editor" }) })).toBe(false);
  });

  it("returns false when no role header", () => {
    const fn = isAdmin();
    expect(fn({ req: mockReq({ "x-user-id": "u1" }) })).toBe(false);
  });

  it("returns false when role is admin but no user id", () => {
    const fn = isAdmin();
    expect(fn({ req: mockReq({ "x-user-role": "admin" }) })).toBe(false);
  });

  it("returns false when role is admin but user id is empty", () => {
    const fn = isAdmin();
    expect(fn({ req: mockReq({ "x-user-id": "", "x-user-role": "admin" }) })).toBe(false);
  });
});
