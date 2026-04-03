<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		Button,
		StructuredList,
		StructuredListBody,
		StructuredListCell,
		StructuredListRow,
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

	let showCount = $state(5);
	let visibleVersions = $derived(versions.slice(0, showCount));
	let hasMore = $derived(versions.length > showCount);
</script>

<div class="rk-version-history">
	<Accordion>
		<AccordionItem title="Version history ({versions.length})">
			<StructuredList condensed>
				<StructuredListBody>
					{#each visibleVersions as version}
						<StructuredListRow>
							<StructuredListCell>
								<span class="rk-version-num">v{version._version}</span>
							</StructuredListCell>
							<StructuredListCell>
								<Tag size="sm" type={version._status === "published" ? "green" : "teal"}>
									{version._status}
								</Tag>
							</StructuredListCell>
							<StructuredListCell>
								{new Date(version.createdAt).toLocaleString()}
							</StructuredListCell>
							<StructuredListCell>
								{#if version._version === currentVersion}
									<span class="rk-current-badge">Current</span>
								{:else}
									<Button kind="ghost" size="small" on:click={() => onRestore(version.id)}>
										Restore
									</Button>
								{/if}
							</StructuredListCell>
						</StructuredListRow>
					{/each}
				</StructuredListBody>
			</StructuredList>
			{#if hasMore}
				<Button
					kind="ghost"
					size="small"
					on:click={() => {
						showCount += 10;
					}}
				>
					Show more ({versions.length - showCount} remaining)
				</Button>
			{/if}
		</AccordionItem>
	</Accordion>
</div>

<style>
	.rk-version-history {
		margin: var(--cds-spacing-05) 0;
		border-top: 1px solid var(--cds-border-subtle);
		padding-top: var(--cds-spacing-04);
	}

	.rk-version-num {
		font-family: var(--cds-code-01-font-family, monospace);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.rk-current-badge {
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		font-style: italic;
	}
</style>
