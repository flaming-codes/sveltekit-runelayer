<script lang="ts">
	import type { NamedField } from '../../../schema/fields.js';
	import TextField from './TextField.svelte';
	import NumberField from './NumberField.svelte';
	import CheckboxField from './CheckboxField.svelte';
	import SelectField from './SelectField.svelte';
	import TextareaField from './TextareaField.svelte';
	import DateField from './DateField.svelte';
	import RichTextField from './RichTextField.svelte';
	import JsonField from './JsonField.svelte';
	import RelationshipField from './RelationshipField.svelte';

	let { field, values = $bindable({}) }: {
		field: NamedField; values: Record<string, any>;
	} = $props();

	let label = $derived(field.label ?? field.name);
	let req = $derived(field.required ?? false);
</script>

{#if field.type === 'text' || field.type === 'email' || field.type === 'slug'}
	<TextField name={field.name} {label} bind:value={values[field.name]} required={req} />
{:else if field.type === 'number'}
	<NumberField name={field.name} {label} bind:value={values[field.name]} required={req} />
{:else if field.type === 'checkbox'}
	<CheckboxField name={field.name} {label} bind:value={values[field.name]} />
{:else if field.type === 'select'}
	<SelectField name={field.name} {label} bind:value={values[field.name]} options={field.options} required={req} />
{:else if field.type === 'textarea'}
	<TextareaField name={field.name} {label} bind:value={values[field.name]} required={req} />
{:else if field.type === 'date'}
	<DateField name={field.name} {label} bind:value={values[field.name]} required={req} includeTime={field.includeTime} />
{:else if field.type === 'richText'}
	<RichTextField name={field.name} {label} bind:value={values[field.name]} required={req} />
{:else if field.type === 'json'}
	<JsonField name={field.name} {label} bind:value={values[field.name]} required={req} />
{:else if field.type === 'relationship'}
	<RelationshipField name={field.name} {label} bind:value={values[field.name]} relationTo={field.relationTo} required={req} />
{:else}
	<p><em>Unsupported field type: {field.type}</em></p>
{/if}
