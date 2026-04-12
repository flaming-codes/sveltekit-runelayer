<script lang="ts">
	import {
		Button,
		DataTable,
		Tag,
	} from "carbon-components-svelte";
	import type { VersionEntry } from "../../sveltekit/types.js";

	let {
		versions,
		currentVersion,
		onRestore,
	}: {
		versions: VersionEntry[];
		currentVersion: number;
		onRestore: (versionId: string) => void;
	} = $props();

	let showCount = $state(10);
	let visibleVersions = $derived(versions.slice(0, showCount));
	let hasMore = $derived(versions.length > showCount);

	let headers: any = [
		{ key: "version", value: "Version" },
		{ key: "status", value: "Status" },
		{ key: "author", value: "Author" },
		{ key: "date", value: "Date" },
		{ key: "actions", value: "" },
	];

	let rows = $derived(
		visibleVersions.map((v) => ({
			id: v.id,
			version: v._version,
			status: v._status,
			author: v._createdBy ?? "—",
			date: new Date(v.createdAt).toLocaleString(),
			isCurrent: v._version === currentVersion,
		})),
	);
</script>

<div class="rk-version-history">
	<DataTable {headers} {rows} size="short">
		<svelte:fragment slot="cell" let:row let:cell>
			{#if cell.key === "version"}
				<span class="rk-version-num">v{cell.value}</span>
			{:else if cell.key === "status"}
				<Tag size="sm" type={cell.value === "published" ? "green" : "teal"}>
					{cell.value}
				</Tag>
			{:else if cell.key === "actions"}
				{#if row.isCurrent}
					<Tag size="sm" type="outline">Current</Tag>
				{:else}
					<Button kind="ghost" size="small" on:click={() => onRestore(row.id)}>
						Restore
					</Button>
				{/if}
			{:else}
				{cell.value}
			{/if}
		</svelte:fragment>
	</DataTable>
	{#if hasMore}
		<div class="rk-show-more">
			<Button
				kind="ghost"
				size="small"
				on:click={() => {
					showCount += 20;
				}}
			>
				Show more ({versions.length - showCount} remaining)
			</Button>
		</div>
	{/if}
</div>

<style>
	.rk-version-num {
		font-family: var(--cds-code-01-font-family, monospace);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.rk-show-more {
		padding: var(--cds-spacing-03) 0;
	}
</style>
