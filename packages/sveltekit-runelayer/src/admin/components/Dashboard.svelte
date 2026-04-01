<script lang="ts">
	import { ClickableTile, Column, Grid, Row, Tag } from "carbon-components-svelte";
	import { Folders, Settings } from "carbon-icons-svelte";

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
			<h1>Dashboard</h1>
			<p class="rk-description">
				Manage your content collections, globals, and site-wide settings.
			</p>
		</div>
	</div>

	<div class="rk-page-body">
		{#if collections.length > 0}
			<section class="rk-section">
				<h2 class="rk-section-title">Collections</h2>
				<p class="rk-section-description">
					{totalDocuments} documents across {collections.length} collections.
				</p>
				<Grid fullWidth>
					<Row>
						{#each collections as collection}
							<Column sm={2} md={4} lg={4}>
								<ClickableTile
									class="rk-card"
									href={`${basePath}/collections/${collection.slug}`}
								>
									<span class="rk-card-label">{collection.label}</span>
									<div class="rk-card-icon">
										<Folders size={48} />
									</div>
									<div class="rk-card-footer">
										<Tag size="sm" type="cool-gray">{collection.count} docs</Tag>
									</div>
								</ClickableTile>
							</Column>
						{/each}
					</Row>
				</Grid>
			</section>
		{:else}
			<section class="rk-section">
				<h2 class="rk-section-title">Collections</h2>
				<p class="rk-section-description">
					No collections configured. Add a collection to your Runelayer config to get started.
				</p>
			</section>
		{/if}

		{#if globals.length > 0}
			<section class="rk-section">
				<h2 class="rk-section-title">Globals</h2>
				<p class="rk-section-description">
					Singleton entries for site-wide settings and shared configuration.
				</p>
				<Grid fullWidth>
					<Row>
						{#each globals as global}
							<Column sm={2} md={4} lg={4}>
								<ClickableTile
									class="rk-card"
									href={`${basePath}/globals/${global.slug}`}
								>
									<span class="rk-card-label">{global.label}</span>
									<div class="rk-card-icon">
										<Settings size={48} />
									</div>
									<div class="rk-card-footer">
										<Tag size="sm" type="blue">Singleton</Tag>
									</div>
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

	.rk-page-header h1 {
		margin: 0 0 var(--cds-spacing-03);
		font-size: 2.625rem;
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
		font-size: 1.25rem;
		font-weight: 400;
		line-height: 1.4;
		color: var(--cds-text-primary);
	}

	.rk-section-description {
		margin: 0 0 var(--cds-spacing-05);
		font-size: 0.875rem;
		line-height: 1.43;
		color: var(--cds-text-secondary);
		max-width: 42rem;
	}

	:global(.rk-dashboard .bx--grid) {
		padding-inline: 0;
	}

	:global(.rk-dashboard .bx--row) {
		margin-inline: 0;
	}

	:global(.rk-card) {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-height: 14rem;
		padding: var(--cds-spacing-05);
		background: var(--cds-ui-background);
		border: none;
		text-decoration: none;
		transition: background-color 110ms;
	}

	:global(.rk-card:hover) {
		background: var(--cds-layer-01);
	}

	.rk-card-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.29;
		letter-spacing: 0.16px;
		color: var(--cds-text-primary);
	}

	.rk-card-icon {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		color: var(--cds-icon-secondary);
	}

	.rk-card-footer {
		margin-top: auto;
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}

	@media (max-width: 672px) {
		/* Dashboard keeps taller header padding on mobile */
		.rk-page-header {
			padding: var(--cds-spacing-07) var(--cds-spacing-05) var(--cds-spacing-06);
		}

		.rk-page-header h1 {
			font-size: 1.75rem;
		}
	}
</style>
