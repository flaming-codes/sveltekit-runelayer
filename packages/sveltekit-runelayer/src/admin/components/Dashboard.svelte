<script lang="ts">
	let { collections = [], basePath = '/admin' }: {
		collections?: { slug: string; label: string; count: number }[];
		basePath?: string;
	} = $props();
</script>

<h1>Dashboard</h1>
<div class="rk-cards">
	{#each collections as c}
		<a class="rk-card" href="{basePath}/collections/{c.slug}">
			<strong>{c.label}</strong>
			<span>{c.count} documents</span>
		</a>
	{/each}
</div>

<style>
	.rk-cards { display: flex; gap: 1rem; flex-wrap: wrap; }
	.rk-card { display: block; padding: 1rem 1.5rem; border: 1px solid #ddd; border-radius: 4px; text-decoration: none; color: inherit; }
	.rk-card:hover { background: #f9f9f9; }
	.rk-card strong { display: block; margin-bottom: 0.25rem; }
</style>
