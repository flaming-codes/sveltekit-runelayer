<script lang="ts">
	import { Button, Tile } from "carbon-components-svelte";
	import Add from "carbon-icons-svelte/lib/Add.svelte";
	import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
	import ChevronUp from "carbon-icons-svelte/lib/ChevronUp.svelte";
	import ChevronDown from "carbon-icons-svelte/lib/ChevronDown.svelte";
	import type { NamedField } from "../../../schema/fields.js";
	import FieldRenderer from "./FieldRenderer.svelte";

	let {
		name,
		label,
		fields,
		values = $bindable({}),
		minRows,
		maxRows,
	}: {
		name: string;
		label?: string;
		fields: NamedField[];
		values: Record<string, any>;
		minRows?: number;
		maxRows?: number;
	} = $props();

	// Ensure array rows exist
	if (!Array.isArray(values[name])) {
		values[name] = [];
	}

	let rows = $derived<Record<string, any>[]>(values[name] ?? []);

	function addRow() {
		if (maxRows && rows.length >= maxRows) return;
		values[name] = [...rows, {}];
	}

	function removeRow(index: number) {
		if (minRows && rows.length <= minRows) return;
		values[name] = rows.filter((_: any, i: number) => i !== index);
	}

	function moveRow(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= rows.length) return;
		const copy = [...rows];
		[copy[index], copy[target]] = [copy[target], copy[index]];
		values[name] = copy;
	}

	let canAdd = $derived(!maxRows || rows.length < maxRows);
	let canRemove = $derived(!minRows || rows.length > minRows);
</script>

<div class="rk-array-field">
	<div class="rk-array-header">
		<span class="rk-array-label">{label ?? name}</span>
		<span class="rk-array-count">{rows.length} {rows.length === 1 ? "item" : "items"}</span>
	</div>

	{#each rows as row, index}
		<Tile class="rk-array-row">
			<div class="rk-array-row-header">
				<span class="rk-array-row-label">{label ?? name} #{index + 1}</span>
				<div class="rk-array-row-actions">
					<Button
						kind="ghost"
						size="small"
						icon={ChevronUp}
						iconDescription="Move up"
						disabled={index === 0}
						on:click={() => moveRow(index, -1)}
					/>
					<Button
						kind="ghost"
						size="small"
						icon={ChevronDown}
						iconDescription="Move down"
						disabled={index === rows.length - 1}
						on:click={() => moveRow(index, 1)}
					/>
					<Button
						kind="danger-ghost"
						size="small"
						icon={TrashCan}
						iconDescription="Remove"
						disabled={!canRemove}
						on:click={() => removeRow(index)}
					/>
				</div>
			</div>
			<div class="rk-array-row-fields">
				{#each fields as field}
					<FieldRenderer {field} bind:values={rows[index]} />
				{/each}
			</div>
		</Tile>
	{/each}

	<Button kind="tertiary" size="small" icon={Add} disabled={!canAdd} on:click={addRow}>
		Add {label ?? name}
	</Button>
</div>

<style>
	.rk-array-field {
		display: grid;
		gap: var(--cds-spacing-04);
	}

	.rk-array-header {
		display: flex;
		align-items: baseline;
		gap: var(--cds-spacing-03);
	}

	.rk-array-label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.rk-array-count {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}

	.rk-array-row-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--cds-spacing-04);
		padding-bottom: var(--cds-spacing-03);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.rk-array-row-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.32px;
		color: var(--cds-text-secondary);
	}

	.rk-array-row-actions {
		display: flex;
		gap: var(--cds-spacing-01);
	}

	.rk-array-row-fields {
		display: grid;
		gap: var(--cds-spacing-05);
	}
</style>
