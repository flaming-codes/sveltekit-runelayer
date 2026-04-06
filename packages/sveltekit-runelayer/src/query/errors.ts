/**
 * Creates an Error with an attached HTTP status code.
 * Shared across the query module to avoid duplicating the same pattern.
 */
export function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}
