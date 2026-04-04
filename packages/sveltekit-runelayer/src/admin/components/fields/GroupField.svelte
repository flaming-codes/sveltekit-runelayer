<script lang="ts">
	import { FormGroup } from "carbon-components-svelte";
	import type { NamedField } from "../../../schema/fields.js";
	import FieldRenderer from "./FieldRenderer.svelte";

	let {
		name,
		label,
		fields,
		values = $bindable({}),
	}: {
		name: string;
		label?: string;
		fields: NamedField[];
		values: Record<string, any>;
	} = $props();

	$effect(() => {
		if (!values[name] || typeof values[name] !== "object" || Array.isArray(values[name])) {
			values[name] = {};
		}
	});
</script>

<FormGroup legendText={label ?? name}>
	<div class="rk-group-fields">
		{#each fields as field}
			<FieldRenderer {field} bind:values={values[name]} />
		{/each}
	</div>
</FormGroup>

<style>
	.rk-group-fields {
		display: grid;
		gap: var(--cds-spacing-05);
		padding-left: var(--cds-spacing-05);
		border-left: 2px solid var(--cds-border-subtle);
	}
</style>
