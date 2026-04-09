<script lang="ts">
	import { Button, ClickableTile, Modal, Tile } from "carbon-components-svelte";
	import Add from "carbon-icons-svelte/lib/Add.svelte";
	import ChevronRight from "carbon-icons-svelte/lib/ChevronRight.svelte";
	import ChevronUp from "carbon-icons-svelte/lib/ChevronUp.svelte";
	import ChevronDown from "carbon-icons-svelte/lib/ChevronDown.svelte";
	import Draggable from "carbon-icons-svelte/lib/Draggable.svelte";
	import TrashCan from "carbon-icons-svelte/lib/TrashCan.svelte";
	import { flip } from "svelte/animate";
	import { dragHandleZone, dragHandle } from "svelte-dnd-action";
	import type { DndEvent } from "svelte-dnd-action";
	import type { BlocksField, NamedField } from "../../../schema/fields.js";
	import FieldRenderer from "./FieldRenderer.svelte";

	const FLIP_DURATION_MS = 200;

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

	// svelte-dnd-action requires each item to have an `id` property.
	// Our blocks use `_key` as the stable identifier, so we map to/from `id`.
	type DndBlock = Record<string, any> & { id: string };

	let blocks = $derived<Record<string, any>[]>(values[field.name] ?? []);
	let dndItems = $derived<DndBlock[]>(
		blocks.map((b) => ({ ...b, id: b._key ?? crypto.randomUUID() })),
	);
	let rootError = $derived(errors[path]?.[0] ?? "");

	let canAdd = $derived(!field.maxBlocks || blocks.length < field.maxBlocks);
	let canRemove = $derived(!field.minBlocks || blocks.length > field.minBlocks);

	// Track which blocks are expanded. New blocks auto-expand.
	let openMap = $state<Record<string, boolean>>({});

	function syncFromDnd(items: DndBlock[]) {
		values[field.name] = items.map(({ id, ...rest }) => ({ ...rest, _key: id }));
	}

	function handleConsider(e: CustomEvent<DndEvent<DndBlock>>) {
		syncFromDnd(e.detail.items);
	}

	function handleFinalize(e: CustomEvent<DndEvent<DndBlock>>) {
		syncFromDnd(e.detail.items);
	}

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

	{#if dndItems.length > 0}
		<div
			class="rk-blocks-list"
			use:dragHandleZone={{
				items: dndItems,
				flipDurationMs: FLIP_DURATION_MS,
				dragDisabled: disabled,
				dropTargetClasses: ["rk-blocks-list--drop-target"],
				type: `blocks-${path}`,
			}}
			onconsider={handleConsider}
			onfinalize={handleFinalize}
		>
			{#each dndItems as block, index (block.id)}
				{@const key = block.id}
				{@const isOpen = openMap[key] ?? false}
				<div class="rk-block-item" animate:flip={{ duration: FLIP_DURATION_MS }}>
					<Tile class="rk-block-tile">
						<div class="rk-block-tile-header">
							<!-- Drag handle -->
							<div class="rk-block-drag-handle" use:dragHandle aria-label="Drag to reorder">
								<Draggable />
							</div>

							<!-- Expand/collapse toggle -->
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
				</div>
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

	/* Drop target highlight when dragging over */
	.rk-blocks-list :global(.rk-blocks-list--drop-target) {
		outline: 2px dashed var(--cds-focus);
		outline-offset: 2px;
		border-radius: 4px;
	}

	/* Block item wrapper for animation */
	.rk-block-item {
		/* The library injects a shadow placeholder with reduced opacity */
	}

	/* Dragged element styling — the library clones the element and applies this ID */
	:global(#dnd-action-dragged-el) {
		outline: 2px solid var(--cds-focus, #0f62fe);
		border-radius: 4px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
		opacity: 0.92;
	}

	/* Shadow placeholder (the slot left behind) */
	:global([data-is-dnd-shadow-item-hint]) {
		opacity: 0.35;
		border: 2px dashed var(--cds-border-subtle, #e0e0e0);
		border-radius: 4px;
	}

	/* Tile header row */
	.rk-block-tile-header {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}

	/* Drag handle */
	.rk-block-drag-handle {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 1.5rem;
		height: 1.5rem;
		cursor: grab;
		color: var(--cds-text-secondary);
		border-radius: 2px;
		transition: color 0.15s ease, background-color 0.15s ease;
	}

	.rk-block-drag-handle:hover {
		color: var(--cds-text-primary);
		background-color: var(--cds-layer-hover);
	}

	.rk-block-drag-handle:active {
		cursor: grabbing;
		color: var(--cds-text-primary);
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
