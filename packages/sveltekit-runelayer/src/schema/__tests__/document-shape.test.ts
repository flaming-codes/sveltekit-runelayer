import { describe, it, expect } from "vitest";
import {
  FieldStorageCollisionError,
  DocumentShapeError,
  flattenDocumentFields,
  inflateDocumentFields,
  getValueAtPath,
  setValueAtPath,
  deleteValueAtPath,
  getFieldLayout,
} from "../document-shape.js";
import { text, group, row, collapsible, blocks, defineBlock } from "../fields.js";
import type { NamedField } from "../fields.js";

// --- Helpers ---

function namedField(name: string, field: ReturnType<typeof text>): NamedField {
  return { name, ...field } as NamedField;
}

// --- FieldStorageCollisionError ---

describe("FieldStorageCollisionError", () => {
  it("throws when a group child collides with a flat field sharing the same storage key", () => {
    // group "seo" with child "title" produces storage key "seo_title"
    // flat field "seo_title" also produces storage key "seo_title"
    const fields: NamedField[] = [
      {
        name: "seo",
        ...group({
          fields: [namedField("title", text())],
        }),
      } as NamedField,
      namedField("seo_title", text()),
    ];

    expect(() => getFieldLayout(fields)).toThrow(FieldStorageCollisionError);
  });

  it("throws when two flat fields have the same name", () => {
    const fields: NamedField[] = [namedField("title", text()), namedField("title", text())];

    expect(() => getFieldLayout(fields)).toThrow(FieldStorageCollisionError);
  });

  it("does not throw when group children have distinct storage keys", () => {
    const fields: NamedField[] = [
      {
        name: "seo",
        ...group({
          fields: [namedField("title", text()), namedField("description", text())],
        }),
      } as NamedField,
      namedField("author", text()),
    ];

    expect(() => getFieldLayout(fields)).not.toThrow();
  });
});

// --- flattenDocumentFields ---

describe("flattenDocumentFields", () => {
  it("flattens a nested group into prefixed storage keys", () => {
    const fields: NamedField[] = [
      {
        name: "seo",
        ...group({
          fields: [namedField("title", text()), namedField("description", text())],
        }),
      } as NamedField,
    ];

    const result = flattenDocumentFields(fields, {
      seo: { title: "hi", description: "world" },
    });

    expect(result).toEqual({ seo_title: "hi", seo_description: "world" });
  });

  it("handles deeply nested groups", () => {
    const fields: NamedField[] = [
      {
        name: "meta",
        ...group({
          fields: [
            {
              name: "seo",
              ...group({
                fields: [namedField("title", text())],
              }),
            } as NamedField,
          ],
        }),
      } as NamedField,
    ];

    const result = flattenDocumentFields(fields, {
      meta: { seo: { title: "deep" } },
    });

    expect(result).toEqual({ meta_seo_title: "deep" });
  });

  it("passes through flat fields unchanged", () => {
    const fields: NamedField[] = [namedField("title", text()), namedField("body", text())];

    const result = flattenDocumentFields(fields, { title: "Hello", body: "World" });
    expect(result).toEqual({ title: "Hello", body: "World" });
  });

  it("treats row fields as transparent wrappers (no prefix)", () => {
    const fields: NamedField[] = [
      {
        ...row({ fields: [namedField("first", text()), namedField("last", text())] }),
      } as NamedField,
    ];

    const result = flattenDocumentFields(fields, { first: "Ada", last: "Lovelace" });
    expect(result).toEqual({ first: "Ada", last: "Lovelace" });
  });

  it("treats collapsible fields as transparent wrappers (no prefix)", () => {
    const fields: NamedField[] = [
      {
        ...collapsible({ label: "Advanced", fields: [namedField("hidden", text())] }),
      } as NamedField,
    ];

    const result = flattenDocumentFields(fields, { hidden: "secret" });
    expect(result).toEqual({ hidden: "secret" });
  });

  it("nullifies all group children when group value is null", () => {
    const fields: NamedField[] = [
      {
        name: "seo",
        ...group({
          fields: [namedField("title", text()), namedField("description", text())],
        }),
      } as NamedField,
    ];

    const result = flattenDocumentFields(fields, { seo: null });
    expect(result).toEqual({ seo_title: null, seo_description: null });
  });

  it("throws DocumentShapeError for unknown fields", () => {
    const fields: NamedField[] = [namedField("title", text())];

    expect(() => flattenDocumentFields(fields, { title: "ok", unknown: "bad" })).toThrow(
      DocumentShapeError,
    );
  });

  it("throws DocumentShapeError when group value is not an object", () => {
    const fields: NamedField[] = [
      {
        name: "seo",
        ...group({ fields: [namedField("title", text())] }),
      } as NamedField,
    ];

    expect(() => flattenDocumentFields(fields, { seo: "not-an-object" })).toThrow(
      DocumentShapeError,
    );
  });
});

