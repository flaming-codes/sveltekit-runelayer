import { describe, it, expect } from "vitest";
import { parseAdminRoute, normalizeAdminPath } from "../admin-routing.js";

describe("normalizeAdminPath", () => {
  it("adds leading slash if missing", () => {
    expect(normalizeAdminPath("admin")).toBe("/admin");
  });

  it("keeps leading slash if present", () => {
    expect(normalizeAdminPath("/admin")).toBe("/admin");
  });

  it("strips trailing slash", () => {
    expect(normalizeAdminPath("/admin/")).toBe("/admin");
  });

  it("does not strip single slash", () => {
    expect(normalizeAdminPath("/")).toBe("/");
  });
});

describe("parseAdminRoute", () => {
  it("returns dashboard for empty path", () => {
    expect(parseAdminRoute("")).toEqual({ kind: "dashboard" });
  });

  it("returns dashboard for undefined", () => {
    expect(parseAdminRoute(undefined)).toEqual({ kind: "dashboard" });
  });

  it("returns dashboard for root slash", () => {
    expect(parseAdminRoute("/")).toEqual({ kind: "dashboard" });
  });

  it("parses login route", () => {
    expect(parseAdminRoute("login")).toEqual({ kind: "login" });
    expect(parseAdminRoute("/login")).toEqual({ kind: "login" });
  });

  it("parses create-first-user route", () => {
    expect(parseAdminRoute("create-first-user")).toEqual({ kind: "create-first-user" });
  });

  it("parses logout route", () => {
    expect(parseAdminRoute("logout")).toEqual({ kind: "logout" });
  });

  it("parses profile route", () => {
    expect(parseAdminRoute("profile")).toEqual({ kind: "profile" });
    expect(parseAdminRoute("/profile")).toEqual({ kind: "profile" });
  });

  it("parses health route", () => {
    expect(parseAdminRoute("health")).toEqual({ kind: "health" });
  });

  it("parses users list route", () => {
    expect(parseAdminRoute("users")).toEqual({ kind: "users-list" });
    expect(parseAdminRoute("/users")).toEqual({ kind: "users-list" });
  });

  it("parses users create route", () => {
    expect(parseAdminRoute("users/create")).toEqual({ kind: "users-create" });
  });

  it("parses user edit route with id", () => {
    expect(parseAdminRoute("users/123")).toEqual({ kind: "users-edit", id: "123" });
    expect(parseAdminRoute("/users/abc-def")).toEqual({ kind: "users-edit", id: "abc-def" });
  });

  it("parses collection list route", () => {
    expect(parseAdminRoute("collections/posts")).toEqual({
      kind: "collection-list",
      slug: "posts",
    });
  });

  it("parses collection create route", () => {
    expect(parseAdminRoute("collections/posts/create")).toEqual({
      kind: "collection-create",
      slug: "posts",
    });
  });

  it("parses collection edit route with id", () => {
    expect(parseAdminRoute("collections/posts/123")).toEqual({
      kind: "collection-edit",
      slug: "posts",
      id: "123",
    });
  });

  it("parses global edit route", () => {
    expect(parseAdminRoute("globals/settings")).toEqual({
      kind: "global-edit",
      slug: "settings",
    });
  });

  it("returns null for unknown single-segment path", () => {
    expect(parseAdminRoute("unknown")).toBeNull();
  });

  it("returns null for unknown multi-segment path", () => {
    expect(parseAdminRoute("foo/bar/baz/qux")).toBeNull();
  });

  it("returns null for collections with no slug", () => {
    expect(parseAdminRoute("collections")).toBeNull();
  });

  it("returns null for globals with no slug", () => {
    expect(parseAdminRoute("globals")).toBeNull();
  });

  it("returns null for collections with too many segments", () => {
    expect(parseAdminRoute("collections/posts/123/extra")).toBeNull();
  });

  it("handles paths with extra leading/trailing slashes", () => {
    expect(parseAdminRoute("/collections/posts/")).toEqual({
      kind: "collection-list",
      slug: "posts",
    });
  });

  it("handles paths with multiple consecutive slashes", () => {
    // Empty segments are filtered out
    expect(parseAdminRoute("collections///posts")).toEqual({
      kind: "collection-list",
      slug: "posts",
    });
  });

  it("trims whitespace from segments", () => {
    expect(parseAdminRoute(" login ")).toEqual({ kind: "login" });
  });
});
