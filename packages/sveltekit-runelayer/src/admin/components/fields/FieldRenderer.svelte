<script lang="ts">
	import { MultiSelect, TextInput } from "carbon-components-svelte";
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
	import FieldRenderer from "./FieldRenderer.svelte";

	let {
		field,
		fields = [],
		values = $bindable({}),
		errors = {},
		disabled = false,
		pathPrefix = "",
	}: {
		field: NamedField;
		fields?: NamedField[];
		values: Record<string, any>;
		errors?: Record<string, string[]>;
		disabled?: boolean;
		pathPrefix?: string;
	} = $props();

	let label = $derived(field.label ?? field.name);
	let req = $derived("required" in field ? field.required ?? false : false);
	let fieldPath = $derived(pathPrefix ? `${pathPrefix}.${field.name}` : field.name);
	let fieldError = $derived(errors[fieldPath]?.[0] ?? "");

	let conditionMet = $derived(
		"admin" in field && field.admin?.condition
			? field.admin.condition(values)
			: true,
	);

	let collapsibleOpen = $state(true);
</script>

<div class="rk-field-shell" class:rk-field-shell--invalid={conditionMet && fieldError.length > 0}>
	{#if !conditionMet}
		<!-- Field hidden by admin condition -->
	{:else if field.type === "slug"}
		{@const slugField = field as NamedField & SlugFieldType}
		{@const fromField = fields.find((f) => f.name === slugField.from)}
		<SlugField
			name={field.name}
			{label}
			bind:value={values[field.name]}
			required={req}
			sourceValue={slugField.from ? (values[slugField.from] as string) ?? "" : ""}
			fromLabel={fromField?.label ?? fromField?.name ?? slugField.from}
			invalid={!!fieldError}
			invalidText={fieldError}
		/>
	{:else if field.type === "text"}
		<TextField name={field.name} {label} bind:value={values[field.name]} required={req} type="text" invalid={!!fieldError} invalidText={fieldError} />
	{:else if field.type === "email"}
		<TextField name={field.name} {label} bind:value={values[field.name]} required={req} type="email" invalid={!!fieldError} invalidText={fieldError} />
	{:else if field.type === "number"}
		<NumberField name={field.name} {label} bind:value={values[field.name]} required={req} invalid={!!fieldError} invalidText={fieldError} />
	{:else if field.type === "checkbox"}
		<CheckboxField name={field.name} {label} bind:value={values[field.name]} />
	{:else if field.type === "select"}
		<SelectField
			name={field.name}
			{label}
			bind:value={values[field.name]}
			options={field.options}
			required={req}
			invalid={!!fieldError}
			invalidText={fieldError}
		/>
	{:else if field.type === "multiSelect"}
		<MultiSelect
			{label}
			items={field.options.map((o) => ({ id: o.value, text: o.label }))}
			selectedIds={values[field.name] ?? []}
			invalid={!!fieldError}
			invalidText={fieldError}
			on:select={(e) => {
				values[field.name] = e.detail.selectedIds;
			}}
		/>
	{:else if field.type === "textarea"}
		<TextareaField name={field.name} {label} bind:value={values[field.name]} required={req} invalid={!!fieldError} invalidText={fieldError} />
	{:else if field.type === "date"}
		<DateField
			name={field.name}
			{label}
			bind:value={values[field.name]}
			required={req}
			includeTime={field.includeTime}
			invalid={!!fieldError}
			invalidText={fieldError}
		/>
	{:else if field.type === "richText"}
		<JsonField name={field.name} {label} bind:value={values[field.name]} required={req} helperText="Rich text JSON (Tiptap integration placeholder)" invalid={!!fieldError} invalidText={fieldError} />
	{:else if field.type === "json"}
		<JsonField name={field.name} {label} bind:value={values[field.name]} required={req} invalid={!!fieldError} invalidText={fieldError} />
	{:else if field.type === "relationship"}
		<RelationshipField
			name={field.name}
			{label}
			bind:value={values[field.name]}
			relationTo={field.relationTo}
			hasMany={field.hasMany}
			required={req}
			invalid={!!fieldError}
			invalidText={fieldError}
		/>
	{:else if field.type === "upload"}
		<TextInput
			id={field.name}
			name={field.name}
			labelText={label}
			placeholder="File URL or path"
			bind:value={values[field.name]}
			invalid={!!fieldError}
			invalidText={fieldError}
		/>
	{:else if field.type === "blocks"}
		<BlocksField
			{field}
			path={fieldPath}
			bind:values
			{errors}
			{disabled}
		/>
	{:else if field.type === "group"}
		<GroupField
			name={field.name}
			path={fieldPath}
			{label}
			fields={field.fields}
			bind:values
			{errors}
		/>
	{:else if field.type === "row"}
		<div class="rk-row-field">
			{#each field.fields as subField}
				<FieldRenderer field={subField} {fields} bind:values {errors} {disabled} {pathPrefix} />
			{/each}
		</div>
	{:else if field.type === "collapsible"}
		<div class="rk-collapsible-field">
			<button
				class="rk-collapsible-toggle"
				type="button"
				aria-expanded={collapsibleOpen}
				onclick={() => (collapsibleOpen = !collapsibleOpen)}
			>
				<span class="rk-collapsible-label">{field.label}</span>
				<span class="rk-collapsible-indicator" aria-hidden="true">{collapsibleOpen ? "\u25B2" : "\u25BC"}</span>
			</button>
			{#if collapsibleOpen}
				<div class="rk-collapsible-content">
					{#each field.fields as subField}
						<FieldRenderer field={subField} {fields} bind:values {errors} {disabled} {pathPrefix} />
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<p class="rk-field-unsupported">Unsupported field type.</p>
	{/if}

	{#if conditionMet && fieldError && ["checkbox"].includes(field.type)}
		<p class="rk-field-error">{fieldError}</p>
	{/if}
</div>

<style>
	.rk-field-shell {
		display: grid;
		gap: var(--cds-spacing-03);
	}

	.rk-field-error {
		margin: 0;
		font-size: 0.75rem;
		color: var(--cds-support-error);
	}

	.rk-row-field {
		display: flex;
		gap: var(--cds-spacing-05);
		align-items: flex-start;
	}

	.rk-row-field > :global(*) {
		flex: 1;
		min-width: 0;
	}

	.rk-collapsible-field {
		display: grid;
		gap: var(--cds-spacing-04);
	}

	.rk-collapsible-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--cds-spacing-03) 0;
		border-bottom: 1px solid var(--cds-border-subtle);
		color: inherit;
		font: inherit;
	}

	.rk-collapsible-toggle:focus-visible {
		outline: 2px solid var(--cds-focus);
		outline-offset: 2px;
	}

	.rk-collapsible-label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.rk-collapsible-indicator {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}

	.rk-collapsible-content {
		display: grid;
		gap: var(--cds-spacing-05);
		padding-left: var(--cds-spacing-05);
		border-left: 2px solid var(--cds-border-subtle);
	}
</style>