// --- inflateDocumentFields ---

describe("inflateDocumentFields", () => {
  it("inflates flat storage keys into nested group structure", () => {
    const fields: NamedField[] = [
      {
        name: "seo",
        ...group({
          fields: [namedField("title", text()), namedField("description", text())],
        }),
      } as NamedField,
    ];

    const result = inflateDocumentFields(fields, { seo_title: "hi", seo_description: "world" });
    expect(result).toEqual({ seo: { title: "hi", description: "world" } });
  });

  it("handles deeply nested groups", () => {
    const fields: NamedField[] = [
      {
        name: "meta",
        ...group({
          fields: [
            {
              name: "seo",
              ...group({
                fields: [namedField("title", text())],
              }),
            } as NamedField,
          ],
        }),
      } as NamedField,
    ];

    const result = inflateDocumentFields(fields, { meta_seo_title: "deep" });
    expect(result).toEqual({ meta: { seo: { title: "deep" } } });
  });

  it("passes through flat fields unchanged", () => {
    const fields: NamedField[] = [namedField("title", text())];

    const result = inflateDocumentFields(fields, { title: "Hello" });
    expect(result).toEqual({ title: "Hello" });
  });

  it("preserves unknown keys (like id, createdAt) in the output", () => {
    const fields: NamedField[] = [namedField("title", text())];

    const result = inflateDocumentFields(fields, { title: "Hello", id: "abc", createdAt: "now" });
    expect(result).toEqual({ title: "Hello", id: "abc", createdAt: "now" });
  });

  it("round-trips flatten then inflate", () => {
    const fields: NamedField[] = [
      {
        name: "seo",
        ...group({
          fields: [namedField("title", text()), namedField("description", text())],
        }),
      } as NamedField,
      namedField("body", text()),
    ];

    const original = { seo: { title: "Hello", description: "World" }, body: "Content" };
    const flat = flattenDocumentFields(fields, original);
    const inflated = inflateDocumentFields(fields, flat);
    expect(inflated).toEqual(original);
  });
});

// --- getValueAtPath ---

describe("getValueAtPath", () => {
  it("retrieves a deeply nested value", () => {
    expect(getValueAtPath({ a: { b: "c" } }, ["a", "b"])).toBe("c");
  });

  it("retrieves a top-level value", () => {
    expect(getValueAtPath({ x: 42 }, ["x"])).toBe(42);
  });

  it("returns undefined for a missing path", () => {
    expect(getValueAtPath({ a: { b: "c" } }, ["a", "z"])).toBeUndefined();
  });

  it("returns undefined when source is undefined", () => {
    expect(getValueAtPath(undefined, ["a"])).toBeUndefined();
  });

  it("returns undefined when an intermediate segment is not an object", () => {
    expect(getValueAtPath({ a: "string" }, ["a", "b"])).toBeUndefined();
  });

  it("returns the whole nested object for a partial path", () => {
    const source = { a: { b: { c: "d" } } };
    expect(getValueAtPath(source, ["a", "b"])).toEqual({ c: "d" });
  });
});

// --- setValueAtPath ---

describe("setValueAtPath", () => {
  it("creates nested structure from path segments", () => {
    const target: Record<string, unknown> = {};
    setValueAtPath(target, ["a", "b", "c"], "hello");
    expect(target).toEqual({ a: { b: { c: "hello" } } });
  });

  it("sets a top-level value", () => {
    const target: Record<string, unknown> = {};
    setValueAtPath(target, ["x"], 42);
    expect(target).toEqual({ x: 42 });
  });

  it("overwrites existing values", () => {
    const target: Record<string, unknown> = { a: { b: "old" } };
    setValueAtPath(target, ["a", "b"], "new");
    expect(target).toEqual({ a: { b: "new" } });
  });

  it("creates missing intermediate objects without destroying siblings", () => {
    const target: Record<string, unknown> = { a: { existing: true } };
    setValueAtPath(target, ["a", "b", "c"], "value");
    expect(target).toEqual({ a: { existing: true, b: { c: "value" } } });
  });
});

