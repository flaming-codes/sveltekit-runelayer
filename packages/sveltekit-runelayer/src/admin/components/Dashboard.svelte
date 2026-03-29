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
	<div class="rk-dashboard-header" data-carbon-theme="g100">
		<div class="rk-dashboard-header-inner">
			<h1 class="rk-dashboard-title">Dashboard</h1>
			<p class="rk-dashboard-description">
				Manage your content collections, globals, and site-wide settings. Each tile links
				directly to its editor view.
			</p>
		</div>
	</div>

	{#if collections.length > 0}
		<section class="rk-dashboard-section">
			<h2 class="rk-section-title">Collections</h2>
			<p class="rk-section-description">
				Content groups with {totalDocuments} total documents across {collections.length} collections.
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
		<section class="rk-dashboard-section">
			<h2 class="rk-section-title">Collections</h2>
			<p class="rk-section-description">
				No collections configured. Add a collection to your Runelayer config to get started.
			</p>
		</section>
	{/if}

	{#if globals.length > 0}
		<section class="rk-dashboard-section">
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

<style>
	.rk-dashboard {
		grid-column: 1 / -1;
		margin: -2rem -1.5rem 0;
	}

	/* ── Page header (g100 themed) ── */

	.rk-dashboard-header {
		background: #161616;
		color: #f4f4f4;
		padding: 3rem 0 2.5rem;
	}

	.rk-dashboard-header-inner {
		max-width: 90rem;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	.rk-dashboard-title {
		margin: 0 0 0.5rem;
		font-size: 2.625rem;
		font-weight: 300;
		line-height: 1.2;
		letter-spacing: 0;
	}

	.rk-dashboard-description {
		margin: 0;
		max-width: 42rem;
		font-size: 1rem;
		line-height: 1.5;
		color: #c6c6c6;
	}

	/* ── Sections ── */

	.rk-dashboard-section {
		max-width: 90rem;
		margin: 0 auto 3rem;
		padding: 2rem 1.5rem 0;
	}

	.rk-section-title {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		font-weight: 400;
		line-height: 1.4;
		color: var(--cds-text-primary);
	}

	.rk-section-description {
		margin: 0 0 1.5rem;
		font-size: 0.875rem;
		line-height: 1.43;
		color: var(--cds-text-secondary);
		max-width: 42rem;
	}

	/* ── Grid overrides ── */

	:global(.rk-dashboard .bx--grid) {
		padding-inline: 0;
	}

	:global(.rk-dashboard .bx--row) {
		margin-inline: 0;
	}

	/* ── Cards ── */

	:global(.rk-card) {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		min-height: 16rem;
		padding: 1.25rem;
		background: var(--cds-ui-background, #fff);
		border: none;
		text-decoration: none;
		transition: background-color 110ms;
	}

	:global(.rk-card:hover) {
		background: var(--cds-layer-01, #f4f4f4);
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
		gap: 0.5rem;
	}

	/* ── Responsive ── */

	@media (max-width: 1024px) {
		.rk-dashboard {
			margin: -1.5rem -1rem 0;
		}

		.rk-dashboard-header-inner,
		.rk-dashboard-section {
			padding-inline: 1rem;
		}
	}

	@media (max-width: 672px) {
		.rk-dashboard-title {
			font-size: 1.75rem;
		}

		.rk-dashboard-header {
			padding: 2rem 0 1.5rem;
		}
	}
</style>
