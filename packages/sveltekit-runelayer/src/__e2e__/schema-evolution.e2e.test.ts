/**
 * E2E Journey: Schema Evolution & Migration
 *
 * Simulates a real-world scenario where a CMS schema evolves over time:
 * - Start with a simple schema
 * - Add data
 * - Evolve the schema (add fields, add collections)
 * - Verify migration adds columns without losing data
 * - Verify new fields work alongside existing data
 * - Test multiple evolution cycles
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  defineCollection,
  text,
  number,
  checkbox,
  select,
  textarea,
  email,
  date,
  json,
  type CollectionConfig,
} from "../schema/index.js";
import { createDatabase, pushSchema } from "../db/index.js";
import { insertOne, findMany, updateOne } from "../db/operations.js";

describe("Schema Evolution & Migration — Full Journey", () => {
  let tmpDir: string;
  let dbPath: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "runekit-evolution-e2e-"));
    dbPath = join(tmpDir, "evolving.db");
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // --- Phase 1: Initial simple schema ---

  it("creates initial schema with basic fields", () => {
    const ProductsV1: CollectionConfig = defineCollection({
      slug: "products",
      fields: [
        { name: "name", ...text({ required: true }) },
        { name: "price", ...number() },
      ],
    });

    const rdb = createDatabase({ filename: dbPath, collections: [ProductsV1] });
    pushSchema(rdb);

    // Insert some initial data
    insertOne(rdb.db, rdb.tables.products, { name: "Widget A", price: 9.99 });
    insertOne(rdb.db, rdb.tables.products, { name: "Gadget B", price: 24.99 });
    insertOne(rdb.db, rdb.tables.products, { name: "Doohickey C", price: 4.5 });

    const products = findMany(rdb.db, rdb.tables.products);
    expect(products).toHaveLength(3);
    expect(products[0].name).toBeDefined();
    expect(products[0].price).toBeDefined();

    rdb.sqlite.close();
  });

  // --- Phase 2: Add new fields to existing collection ---

  it("adds description, category, and inStock fields", () => {
    const ProductsV2: CollectionConfig = defineCollection({
      slug: "products",
      fields: [
        { name: "name", ...text({ required: true }) },
        { name: "price", ...number() },
        // NEW FIELDS:
        { name: "description", ...textarea() },
        {
          name: "category",
          ...select({
            options: [
              { label: "Electronics", value: "electronics" },
              { label: "Home", value: "home" },
              { label: "Toys", value: "toys" },
            ],
          }),
        },
        { name: "inStock", ...checkbox() },
      ],
    });

    const rdb = createDatabase({ filename: dbPath, collections: [ProductsV2] });
    pushSchema(rdb);

    // Existing data should still be there
    const products = findMany(rdb.db, rdb.tables.products);
    expect(products).toHaveLength(3);

    // Existing fields should be intact
    const widget = products.find((p: any) => p.name === "Widget A") as any;
    expect(widget).toBeDefined();
    expect(widget.name).toBe("Widget A");
    expect(widget.price).toBe(9.99);

    // New fields should be null/undefined for existing rows
    expect(widget.description).toBeNull();
    expect(widget.category).toBeNull();

    // Can update existing documents with new fields
    const updated = updateOne(rdb.db, rdb.tables.products, widget.id, {
      description: "A fantastic widget for all purposes.",
      category: "electronics",
      inStock: true,
    });
    expect(updated.description).toBe("A fantastic widget for all purposes.");
    expect(updated.category).toBe("electronics");

    // Can create new documents with all fields
    const newProduct = insertOne(rdb.db, rdb.tables.products, {
      name: "Thingamajig D",
      price: 15.0,
      description: "The latest in thingamajig technology.",
      category: "toys",
      inStock: true,
    });
    expect(newProduct.name).toBe("Thingamajig D");
    expect(newProduct.category).toBe("toys");

    expect(findMany(rdb.db, rdb.tables.products)).toHaveLength(4);

    rdb.sqlite.close();
  });

  // --- Phase 3: Add another new collection alongside existing ones ---

  it("adds a reviews collection while preserving products", () => {
    const ProductsV2: CollectionConfig = defineCollection({
      slug: "products",
      fields: [
        { name: "name", ...text({ required: true }) },
        { name: "price", ...number() },
        { name: "description", ...textarea() },
        {
          name: "category",
          ...select({
            options: [
              { label: "Electronics", value: "electronics" },
              { label: "Home", value: "home" },
              { label: "Toys", value: "toys" },
            ],
          }),
        },
        { name: "inStock", ...checkbox() },
      ],
    });

    const Reviews: CollectionConfig = defineCollection({
      slug: "reviews",
      fields: [
        { name: "product", ...text({ required: true }) },
        { name: "reviewer", ...text({ required: true }) },
        { name: "reviewerEmail", ...email() },
        { name: "rating", ...number({ min: 1, max: 5 }) },
        { name: "comment", ...textarea() },
        { name: "reviewDate", ...date() },
        { name: "verified", ...checkbox() },
      ],
      timestamps: true,
    });

    const rdb = createDatabase({ filename: dbPath, collections: [ProductsV2, Reviews] });
    pushSchema(rdb);

    // Products still intact
    const products = findMany(rdb.db, rdb.tables.products);
    expect(products).toHaveLength(4);

    // New collection works
    insertOne(rdb.db, rdb.tables.reviews, {
      product: "Widget A",
      reviewer: "John Doe",
      reviewerEmail: "john@example.com",
      rating: 5,
      comment: "Best widget ever!",
      reviewDate: "2026-03-15",
      verified: true,
    });
    insertOne(rdb.db, rdb.tables.reviews, {
      product: "Gadget B",
      reviewer: "Jane Smith",
      rating: 3,
      comment: "Decent gadget, could be better.",
      verified: false,
    });

    const reviews = findMany(rdb.db, rdb.tables.reviews);
    expect(reviews).toHaveLength(2);
    expect((reviews[0] as any).reviewer).toBeDefined();

    rdb.sqlite.close();
  });

  // --- Phase 4: Add even more fields (third evolution) ---

  it("adds metadata and tags to products in a third evolution", () => {
    const ProductsV3: CollectionConfig = defineCollection({
      slug: "products",
      fields: [
        { name: "name", ...text({ required: true }) },
        { name: "price", ...number() },
        { name: "description", ...textarea() },
        {
          name: "category",
          ...select({
            options: [
              { label: "Electronics", value: "electronics" },
              { label: "Home", value: "home" },
              { label: "Toys", value: "toys" },
            ],
          }),
        },
        { name: "inStock", ...checkbox() },
        // V3 additions:
        { name: "sku", ...text() },
        { name: "weight", ...number() },
        { name: "metadata", ...json() },
      ],
    });

    const Reviews: CollectionConfig = defineCollection({
      slug: "reviews",
      fields: [
        { name: "product", ...text({ required: true }) },
        { name: "reviewer", ...text({ required: true }) },
        { name: "reviewerEmail", ...email() },
        { name: "rating", ...number({ min: 1, max: 5 }) },
        { name: "comment", ...textarea() },
        { name: "reviewDate", ...date() },
        { name: "verified", ...checkbox() },
      ],
      timestamps: true,
    });

    const rdb = createDatabase({ filename: dbPath, collections: [ProductsV3, Reviews] });
    pushSchema(rdb);

    // All previous data preserved
    const products = findMany(rdb.db, rdb.tables.products);
    expect(products).toHaveLength(4);

    const reviews = findMany(rdb.db, rdb.tables.reviews);
    expect(reviews).toHaveLength(2);

    // New fields work on existing products
    const first = products[0] as any;
    const updated = updateOne(rdb.db, rdb.tables.products, first.id, {
      sku: "WGT-001",
      weight: 0.5,
      metadata: JSON.stringify({ tags: ["widget", "popular"], manufacturer: "Acme" }),
    });
    expect(updated.sku).toBe("WGT-001");
    expect(updated.weight).toBe(0.5);

    rdb.sqlite.close();
  });

  // --- Phase 5: Verify full data integrity after all migrations ---

  it("all data is intact after three schema evolutions", () => {
    const ProductsV3: CollectionConfig = defineCollection({
      slug: "products",
      fields: [
        { name: "name", ...text({ required: true }) },
        { name: "price", ...number() },
        { name: "description", ...textarea() },
        {
          name: "category",
          ...select({
            options: [
              { label: "Electronics", value: "electronics" },
              { label: "Home", value: "home" },
              { label: "Toys", value: "toys" },
            ],
          }),
        },
        { name: "inStock", ...checkbox() },
        { name: "sku", ...text() },
        { name: "weight", ...number() },
        { name: "metadata", ...json() },
      ],
    });

    const Reviews: CollectionConfig = defineCollection({
      slug: "reviews",
      fields: [
        { name: "product", ...text({ required: true }) },
        { name: "reviewer", ...text({ required: true }) },
        { name: "reviewerEmail", ...email() },
        { name: "rating", ...number({ min: 1, max: 5 }) },
        { name: "comment", ...textarea() },
        { name: "reviewDate", ...date() },
        { name: "verified", ...checkbox() },
      ],
      timestamps: true,
    });

    const rdb = createDatabase({ filename: dbPath, collections: [ProductsV3, Reviews] });
    pushSchema(rdb);

    const products = findMany(rdb.db, rdb.tables.products);
    expect(products).toHaveLength(4);

    // Check the original product still has all its original data
    const widget = products.find((p: any) => p.name === "Widget A") as any;
    expect(widget).toBeDefined();
    expect(widget.price).toBe(9.99);
    // Fields added in V2 should have been updated
    expect(widget.description).toBe("A fantastic widget for all purposes.");
    // Fields added in V3 should have been updated
    expect(widget.sku).toBe("WGT-001");

    const reviews = findMany(rdb.db, rdb.tables.reviews);
    expect(reviews).toHaveLength(2);

    rdb.sqlite.close();
  });
});
