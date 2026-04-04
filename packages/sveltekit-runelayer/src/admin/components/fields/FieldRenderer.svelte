<script lang="ts">
	import type { NamedField } from "../../../schema/fields.js";
	import type { SlugField as SlugFieldType } from "../../../schema/fields.js";
	import TextField from "./TextField.svelte";
	import SlugField from "./SlugField.svelte";
	import NumberField from "./NumberField.svelte";
	import CheckboxField from "./CheckboxField.svelte";
	import SelectField from "./SelectField.svelte";
	import TextareaField from "./TextareaField.svelte";
	import DateField from "./DateField.svelte";
	import JsonField from "./JsonField.svelte";
	import RelationshipField from "./RelationshipField.svelte";
	import BlocksField from "./BlocksField.svelte";
	import GroupField from "./GroupField.svelte";

	let {
		field,
		fields = [],
		values = $bindable({}),
		errors = {},
		disabled = false,
	}: {
		field: NamedField;
		fields?: NamedField[];
		values: Record<string, any>;
		errors?: Record<string, string[]>;
		disabled?: boolean;
	} = $props();

	let label = $derived(field.label ?? field.name);
	let req = $derived("required" in field ? field.required ?? false : false);
</script>

{#if field.type === "slug"}
	{@const slugField = field as NamedField & SlugFieldType}
	{@const fromField = fields.find((f) => f.name === slugField.from)}
	<SlugField
		name={field.name}
		{label}
		bind:value={values[field.name]}
		required={req}
		sourceValue={slugField.from ? (values[slugField.from] as string) ?? "" : ""}
		fromLabel={fromField?.label ?? fromField?.name ?? slugField.from}
	/>
{:else if field.type === "text"}
	<TextField name={field.name} {label} bind:value={values[field.name]} required={req} type="text" />
{:else if field.type === "email"}
	<TextField name={field.name} {label} bind:value={values[field.name]} required={req} type="email" />
{:else if field.type === "number"}
	<NumberField name={field.name} {label} bind:value={values[field.name]} required={req} />
{:else if field.type === "checkbox"}
	<CheckboxField name={field.name} {label} bind:value={values[field.name]} />
{:else if field.type === "select"}
	<SelectField
		name={field.name}
		{label}
		bind:value={values[field.name]}
		options={field.options}
		required={req}
	/>
{:else if field.type === "textarea"}
	<TextareaField name={field.name} {label} bind:value={values[field.name]} required={req} />
{:else if field.type === "date"}
	<DateField
		name={field.name}
		{label}
		bind:value={values[field.name]}
		required={req}
		includeTime={field.includeTime}
	/>
{:else if field.type === "richText"}
	<JsonField name={field.name} {label} bind:value={values[field.name]} required={req} helperText="Rich text JSON (Tiptap integration placeholder)" />
{:else if field.type === "json"}
	<JsonField name={field.name} {label} bind:value={values[field.name]} required={req} />
{:else if field.type === "relationship"}
	<RelationshipField
		name={field.name}
		{label}
		bind:value={values[field.name]}
		relationTo={field.relationTo}
		hasMany={field.hasMany}
		required={req}
	/>
{:else if field.type === "blocks"}
	<BlocksField
		{field}
		bind:values
		{errors}
		{disabled}
	/>
{:else if field.type === "group"}
	<GroupField
		name={field.name}
		{label}
		fields={field.fields}
		bind:values
	/>
{:else}
	<p class="rk-field-unsupported">Unsupported field type: {field.type}</p>
{/if}
