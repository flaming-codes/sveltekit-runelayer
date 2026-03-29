<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		ClickableTile,
		Column,
		Grid,
		Row,
		Tag,
		Tile,
	} from "carbon-components-svelte";

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
	let collectionTotal = $derived(collections.length);
	let globalTotal = $derived(globals.length);
	let busiestCollection = $derived.by(() => {
		if (collections.length === 0) {
			return null;
		}

		return collections.reduce((largest, current) =>
			current.count > largest.count ? current : largest,
		);
	});
	let primaryCollection = $derived(collections[0] ?? null);
	let primaryGlobal = $derived(globals[0] ?? null);
</script>

<section class="rk-page">
	<Grid fullWidth condensed>
		<Row condensed class="rk-row-spacing rk-row-spacing-sm">
			<Column sm={4} md={8} lg={16}>
				<Breadcrumb noTrailingSlash>
					<BreadcrumbItem href={basePath} isCurrentPage>Dashboard</BreadcrumbItem>
				</Breadcrumb>
			</Column>
		</Row>

		<Row condensed class="rk-row-spacing rk-row-spacing-lg">
			<Column sm={4} md={8} lg={11} xlg={11} max={11}>
				<div class="rk-hero-copy">
					<p class="rk-eyebrow">Admin overview</p>
					<h1>Dashboard</h1>
					<p class="rk-subtitle">
						Manage collections, globals, and content volume from one Carbon-aligned workspace.
					</p>
					<div class="rk-tag-row" aria-label="Dashboard summary">
						<Tag type="cool-gray">{collectionTotal} collections</Tag>
						<Tag type="cool-gray">{globalTotal} globals</Tag>
						<Tag type="blue">{totalDocuments} total documents</Tag>
						{#if busiestCollection}
							<Tag type="teal">Top volume: {busiestCollection.label}</Tag>
						{/if}
					</div>
				</div>
			</Column>

			<Column sm={4} md={8} lg={5} xlg={5} max={5}>
				<Tile class="rk-hero-tile">
					<p class="rk-tile-label">Next action</p>
					<h2>Start where editors spend time.</h2>
					<p>
						Jump into the busiest collection or update global settings without leaving the dashboard.
					</p>
					<div class="rk-action-stack">
						{#if primaryCollection}
							<Button href={`${basePath}/collections/${primaryCollection.slug}`}>Open collections</Button>
						{/if}
						{#if primaryGlobal}
							<Button kind="tertiary" href={`${basePath}/globals/${primaryGlobal.slug}`}>
								Edit globals
							</Button>
						{/if}
					</div>
				</Tile>
			</Column>
		</Row>

		<Row condensed class="rk-row-spacing">
			<Column sm={4} md={4} lg={4}>
				<Tile class="rk-stat-tile">
					<p class="rk-tile-label">Collections</p>
					<p class="rk-stat-value">{collectionTotal}</p>
					<p class="rk-stat-copy">Configured content groups available in the admin.</p>
				</Tile>
			</Column>
			<Column sm={4} md={4} lg={4}>
				<Tile class="rk-stat-tile">
					<p class="rk-tile-label">Documents</p>
					<p class="rk-stat-value">{totalDocuments}</p>
					<p class="rk-stat-copy">Total entries across all configured collections.</p>
				</Tile>
			</Column>
			<Column sm={4} md={4} lg={4}>
				<Tile class="rk-stat-tile">
					<p class="rk-tile-label">Globals</p>
					<p class="rk-stat-value">{globalTotal}</p>
					<p class="rk-stat-copy">Singleton content areas for site-wide settings.</p>
				</Tile>
			</Column>
			<Column sm={4} md={4} lg={4}>
				<Tile class="rk-stat-tile">
					<p class="rk-tile-label">Largest collection</p>
					<p class="rk-stat-value rk-stat-value-sm">{busiestCollection?.label ?? "None"}</p>
					<p class="rk-stat-copy">
						{#if busiestCollection}
							{busiestCollection.count} documents ready to manage.
						{:else}
							Add a collection to surface content volume here.
						{/if}
					</p>
				</Tile>
			</Column>
		</Row>

		<Row condensed class="rk-row-spacing rk-row-spacing-lg">
			<Column sm={4} md={8} lg={16}>
				<div class="rk-section-heading">
					<div>
						<p class="rk-eyebrow">Collections</p>
						<h2>Content areas</h2>
					</div>
					<p>Each tile maps directly to a configured collection and its current document volume.</p>
				</div>
			</Column>

			{#if collections.length === 0}
				<Column sm={4} md={8} lg={16}>
					<Tile class="rk-empty-tile">
						<h3>No collections configured</h3>
						<p>Add a collection to make it available in the dashboard and admin navigation.</p>
					</Tile>
				</Column>
			{:else}
				{#each collections as collection}
					<Column sm={4} md={4} lg={4}>
						<ClickableTile
							class="rk-resource-tile"
							href={`${basePath}/collections/${collection.slug}`}
						>
							<div class="rk-resource-header">
								<p class="rk-resource-name">{collection.label}</p>
								<Tag type="cool-gray">Collection</Tag>
							</div>
							<p class="rk-resource-metric">{collection.count}</p>
							<p class="rk-resource-copy">Documents available for listing, editing, and publishing.</p>
							<p class="rk-resource-link">Open {collection.label}</p>
						</ClickableTile>
					</Column>
				{/each}
			{/if}
		</Row>

		{#if globals.length > 0}
			<Row condensed class="rk-row-spacing rk-row-spacing-lg">
				<Column sm={4} md={8} lg={16}>
					<div class="rk-section-heading">
						<div>
							<p class="rk-eyebrow">Globals</p>
							<h2>Shared settings</h2>
						</div>
						<p>Singleton entries for navigation, metadata, and other site-wide configuration.</p>
					</div>
				</Column>

				{#each globals as global}
					<Column sm={4} md={4} lg={4}>
						<ClickableTile class="rk-resource-tile" href={`${basePath}/globals/${global.slug}`}>
							<div class="rk-resource-header">
								<p class="rk-resource-name">{global.label}</p>
								<Tag type="blue">Singleton</Tag>
							</div>
							<p class="rk-resource-metric rk-resource-metric-sm">1</p>
							<p class="rk-resource-copy">Direct edit access for a shared global document.</p>
							<p class="rk-resource-link">Open {global.label}</p>
						</ClickableTile>
					</Column>
				{/each}
			</Row>
		{/if}
	</Grid>
</section>

<style>
	.rk-page {
		grid-column: 1 / -1;
	}

	:global(.rk-page .bx--grid) {
		padding-inline: 0;
	}

	:global(.rk-page .bx--row) {
		margin-inline: 0;
	}

	:global(.rk-page .bx--tile) {
		min-height: 100%;
	}

	:global(.rk-page .bx--tile),
	:global(.rk-page .bx--clickable-tile) {
		background: var(--cds-layer-01);
	}

	:global(.rk-page .bx--clickable-tile:hover) {
		background: var(--cds-layer-hover-01);
	}

	:global(.rk-row-spacing) {
		margin-bottom: 1rem;
	}

	:global(.rk-row-spacing-sm) {
		margin-bottom: 0.5rem;
	}

	:global(.rk-row-spacing-lg) {
		margin-bottom: 2rem;
	}

	.rk-eyebrow,
	.rk-tile-label {
		margin: 0 0 0.5rem;
		font-size: 0.75rem;
		line-height: 1.33333;
		letter-spacing: 0.32px;
		text-transform: uppercase;
		color: var(--cds-text-secondary);
	}

	.rk-hero-copy h1,
	.rk-section-heading h2 {
		margin: 0;
	}

	.rk-subtitle {
		max-width: 48rem;
		margin: 1rem 0 0;
		font-size: 1.25rem;
		line-height: 1.4;
		color: var(--cds-text-secondary);
	}

	.rk-tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}

	:global(.rk-hero-tile),
	:global(.rk-stat-tile),
	:global(.rk-empty-tile),
	:global(.rk-resource-tile) {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	:global(.rk-hero-tile) {
		justify-content: space-between;
		min-height: 100%;
	}

	:global(.rk-hero-tile h2) {
		margin: 0;
		font-size: 1.75rem;
		line-height: 1.2;
	}

	:global(.rk-hero-tile p),
	.rk-stat-copy,
	.rk-section-heading p,
	.rk-resource-copy,
	:global(.rk-empty-tile p) {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.42857;
		color: var(--cds-text-secondary);
	}

	.rk-action-stack {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.rk-stat-value {
		margin: 0;
		font-size: clamp(2.5rem, 5vw, 3.75rem);
		line-height: 0.95;
		letter-spacing: -0.02em;
	}

	.rk-stat-value-sm {
		font-size: clamp(1.75rem, 3.6vw, 2.5rem);
		line-height: 1.05;
	}

	.rk-section-heading {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.rk-resource-header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 0.75rem;
	}

	.rk-resource-name {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--cds-link-primary);
	}

	.rk-resource-metric {
		margin: auto 0 0;
		font-size: clamp(2rem, 4vw, 3rem);
		line-height: 1;
		letter-spacing: -0.02em;
	}

	.rk-resource-metric-sm {
		font-size: clamp(1.5rem, 3.2vw, 2rem);
	}

	.rk-resource-link {
		margin: auto 0 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--cds-link-primary);
	}

	:global(.rk-empty-tile h3) {
		margin: 0;
		font-size: 1.25rem;
		line-height: 1.3;
	}

	@media (max-width: 1056px) {
		.rk-section-heading {
			align-items: start;
			flex-direction: column;
		}
	}

	@media (max-width: 672px) {
		:global(.rk-hero-tile h2) {
			font-size: 1.375rem;
		}

		.rk-action-stack {
			flex-direction: column;
		}
	}
</style>
