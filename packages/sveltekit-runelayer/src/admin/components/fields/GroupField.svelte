<script lang="ts">
	import { FormGroup } from "carbon-components-svelte";
	import type { NamedField } from "../../../schema/fields.js";
	import FieldRenderer from "./FieldRenderer.svelte";

	let {
		name,
		path,
		label,
		fields,
		values = $bindable({}),
		errors = {},
	}: {
		name: string;
		path: string;
		label?: string;
		fields: NamedField[];
		values: Record<string, any>;
		errors?: Record<string, string[]>;
	} = $props();

	let groupValues = $state<Record<string, any>>({});
	let rootError = $derived(errors[path]?.[0] ?? "");

	// Initialize group values from parent
	$effect(() => {
		const parentGroup = values[name];
		if (parentGroup && typeof parentGroup === "object" && !Array.isArray(parentGroup)) {
			groupValues = parentGroup as Record<string, any>;
		} else {
			groupValues = {};
			values[name] = groupValues;
		}
	});

	// Sync child mutations back to parent by reassigning the key
	$effect(() => {
		// Read all keys to subscribe to deep changes
		const snapshot = { ...groupValues };
		values[name] = snapshot;
	});
</script>

<FormGroup legendText={label ?? name}>
	<div class="rk-group-fields">
		{#if rootError}
			<p class="rk-field-error">{rootError}</p>
		{/if}
		{#each fields as field}
			<FieldRenderer {field} bind:values={groupValues} {errors} pathPrefix={path} />
		{/each}
	</div>
</FormGroup>

<style>
	.rk-field-error {
		margin: 0;
		font-size: 0.75rem;
		color: var(--cds-support-error);
	}

	.rk-group-fields {
		display: grid;
		gap: var(--cds-spacing-05);
		padding-left: var(--cds-spacing-05);
		border-left: 2px solid var(--cds-border-subtle);
	}
</style>
