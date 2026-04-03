<script lang="ts">
	import { OverflowMenu, OverflowMenuItem } from "carbon-components-svelte";
	import type { BlockConfig } from "../../../schema/fields.js";

	let {
		name = "block",
		blocks,
		onSelect,
	}: {
		name?: string;
		blocks: BlockConfig[];
		onSelect: (slug: string) => void;
	} = $props();
</script>

<div class="rk-block-palette">
	<OverflowMenu
		id="{name}-block-palette"
		iconDescription="Add block"
		flipped
	>
		{#each blocks as block}
			<OverflowMenuItem
				text={block.label}
				on:click={() => onSelect(block.slug)}
			/>
		{/each}
	</OverflowMenu>
</div>

<style>
	.rk-block-palette {
		display: flex;
		align-items: center;
	}
</style>
