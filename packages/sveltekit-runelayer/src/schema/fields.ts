import type { FieldAccess, ValidationFn } from "./types.js";

// Base config shared by all fields
type BaseField<T extends string> = {
  type: T;
  required?: boolean;
  localized?: boolean;
  access?: FieldAccess;
  admin?: { condition?: (data: Record<string, unknown>) => boolean };
};

// Field type definitions
export type TextField = BaseField<"text"> & {
  defaultValue?: string;
  validate?: ValidationFn<string>;
  minLength?: number;
  maxLength?: number;
};

export type TextareaField = BaseField<"textarea"> & {
  defaultValue?: string;
  validate?: ValidationFn<string>;
  minLength?: number;
  maxLength?: number;
};

export type NumberField = BaseField<"number"> & {
  defaultValue?: number;
  validate?: ValidationFn<number>;
  min?: number;
  max?: number;
};

export type RichTextField = BaseField<"richText"> & {
  defaultValue?: Record<string, unknown>;
  validate?: ValidationFn<Record<string, unknown>>;
};

export type SelectField = BaseField<"select"> & {
  defaultValue?: string;
  validate?: ValidationFn<string>;
  options: { label: string; value: string }[];
};

export type MultiSelectField = BaseField<"multiSelect"> & {
  defaultValue?: string[];
  validate?: ValidationFn<string[]>;
  options: { label: string; value: string }[];
};

export type CheckboxField = BaseField<"checkbox"> & {
  defaultValue?: boolean;
  validate?: ValidationFn<boolean>;
};

export type DateField = BaseField<"date"> & {
  defaultValue?: string;
  validate?: ValidationFn<string>;
  includeTime?: boolean;
};

export type RelationshipField = BaseField<"relationship"> & {
  relationTo: string | string[];
  hasMany?: boolean;
  validate?: ValidationFn<string | string[]>;
};

export type UploadField = BaseField<"upload"> & {
  relationTo: string;
  validate?: ValidationFn<string>;
};

export type JsonField = BaseField<"json"> & {
  defaultValue?: unknown;
  validate?: ValidationFn<unknown>;
};

export type SlugField = BaseField<"slug"> & {
  from: string;
  validate?: ValidationFn<string>;
};

export type EmailField = BaseField<"email"> & {
  defaultValue?: string;
  validate?: ValidationFn<string>;
};

export type GroupField = BaseField<"group"> & {
  fields: NamedField[];
};

export type RowField = { type: "row"; fields: NamedField[] };
export type CollapsibleField = { type: "collapsible"; label: string; fields: NamedField[] };

export type RefSentinel<C extends string = string> = {
  _ref: string;
  _collection: C;
};

export interface BlockConfig {
  slug: string;
  label: string;
  fields: NamedField[];
}

export type BlocksField = BaseField<"blocks"> & {
  blocks: BlockConfig[];
  minBlocks?: number;
  maxBlocks?: number;
  validate?: ValidationFn<unknown[]>;
};

export function defineBlock<T extends BlockConfig>(config: T): T {
  return config;
}

export function blocks(opts: Omit<BlocksField, "type">): BlocksField {
  return { type: "blocks", ...opts };
}

export type Field =
  | TextField
  | TextareaField
  | NumberField
  | RichTextField
  | SelectField
  | MultiSelectField
  | CheckboxField
  | DateField
  | RelationshipField
  | UploadField
  | JsonField
  | SlugField
  | EmailField
  | GroupField
  | BlocksField
  | RowField
  | CollapsibleField;

export type NamedField = Field & { name: string; label?: string };

// Builder functions
type Opts<F extends Field> = Omit<F, "type">;

export const text = (opts: Opts<TextField> = {}): TextField => ({ type: "text", ...opts });
export const textarea = (opts: Opts<TextareaField> = {}): TextareaField => ({
  type: "textarea",
  ...opts,
});
export const number = (opts: Opts<NumberField> = {}): NumberField => ({ type: "number", ...opts });
export const richText = (opts: Opts<RichTextField> = {}): RichTextField => ({
  type: "richText",
  ...opts,
});
export const select = (opts: Opts<SelectField>): SelectField => ({ type: "select", ...opts });
export const multiSelect = (opts: Opts<MultiSelectField>): MultiSelectField => ({
  type: "multiSelect",
  ...opts,
});
export const checkbox = (opts: Opts<CheckboxField> = {}): CheckboxField => ({
  type: "checkbox",
  ...opts,
});
export const date = (opts: Opts<DateField> = {}): DateField => ({ type: "date", ...opts });
export const relationship = (opts: Opts<RelationshipField>): RelationshipField => ({
  type: "relationship",
  ...opts,
});
export const upload = (opts: Opts<UploadField>): UploadField => ({ type: "upload", ...opts });
export const json = (opts: Opts<JsonField> = {}): JsonField => ({ type: "json", ...opts });
export const slug = (opts: Opts<SlugField>): SlugField => ({ type: "slug", ...opts });
export const email = (opts: Opts<EmailField> = {}): EmailField => ({ type: "email", ...opts });
export const group = (opts: Opts<GroupField>): GroupField => ({ type: "group", ...opts });
export const row = (opts: Omit<RowField, "type">): RowField => ({ type: "row", ...opts });
export const collapsible = (opts: Omit<CollapsibleField, "type">): CollapsibleField => ({
  type: "collapsible",
  ...opts,
});

// Type inference utilities (depth-parameterized)

// Helper: infer the value type of a single field at a given depth
// Depth 0 = raw sentinels, Depth 1 = populated documents
type InferFieldValue<F extends Field, D extends 0 | 1> = F extends
  | TextField
  | TextareaField
  | EmailField
  | SlugField
  | UploadField
  ? string
  : F extends NumberField
    ? number
    : F extends CheckboxField
      ? boolean
      : F extends SelectField
        ? string
        : F extends MultiSelectField
          ? string[]
          : F extends DateField
            ? string
            : F extends RichTextField | JsonField
              ? unknown
              : F extends RelationshipField
                ? F["hasMany"] extends true
                  ? D extends 0
                    ? RefSentinel[]
                    : (Record<string, unknown> | null)[]
                  : D extends 0
                    ? RefSentinel
                    : Record<string, unknown> | null
                : F extends GroupField
                  ? InferFieldsData<F["fields"], D>
                  : F extends BlocksField
                    ? BlocksValue<F["blocks"], D>
                    : never;

// Infer an object from a named field array
export type InferFieldsData<Fields extends NamedField[], D extends 0 | 1 = 0> = {
  [F in Fields[number] as F["name"]]: InferFieldValue<F, D>;
};

// Infer a single block instance
export type InferBlockData<B extends BlockConfig, D extends 0 | 1 = 0> = {
  blockType: B["slug"];
  _key: string;
} & InferFieldsData<B["fields"], D>;

// Infer the full blocks field value (discriminated union array)
export type BlocksValue<Blocks extends BlockConfig[], D extends 0 | 1 = 0> = InferBlockData<
  Blocks[number],
  D
>[];
