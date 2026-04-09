import { describe, expect, it } from "vitest";
import {
  blocks,
  checkbox,
  defineBlock,
  email,
  group,
  json,
  multiSelect,
  number,
  relationship,
  select,
  slug,
  text,
} from "../fields.js";
import {
  WriteValidationError,
  isWriteValidationError,
  stripReservedWriteFields,
  validateWritePayload,
} from "../validation.js";

const HeroBlock = defineBlock({
  slug: "hero",
  label: "Hero",
  fields: [{ name: "heading", ...text({ required: true }) }],
});

describe("validateWritePayload", () => {
  it("returns public paths for nested group and block errors", () => {
    const result = validateWritePayload(
      [
        {
          name: "seo",
          ...group({
            fields: [{ name: "metaTitle", ...text({ required: true }) }],
          }),
        },
        {
          name: "layout",
          ...blocks({
            blocks: [HeroBlock],
            minBlocks: 1,
          }),
        },
      ],
      "create",
      {
        seo: {},
        layout: [{ blockType: "hero" }],
      },
    );

    expect(result.fieldErrors).toEqual({
      "seo.metaTitle": ['Field "seo.metaTitle" is required'],
      "layout[0].heading": ['Field "layout[0].heading" is required'],
    });
  });

  it("captures thrown custom validator exceptions as validation issues", () => {
    const result = validateWritePayload(
      [
        {
          name: "title",
          ...text({
            validate: () => {
              throw new Error("Validator exploded");
            },
          }),
        },
      ],
      "create",
      { title: "Hello" },
    );

    expect(result.issues).toEqual([
      {
        path: "title",
        code: "custom",
        message: "Validator exploded",
      },
    ]);
    expect(() => {
      throw new WriteValidationError(result.issues);
    }).toThrow("Validator exploded");
  });

  // ─── 1. Text field constraints ──────────────────────────────────────

  describe("text field constraints", () => {
    const fields = [{ name: "title", ...text({ minLength: 3, maxLength: 10 }) }];

    it("fails when value is shorter than minLength", () => {
      const result = validateWritePayload(fields, "create", { title: "Hi" });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("min_length");
      expect(result.issues[0].path).toBe("title");
    });

    it("fails when value exceeds maxLength", () => {
      const result = validateWritePayload(fields, "create", {
        title: "This is way too long",
      });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("max_length");
      expect(result.issues[0].path).toBe("title");
    });

    it("passes when value is within bounds", () => {
      const result = validateWritePayload(fields, "create", {
        title: "Hello",
      });
      expect(result.issues).toHaveLength(0);
      expect(result.output.title).toBe("Hello");
    });
  });

  // ─── 2. Email field ─────────────────────────────────────────────────

  describe("email field", () => {
    const fields = [{ name: "addr", ...email() }];

    it("passes for a valid email address", () => {
      const result = validateWritePayload(fields, "create", {
        addr: "user@example.com",
      });
      expect(result.issues).toHaveLength(0);
    });

    it("fails with 'invalid' code for a malformed email", () => {
      const result = validateWritePayload(fields, "create", {
        addr: "not-an-email",
      });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("invalid");
      expect(result.issues[0].path).toBe("addr");
    });
  });

  // ─── 3. Number field ───────────────────────────────────────────────

  describe("number field", () => {
    const fields = [{ name: "count", ...number({ min: 1, max: 100 }) }];

    it("fails when value is below min", () => {
      const result = validateWritePayload(fields, "create", { count: 0 });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("min");
    });

    it("fails when value exceeds max", () => {
      const result = validateWritePayload(fields, "create", { count: 200 });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("max");
    });

    it("coerces a numeric string to a number", () => {
      const result = validateWritePayload(fields, "create", { count: "42" });
      expect(result.issues).toHaveLength(0);
      expect(result.output.count).toBe(42);
    });

    it("rejects NaN input", () => {
      const result = validateWritePayload(fields, "create", {
        count: "not-a-number",
      });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("invalid_type");
    });
  });

  // ─── 4. Checkbox field ─────────────────────────────────────────────

  describe("checkbox field", () => {
    const fields = [{ name: "agree", ...checkbox() }];

    it("passes boolean values through unchanged", () => {
      const t = validateWritePayload(fields, "create", { agree: true });
      expect(t.output.agree).toBe(true);
      const f = validateWritePayload(fields, "create", { agree: false });
      expect(f.output.agree).toBe(false);
    });

    it("coerces 'true' string to true", () => {
      const result = validateWritePayload(fields, "create", {
        agree: "true",
      });
      expect(result.output.agree).toBe(true);
    });

    it("coerces 'false' string to false", () => {
      const result = validateWritePayload(fields, "create", {
        agree: "false",
      });
      expect(result.output.agree).toBe(false);
    });

    it("coerces '1' string to true", () => {
      const result = validateWritePayload(fields, "create", { agree: "1" });
      expect(result.output.agree).toBe(true);
    });

    it("coerces empty string to true (HTML checkbox quirk)", () => {
      const result = validateWritePayload(fields, "create", { agree: "" });
      expect(result.output.agree).toBe(true);
    });

    it("rejects non-boolean, non-coercible input", () => {
      const result = validateWritePayload(fields, "create", {
        agree: [1, 2],
      });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("invalid_type");
    });
  });

  // ─── 5. Select field ───────────────────────────────────────────────

  describe("select field", () => {
    const fields = [
      {
        name: "color",
        ...select({
          options: [
            { label: "Red", value: "red" },
            { label: "Blue", value: "blue" },
          ],
        }),
      },
    ];

    it("passes when value is a valid option", () => {
      const result = validateWritePayload(fields, "create", { color: "red" });
      expect(result.issues).toHaveLength(0);
    });

    it("fails when value is not a valid option", () => {
      const result = validateWritePayload(fields, "create", {
        color: "green",
      });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("invalid");
    });
  });

  // ─── 6. MultiSelect field ─────────────────────────────────────────

  describe("multiSelect field", () => {
    const fields = [
      {
        name: "tags",
        ...multiSelect({
          options: [
            { label: "A", value: "a" },
            { label: "B", value: "b" },
          ],
        }),
      },
    ];

    it("passes when all options are valid", () => {
      const result = validateWritePayload(fields, "create", {
        tags: ["a", "b"],
      });
      expect(result.issues).toHaveLength(0);
    });

    it("fails when an invalid option is present", () => {
      const result = validateWritePayload(fields, "create", {
        tags: ["a", "c"],
      });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("invalid");
    });

    it("coerces a JSON array string to an array", () => {
      const result = validateWritePayload(fields, "create", {
        tags: '["a","b"]',
      });
      expect(result.issues).toHaveLength(0);
      expect(result.output.tags).toEqual(["a", "b"]);
    });
  });

  // ─── 7. JSON field ─────────────────────────────────────────────────

  describe("json field", () => {
    const fields = [{ name: "meta", ...json() }];

    it("parses a valid JSON string", () => {
      const result = validateWritePayload(fields, "create", {
        meta: '{"key":"value"}',
      });
      expect(result.issues).toHaveLength(0);
      expect(result.output.meta).toEqual({ key: "value" });
    });

    it("rejects an invalid JSON string", () => {
      const result = validateWritePayload(fields, "create", {
        meta: "{not json",
      });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("invalid_type");
    });

    it("passes an object through unchanged", () => {
      const obj = { nested: true };
      const result = validateWritePayload(fields, "create", { meta: obj });
      expect(result.issues).toHaveLength(0);
      expect(result.output.meta).toEqual({ nested: true });
    });
  });

  // ─── 8. Relationship field ─────────────────────────────────────────

  describe("relationship field", () => {
    it("normalizes a string ID to a sentinel object", () => {
      const fields = [{ name: "author", ...relationship({ relationTo: "users" }) }];
      const result = validateWritePayload(fields, "create", {
        author: "user-123",
      });
      expect(result.issues).toHaveLength(0);
      expect(result.output.author).toEqual({
        _ref: "user-123",
        _collection: "users",
      });
    });

    it("passes a sentinel object through unchanged", () => {
      const fields = [{ name: "author", ...relationship({ relationTo: "users" }) }];
      const sentinel = { _ref: "user-123", _collection: "users" };
      const result = validateWritePayload(fields, "create", {
        author: sentinel,
      });
      expect(result.issues).toHaveLength(0);
      expect(result.output.author).toEqual(sentinel);
    });

    it("requires a sentinel for polymorphic relationships", () => {
      const fields = [
        {
          name: "ref",
          ...relationship({ relationTo: ["posts", "pages"] }),
        },
      ];
      const result = validateWritePayload(fields, "create", {
        ref: "some-id",
      });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("invalid_type");
    });

    it("rejects a sentinel with an invalid _collection for polymorphic", () => {
      const fields = [
        {
          name: "ref",
          ...relationship({ relationTo: ["posts", "pages"] }),
        },
      ];
      const result = validateWritePayload(fields, "create", {
        ref: { _ref: "abc", _collection: "unknown" },
      });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("invalid_type");
    });
  });

  // ─── 9. Required fields ────────────────────────────────────────────

  describe("required fields", () => {
    const fields = [{ name: "title", ...text({ required: true }) }];

    it("fails when a required field is missing on create", () => {
      const result = validateWritePayload(fields, "create", {});
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("required");
      expect(result.issues[0].path).toBe("title");
    });

    it("passes when a required field is present", () => {
      const result = validateWritePayload(fields, "create", {
        title: "Hello",
      });
      expect(result.issues).toHaveLength(0);
    });
  });

  // ─── 10. relaxRequired on create ──────────────────────────────────

  describe("relaxRequired on create", () => {
    const fields = [{ name: "title", ...text({ required: true }) }];

    it("does NOT fail when relaxRequired is true", () => {
      const result = validateWritePayload(
        fields,
        "create",
        {},
        {
          relaxRequired: true,
        },
      );
      expect(result.issues).toHaveLength(0);
    });
  });

  // ─── 11. Update operation ──────────────────────────────────────────

  describe("update operation", () => {
    const fields = [
      { name: "title", ...text({ required: true }) },
      { name: "body", ...text({ minLength: 5 }) },
    ];

    it("does not flag absent fields as required", () => {
      const result = validateWritePayload(fields, "update", { body: "Hello world" });
      expect(result.issues).toHaveLength(0);
    });

    it("still validates present fields", () => {
      const result = validateWritePayload(fields, "update", { body: "Hi" });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("min_length");
    });
  });

  // ─── 12. Reserved fields ──────────────────────────────────────────

  describe("reserved fields", () => {
    const fields = [{ name: "title", ...text() }];

    it("produces 'reserved' issues for reserved keys in payload", () => {
      const result = validateWritePayload(fields, "create", {
        title: "Hello",
        id: "forced-id",
        createdAt: "2024-01-01",
        _status: "published",
      });
      const reservedIssues = result.issues.filter((i) => i.code === "reserved");
      expect(reservedIssues).toHaveLength(3);
      const paths = reservedIssues.map((i) => i.path).sort();
      expect(paths).toEqual(["_status", "createdAt", "id"]);
    });
  });

  // ─── 13. stripReservedWriteFields ─────────────────────────────────

  describe("stripReservedWriteFields", () => {
    it("removes reserved keys and leaves others", () => {
      const input = {
        id: "x",
        createdAt: "d",
        updatedAt: "d",
        _status: "s",
        _version: 1,
        title: "Hello",
        body: "World",
      };
      const result = stripReservedWriteFields(input);
      expect(result).toEqual({ title: "Hello", body: "World" });
      // Ensure the original is not mutated.
      expect(input.id).toBe("x");
    });
  });

  // ─── 14. Slug auto-generation ─────────────────────────────────────

  describe("slug auto-generation", () => {
    const fields = [
      { name: "title", ...text() },
      { name: "urlSlug", ...slug({ from: "title" }) },
    ];

    it("auto-derives slug from the source field on create when slug is empty", () => {
      const result = validateWritePayload(fields, "create", {
        title: "Hello World!",
      });
      expect(result.issues).toHaveLength(0);
      expect(result.output.urlSlug).toBe("hello-world");
    });

    it("uses explicit slug value when provided", () => {
      const result = validateWritePayload(fields, "create", {
        title: "Hello World!",
        urlSlug: "custom-slug",
      });
      expect(result.issues).toHaveLength(0);
      expect(result.output.urlSlug).toBe("custom-slug");
    });
  });

  // ─── 15. Blocks field ─────────────────────────────────────────────

  describe("blocks field", () => {
    const TextBlock = defineBlock({
      slug: "text-block",
      label: "Text Block",
      fields: [{ name: "body", ...text({ required: true }) }],
    });

    const blocksFields = [
      {
        name: "content",
        ...blocks({
          blocks: [HeroBlock, TextBlock],
          minBlocks: 1,
          maxBlocks: 3,
        }),
      },
    ];

    it("fails when block count is below minBlocks", () => {
      const result = validateWritePayload(blocksFields, "create", {
        content: [],
      });
      const minIssues = result.issues.filter((i) => i.code === "min");
      expect(minIssues).toHaveLength(1);
    });

    it("fails when block count exceeds maxBlocks", () => {
      const result = validateWritePayload(blocksFields, "create", {
        content: [
          { blockType: "hero", heading: "A" },
          { blockType: "hero", heading: "B" },
          { blockType: "hero", heading: "C" },
          { blockType: "hero", heading: "D" },
        ],
      });
      const maxIssues = result.issues.filter((i) => i.code === "max");
      expect(maxIssues).toHaveLength(1);
    });

    it("rejects unknown blockType", () => {
      const result = validateWritePayload(blocksFields, "create", {
        content: [{ blockType: "unknown", data: "x" }],
      });
      const invalidIssues = result.issues.filter(
        (i) => i.code === "invalid" && i.path.includes("blockType"),
      );
      expect(invalidIssues).toHaveLength(1);
    });

    it("rejects blocks missing blockType", () => {
      const result = validateWritePayload(blocksFields, "create", {
        content: [{ heading: "oops" }],
      });
      const requiredIssues = result.issues.filter(
        (i) => i.code === "required" && i.path.includes("blockType"),
      );
      expect(requiredIssues).toHaveLength(1);
    });

    it("passes valid blocks and validates nested fields", () => {
      const result = validateWritePayload(blocksFields, "create", {
        content: [
          { blockType: "hero", heading: "Welcome" },
          { blockType: "text-block", body: "Some content" },
        ],
      });
      expect(result.issues).toHaveLength(0);
    });

    it("reports nested field validation errors within blocks", () => {
      const result = validateWritePayload(blocksFields, "create", {
        content: [{ blockType: "text-block" }],
      });
      const bodyIssues = result.issues.filter(
        (i) => i.code === "required" && i.path.includes("body"),
      );
      expect(bodyIssues).toHaveLength(1);
    });
  });

  // ─── 16. WriteValidationError ─────────────────────────────────────

  describe("WriteValidationError", () => {
    it("constructs with correct message and fieldErrors", () => {
      const issues = [
        { path: "title", code: "required" as const, message: "Title is required" },
        { path: "title", code: "min_length" as const, message: "Too short" },
        { path: "body", code: "required" as const, message: "Body is required" },
      ];
      const err = new WriteValidationError(issues);

      expect(err.message).toBe("Title is required");
      expect(err.status).toBe(400);
      expect(err.name).toBe("WriteValidationError");
      expect(err.issues).toBe(issues);
      expect(err.fieldErrors).toEqual({
        title: ["Title is required", "Too short"],
        body: ["Body is required"],
      });
    });
  });

  // ─── 17. isWriteValidationError ───────────────────────────────────

  describe("isWriteValidationError", () => {
    it("matches WriteValidationError instances", () => {
      const err = new WriteValidationError([{ path: "x", code: "required", message: "required" }]);
      expect(isWriteValidationError(err)).toBe(true);
    });

    it("matches duck-typed objects with name: 'WriteValidationError'", () => {
      const fake = {
        name: "WriteValidationError",
        issues: [{ path: "x", code: "required", message: "required" }],
        status: 400,
      };
      expect(isWriteValidationError(fake)).toBe(true);
    });

    it("does NOT match plain objects without the correct name", () => {
      const notAnError = { status: 400, issues: [] };
      expect(isWriteValidationError(notAnError)).toBe(false);
    });

    it("does NOT match null or primitives", () => {
      expect(isWriteValidationError(null)).toBe(false);
      expect(isWriteValidationError("error")).toBe(false);
      expect(isWriteValidationError(42)).toBe(false);
    });
  });
});