// --- deleteValueAtPath ---

describe("deleteValueAtPath", () => {
  it("deletes a leaf value", () => {
    const target: Record<string, unknown> = { a: { b: "c" } };
    deleteValueAtPath(target, ["a", "b"]);
    expect(target).toEqual({});
  });

  it("prunes empty parent objects up to the root", () => {
    const target: Record<string, unknown> = { a: { b: { c: "d" } } };
    deleteValueAtPath(target, ["a", "b", "c"]);
    expect(target).toEqual({});
  });

  it("does not prune parents that still have other children", () => {
    const target: Record<string, unknown> = { a: { b: "keep", c: "remove" } };
    deleteValueAtPath(target, ["a", "c"]);
    expect(target).toEqual({ a: { b: "keep" } });
  });

  it("is a no-op when the path does not exist", () => {
    const target: Record<string, unknown> = { a: { b: "c" } };
    deleteValueAtPath(target, ["x", "y"]);
    expect(target).toEqual({ a: { b: "c" } });
  });

  it("deletes a top-level key", () => {
    const target: Record<string, unknown> = { a: "value", b: "other" };
    deleteValueAtPath(target, ["a"]);
    expect(target).toEqual({ b: "other" });
  });
});

// --- getFieldLayout ---

describe("getFieldLayout", () => {
  it("returns leaf rules for flat fields", () => {
    const fields: NamedField[] = [namedField("title", text()), namedField("body", text())];
    const layout = getFieldLayout(fields);

    expect(layout.leafRules).toHaveLength(2);
    expect(layout.byDocumentPath.get("title")?.storageKey).toBe("title");
    expect(layout.byStorageKey.get("body")?.documentPath).toBe("body");
  });

  it("prefixes storage keys for group children", () => {
    const fields: NamedField[] = [
      {
        name: "seo",
        ...group({
          fields: [namedField("title", text()), namedField("keywords", text())],
        }),
      } as NamedField,
    ];

    const layout = getFieldLayout(fields);
    expect(layout.byDocumentPath.get("seo.title")?.storageKey).toBe("seo_title");
    expect(layout.byDocumentPath.get("seo.keywords")?.storageKey).toBe("seo_keywords");
  });

  it("does not add prefix for row or collapsible fields", () => {
    const fields: NamedField[] = [
      {
        ...row({ fields: [namedField("first", text())] }),
      } as NamedField,
      {
        ...collapsible({ label: "Extra", fields: [namedField("extra", text())] }),
      } as NamedField,
    ];

    const layout = getFieldLayout(fields);
    expect(layout.byDocumentPath.get("first")?.storageKey).toBe("first");
    expect(layout.byDocumentPath.get("extra")?.storageKey).toBe("extra");
  });

  it("tracks blocks fields in separate maps", () => {
    const fields: NamedField[] = [
      {
        name: "content",
        ...blocks({
          blocks: [
            defineBlock({
              slug: "text",
              label: "Text",
              fields: [namedField("body", text())],
            }),
          ],
        }),
      } as NamedField,
    ];

    const layout = getFieldLayout(fields);
    expect(layout.blocksRules).toHaveLength(1);
    expect(layout.blocksByDocumentPath.get("content")?.storageKey).toBe("content");
    expect(layout.leafRules).toHaveLength(0);
  });

  it("caches the result for the same fields reference", () => {
    const fields: NamedField[] = [namedField("title", text())];
    const layout1 = getFieldLayout(fields);
    const layout2 = getFieldLayout(fields);
    expect(layout1).toBe(layout2);
  });

  it("tracks access chains through nested groups", () => {
    const innerAccess = { read: () => true };
    const fields: NamedField[] = [
      {
        name: "meta",
        ...group({
          fields: [namedField("title", text())],
        }),
        access: innerAccess,
      } as NamedField,
    ];

    const layout = getFieldLayout(fields);
    const rule = layout.byDocumentPath.get("meta.title");
    expect(rule?.accessChain).toHaveLength(1);
    expect(rule?.accessChain[0]).toBe(innerAccess);
  });
});
