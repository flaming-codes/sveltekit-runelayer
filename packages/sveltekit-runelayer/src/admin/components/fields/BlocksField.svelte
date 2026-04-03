<script lang="ts">
	import { Button, Tile } from "carbon-components-svelte";
	import ChevronUp from "carbon-icons-svelte/lib/ChevronUp.svelte";
	import ChevronDown from "carbon-icons-svelte/lib/ChevronDown.svelte";
	import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
	import type { BlocksField, NamedField } from "../../../schema/fields.js";
	import FieldRenderer from "./FieldRenderer.svelte";
	import BlockPalette from "./BlockPalette.svelte";

	let {
		field,
		values = $bindable({}),
		errors = {},
		disabled = false,
	}: {
		field: NamedField & BlocksField;
		values: Record<string, any>;
		errors: Record<string, string[]>;
		disabled: boolean;
	} = $props();

	// Ensure blocks array is initialized
	if (!Array.isArray(values[field.name])) {
		values[field.name] = [];
	}

	let blocks = $derived<Record<string, any>[]>(values[field.name] ?? []);

	let canAdd = $derived(!field.maxBlocks || blocks.length < field.maxBlocks);
	let canRemove = $derived(!field.minBlocks || blocks.length > field.minBlocks);

	function addBlock(slug: string) {
		if (!canAdd) return;
		const blockConfig = field.blocks.find((b) => b.slug === slug);
		if (!blockConfig) return;

		// Build defaults object from sub-fields
		const defaults: Record<string, any> = {};
		for (const subField of blockConfig.fields) {
			const sf = subField as NamedField & { defaultValue?: unknown };
			if ("defaultValue" in sf && sf.defaultValue !== undefined) {
				defaults[sf.name] = sf.defaultValue;
			}
		}

		const newBlock: Record<string, any> = {
			blockType: slug,
			_key: crypto.randomUUID(),
			...defaults,
		};

		values[field.name] = [...blocks, newBlock];
	}

	function removeBlock(index: number) {
		if (!canRemove) return;
		values[field.name] = blocks.filter((_: any, i: number) => i !== index);
	}

	function moveBlock(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= blocks.length) return;
		const copy = [...blocks];
		[copy[index], copy[target]] = [copy[target], copy[index]];
		values[field.name] = copy;
	}

	function getBlockLabel(blockType: string): string {
		return field.blocks.find((b) => b.slug === blockType)?.label ?? blockType;
	}

	function getBlockFields(blockType: string): NamedField[] {
		return (field.blocks.find((b) => b.slug === blockType)?.fields ?? []) as NamedField[];
	}
</script>

<div class="rk-blocks-field">
	<div class="rk-blocks-header">
		<span class="rk-blocks-label">{field.label ?? field.name}</span>
		<span class="rk-blocks-count">{blocks.length} {blocks.length === 1 ? "block" : "blocks"}</span>
	</div>

	{#each blocks as block, index (block._key ?? index)}
		<Tile class="rk-block-tile">
			<div class="rk-block-tile-header">
				<span class="rk-block-type-label">{getBlockLabel(block.blockType)}</span>
				<div class="rk-block-actions">
					<Button
						kind="ghost"
						size="small"
						icon={ChevronUp}
						iconDescription="Move up"
						disabled={disabled || index === 0}
						on:click={() => moveBlock(index, -1)}
					/>
					<Button
						kind="ghost"
						size="small"
						icon={ChevronDown}
						iconDescription="Move down"
						disabled={disabled || index === blocks.length - 1}
						on:click={() => moveBlock(index, 1)}
					/>
					<Button
						kind="danger-ghost"
						size="small"
						icon={TrashCan}
						iconDescription="Remove block"
						disabled={disabled || !canRemove}
						on:click={() => removeBlock(index)}
					/>
				</div>
			</div>
			<div class="rk-block-fields">
				{#each getBlockFields(block.blockType) as subField}
					<FieldRenderer
						field={subField}
						bind:values={(values[field.name] as Record<string, any>[])[index]}
						{errors}
						{disabled}
					/>
				{/each}
			</div>
		</Tile>
	{/each}

	{#if canAdd}
		<div class="rk-blocks-add">
			<BlockPalette name={field.name} blocks={field.blocks} onSelect={addBlock} />
		</div>
	{/if}
</div>

<style>
	.rk-blocks-field {
		display: grid;
		gap: var(--cds-spacing-04);
	}

	.rk-blocks-header {
		display: flex;
		align-items: baseline;
		gap: var(--cds-spacing-03);
	}

	.rk-blocks-label {
		font-size: 0.875rem;
		font-weight: 600;
	}

	.rk-blocks-count {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}

	.rk-block-tile-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--cds-spacing-04);
		padding-bottom: var(--cds-spacing-03);
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.rk-block-type-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.32px;
		color: var(--cds-text-secondary);
	}

	.rk-block-actions {
		display: flex;
		gap: var(--cds-spacing-01);
	}

	.rk-block-fields {
		display: grid;
		gap: var(--cds-spacing-05);
	}

	.rk-blocks-add {
		display: flex;
	}
</style>
