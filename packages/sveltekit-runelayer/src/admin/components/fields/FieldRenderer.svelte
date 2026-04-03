<script lang="ts">
	import type { NamedField } from "../../../schema/fields.js";
	import TextField from "./TextField.svelte";
	import NumberField from "./NumberField.svelte";
	import CheckboxField from "./CheckboxField.svelte";
	import SelectField from "./SelectField.svelte";
	import TextareaField from "./TextareaField.svelte";
	import DateField from "./DateField.svelte";
	import JsonField from "./JsonField.svelte";
	import RelationshipField from "./RelationshipField.svelte";
	import ArrayField from "./ArrayField.svelte";
	import GroupField from "./GroupField.svelte";

	let { field, values = $bindable({}) }: {
		field: NamedField;
		values: Record<string, any>;
	} = $props();

	let label = $derived(field.label ?? field.name);
	let req = $derived("required" in field ? field.required ?? false : false);
</script>

{#if field.type === "text" || field.type === "slug"}
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
		required={req}
	/>
{:else if field.type === "array"}
	<ArrayField
		name={field.name}
		{label}
		fields={field.fields}
		bind:values
		minRows={field.minRows}
		maxRows={field.maxRows}
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
