<script lang="ts">
	let {
		collections = [],
		globals = [],
		basePath = "/admin",
	}: {
		collections?: { slug: string; label: string; count: number }[];
		globals?: { slug: string; label: string }[];
		basePath?: string;
	} = $props();
</script>

<section class="rk-page">
	<h1>Dashboard</h1>
	<p class="rk-subtitle">Manage collections and globals in the admin workspace.</p>

	<h2>Collections</h2>
	<div class="rk-card-grid">
		{#if collections.length === 0}
			<p>No collections configured.</p>
		{:else}
			{#each collections as collection}
				<a class="rk-card" href={`${basePath}/collections/${collection.slug}`}>
					<strong>{collection.label}</strong>
					<span>{collection.count} documents</span>
				</a>
			{/each}
		{/if}
	</div>

	{#if globals.length > 0}
		<h2>Globals</h2>
		<div class="rk-card-grid">
			{#each globals as global}
				<a class="rk-card" href={`${basePath}/globals/${global.slug}`}>
					<strong>{global.label}</strong>
					<span>Singleton</span>
				</a>
			{/each}
		</div>
	{/if}
</section>

<style>
	.rk-page {
		grid-column: 1 / -1;
	}

	.rk-subtitle {
		margin: 0.5rem 0 1.5rem;
		color: var(--cds-text-secondary, #c6c6c6);
	}

	.rk-card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.rk-card {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 1rem;
		text-decoration: none;
		color: inherit;
		border: 1px solid var(--cds-border-subtle, #525252);
		background: var(--cds-layer-02, #262626);
	}

	.rk-card:hover {
		background: var(--cds-layer-hover-02, #333333);
	}

	.rk-card span {
		font-size: 0.875rem;
		color: var(--cds-text-secondary, #c6c6c6);
	}
</style>
