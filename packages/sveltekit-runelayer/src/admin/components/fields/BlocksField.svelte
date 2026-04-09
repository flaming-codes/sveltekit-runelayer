<script lang="ts">
	import { Button, ClickableTile, Modal, Tile } from "carbon-components-svelte";
	import Add from "carbon-icons-svelte/lib/Add.svelte";
	import ChevronRight from "carbon-icons-svelte/lib/ChevronRight.svelte";
	import ChevronUp from "carbon-icons-svelte/lib/ChevronUp.svelte";
	import ChevronDown from "carbon-icons-svelte/lib/ChevronDown.svelte";
	import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
	import type { BlocksField, NamedField } from "../../../schema/fields.js";
	import FieldRenderer from "./FieldRenderer.svelte";

	let {
		field,
		path,
		values = $bindable({}),
		errors = {},
		disabled = false,
	}: {
		field: NamedField & BlocksField;
		path: string;
		values: Record<string, any>;
		errors: Record<string, string[]>;
		disabled: boolean;
	} = $props();

	$effect(() => {
		if (!Array.isArray(values[field.name])) {
			values[field.name] = [];
		}
	});

	let blocks = $derived<Record<string, any>[]>(values[field.name] ?? []);
	let rootError = $derived(errors[path]?.[0] ?? "");

	let canAdd = $derived(!field.maxBlocks || blocks.length < field.maxBlocks);
	let canRemove = $derived(!field.minBlocks || blocks.length > field.minBlocks);

	// Track which blocks are expanded. New blocks auto-expand.
	let openMap = $state<Record<string, boolean>>({});

	function addBlock(slug: string) {
		if (!canAdd) return;
		const blockConfig = field.blocks.find((b) => b.slug === slug);
		if (!blockConfig) return;

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
		openMap[newBlock._key] = true;
		addModalOpen = false;
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

	function toggleBlock(key: string) {
		openMap[key] = !openMap[key];
	}

	let addModalOpen = $state(false);
</script>

<div class="rk-blocks-field">
	<div class="rk-blocks-header">
		<span class="rk-blocks-label">{field.label ?? field.name}</span>
		<span class="rk-blocks-count">{blocks.length} {blocks.length === 1 ? "block" : "blocks"}</span>
	</div>

	{#if rootError}
		<p class="rk-field-error">{rootError}</p>
	{/if}

	{#if blocks.length > 0}
		<div class="rk-blocks-list">
			{#each blocks as block, index (block._key ?? index)}
				{@const key = block._key ?? String(index)}
				{@const isOpen = openMap[key] ?? false}
				<Tile class="rk-block-tile">
					<div class="rk-block-tile-header">
						<!-- Expand/collapse toggle (plain button to avoid nesting buttons inside Carbon Button) -->
						<button
							class="rk-block-toggle"
							type="button"
							aria-expanded={isOpen}
							onclick={() => toggleBlock(key)}
						>
							<span class="rk-block-chevron" class:rk-block-chevron--open={isOpen} aria-hidden="true">
								<ChevronRight />
							</span>
							<span class="rk-block-label">{getBlockLabel(block.blockType)}</span>
							<span class="rk-block-pos">#{index + 1}</span>
						</button>

						<!-- Reorder + delete actions -->
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

					{#if isOpen}
						{@const blockArr = values[field.name] as Record<string, any>[]}
						<div class="rk-block-fields">
							{#each getBlockFields(block.blockType) as subField}
								<FieldRenderer
									field={subField}
									bind:values={blockArr[index]}
									pathPrefix={`${path}[${index}]`}
									{errors}
									{disabled}
								/>
							{/each}
						</div>
					{/if}
				</Tile>
			{/each}
		</div>
	{/if}

	{#if canAdd}
		<div class="rk-blocks-add">
			<Button kind="tertiary" icon={Add} {disabled} on:click={() => (addModalOpen = true)}>
				Add block
			</Button>
		</div>
	{/if}
</div>

<!-- Block type picker -->
<Modal
	bind:open={addModalOpen}
	modalHeading="Add a block"
	passiveModal
	size="sm"
>
	<div class="rk-block-palette-grid">
		{#each field.blocks as blockConfig}
			<ClickableTile on:click={() => addBlock(blockConfig.slug)}>
				<p class="rk-palette-label">{blockConfig.label}</p>
				{#if blockConfig.label !== blockConfig.slug}
					<p class="rk-palette-slug">{blockConfig.slug}</p>
				{/if}
			</ClickableTile>
		{/each}
	</div>
</Modal>

<style>
	.rk-field-error {
		margin: 0;
		font-size: 0.75rem;
		color: var(--cds-support-error);
	}

	.rk-blocks-field {
		display: grid;
		gap: var(--cds-spacing-05);
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

	.rk-blocks-list {
		display: grid;
		gap: var(--cds-spacing-03);
	}

	/* Tile header row */
	.rk-block-tile-header {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}

	/* Expand/collapse toggle — plain <button> so Carbon action buttons beside it are not nested */
	.rk-block-toggle {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		text-align: left;
		color: inherit;
		font: inherit;
		min-width: 0;
	}

	.rk-block-toggle:focus-visible {
		outline: 2px solid var(--cds-focus);
		outline-offset: 2px;
	}

	.rk-block-chevron {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		color: var(--cds-text-secondary);
		transition: transform 0.15s ease;
	}

	.rk-block-chevron--open {
		transform: rotate(90deg);
	}

	.rk-block-label {
		font-size: 0.875rem;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rk-block-pos {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		font-family: var(--cds-code-01-font-family, monospace);
		flex-shrink: 0;
	}

	/* Action buttons cluster */
	.rk-block-actions {
		display: flex;
		gap: var(--cds-spacing-01);
		flex-shrink: 0;
	}

	/* Expanded fields area */
	.rk-block-fields {
		display: grid;
		gap: var(--cds-spacing-05);
		margin-top: var(--cds-spacing-05);
		padding-top: var(--cds-spacing-04);
		border-top: 1px solid var(--cds-border-subtle);
	}

	/* Add block button */
	.rk-blocks-add {
		display: flex;
	}

	/* Block picker modal grid */
	.rk-block-palette-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--cds-spacing-04);
		padding: var(--cds-spacing-02) 0 var(--cds-spacing-05);
	}

	.rk-palette-label {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.rk-palette-slug {
		margin: var(--cds-spacing-02) 0 0;
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		font-family: var(--cds-code-01-font-family, monospace);
	}
</style>
