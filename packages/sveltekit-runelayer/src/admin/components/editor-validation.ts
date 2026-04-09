import type { NamedField } from "../../schema/fields.js";
import {
  firstValidationIssueMessage,
  stripReservedWriteFields,
  type WriteOperation,
  validateWritePayload,
} from "../../schema/validation.js";

export type EditorValidationMode = "strict" | "draft";

export function snapshotEditorValues(values: Record<string, unknown>): Record<string, unknown> {
  const snapshot = structuredClone(values ?? {}) as Record<string, unknown>;
  return stripReservedWriteFields(snapshot);
}

export function mergeFieldErrors(
  ...sources: Array<Record<string, string[]>>
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};

  for (const source of sources) {
    for (const [path, messages] of Object.entries(source)) {
      const current = merged[path] ?? [];
      for (const message of messages) {
        if (!current.includes(message)) {
          current.push(message);
        }
      }
      if (current.length > 0) {
        merged[path] = current;
      }
    }
  }

  return merged;
}

export function validateEditorValues(
  fields: NamedField[],
  payload: Record<string, unknown>,
  operation: WriteOperation,
  mode: EditorValidationMode,
) {
  const result = validateWritePayload(fields, operation, payload, {
    relaxRequired: mode === "draft",
  });

  return {
    ...result,
    error: firstValidationIssueMessage(result.issues, ""),
  };
}
