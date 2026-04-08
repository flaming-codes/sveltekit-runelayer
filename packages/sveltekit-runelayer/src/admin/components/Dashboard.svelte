<script lang="ts">
	import { ClickableTile, Column, Grid, Heading, Row, Section } from "carbon-components-svelte";
	import Folders from "carbon-icons-svelte/lib/Folders.svelte";
	import Settings from "carbon-icons-svelte/lib/Settings.svelte";

	let {
		collections = [],
		globals = [],
		basePath = "/admin",
	}: {
		collections?: { slug: string; label: string; count: number }[];
		globals?: { slug: string; label: string }[];
		basePath?: string;
	} = $props();

	let totalDocuments = $derived(collections.reduce((sum, collection) => sum + collection.count, 0));
</script>

<div class="rk-dashboard">
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Section>
				<Heading>Dashboard</Heading>
			</Section>
			<p class="rk-description">
				Manage your content collections, globals, and site-wide settings.
			</p>
		</div>
	</div>

	<div class="rk-page-body">
		{#if collections.length > 0}
			<section class="rk-section">
				<p class="rk-section-title">Collections</p>
				<p class="rk-section-description">
					{totalDocuments} documents across {collections.length} collections.
				</p>
				<Grid narrow fullWidth>
					<Row narrow>
						{#each collections as collection}
							<Column sm={2} md={4} lg={4}>
								<ClickableTile href={`${basePath}/collections/${collection.slug}`} class="rk-card">
									<div class="rk-card-icon">
										<Folders size={20} />
									</div>
									<p class="rk-card-label">{collection.label}</p>
									<p class="rk-card-meta">{collection.count} {collection.count === 1 ? "document" : "documents"}</p>
								</ClickableTile>
							</Column>
						{/each}
					</Row>
				</Grid>
			</section>
		{:else}
			<section class="rk-section">
				<p class="rk-section-title">Collections</p>
				<p class="rk-section-description">
					No collections configured. Add a collection to your Runelayer config to get started.
				</p>
			</section>
		{/if}

		{#if globals.length > 0}
			<section class="rk-section">
				<p class="rk-section-title">Globals</p>
				<p class="rk-section-description">
					Singleton entries for site-wide settings and shared configuration.
				</p>
				<Grid narrow fullWidth>
					<Row narrow>
						{#each globals as global}
							<Column sm={2} md={4} lg={4}>
								<ClickableTile href={`${basePath}/globals/${global.slug}`} class="rk-card">
									<div class="rk-card-icon">
										<Settings size={20} />
									</div>
									<p class="rk-card-label">{global.label}</p>
									<p class="rk-card-meta">Singleton</p>
								</ClickableTile>
							</Column>
						{/each}
					</Row>
				</Grid>
			</section>
		{/if}
	</div>
</div>

<style>
	@import "./page-layout.css";

	/* Dashboard has a taller header than the standard page layout */
	.rk-page-header {
		padding: var(--cds-spacing-09) var(--cds-spacing-06) var(--cds-spacing-07);
	}

	/* Carbon Heading overrides for the h1 */
	.rk-page-header :global(h1) {
		margin: 0 0 var(--cds-spacing-03);
		font-size: 2.625rem;
		font-weight: 300;
	}

	.rk-description {
		margin: 0;
		max-width: 42rem;
		font-size: 1rem;
		line-height: 1.5;
		color: var(--cds-text-secondary);
	}

	.rk-section {
		margin-bottom: var(--cds-spacing-07);
	}

	.rk-section-title {
		margin: 0 0 var(--cds-spacing-03);
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: 0.16px;
		text-transform: uppercase;
		color: var(--cds-text-secondary);
	}

	.rk-section-description {
		margin: 0 0 0;
		font-size: 0.875rem;
		line-height: 1.43;
		color: var(--cds-text-secondary);
	}

	/* Push grid flush against section header */
	:global(.rk-dashboard .bx--grid) {
		padding-inline: 0;
		margin-top: var(--cds-spacing-03);
	}

	:global(.rk-dashboard .bx--row) {
		margin-inline: 0;
	}

	/* Tile card content layout */
	:global(.rk-card.bx--tile) {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
		min-height: 9rem;
		padding: var(--cds-spacing-05);
	}

	.rk-card-icon {
		color: var(--cds-icon-secondary);
	}

	.rk-card-label {
		margin: 0;
		font-size: 1rem;
		font-weight: 400;
		line-height: 1.375;
		color: var(--cds-text-primary);
	}

	.rk-card-meta {
		margin: 0;
		margin-top: auto;
		font-size: 0.75rem;
		line-height: 1.34;
		color: var(--cds-text-secondary);
	}

	@media (max-width: 672px) {
		.rk-page-header {
			padding: var(--cds-spacing-07) var(--cds-spacing-05) var(--cds-spacing-06);
		}

		.rk-page-header :global(h1) {
			font-size: 1.75rem;
		}
	}
</style>
