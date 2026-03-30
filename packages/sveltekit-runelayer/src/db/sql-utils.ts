/**
 * Shared SQL identifier quoting utilities.
 *
 * Used by both `admin-queries.ts` and `globals.ts` to safely interpolate
 * table/column names into raw SQL strings.
 */

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

/**
 * Throws if `name` does not match a safe SQL identifier pattern.
 */
export function assertSafeIdentifier(name: string): void {
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }
}

/**
 * Double-quote a SQL identifier after validating it is safe.
 */
export function quoteIdent(name: string): string {
  assertSafeIdentifier(name);
  return `"${name.replaceAll(`"`, `""`)}"`;
}
