<script lang="ts">
	import type { CollectionConfig } from '../../schema/collections.js';

	let { collection, documents = [], page = 1, totalPages = 1, basePath = '/admin' }: {
		collection: CollectionConfig;
		documents: Record<string, any>[];
		page?: number;
		totalPages?: number;
		basePath?: string;
	} = $props();

	let columns = $derived(
		collection.admin?.defaultColumns ?? collection.fields.slice(0, 3).map(f => f.name)
	);
	let titleField = $derived(collection.admin?.useAsTitle ?? 'id');
	let sortField = $state('');
	let sortDir = $state<'asc' | 'desc'>('asc');

	function toggleSort(col: string) {
		if (sortField === col) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
		else { sortField = col; sortDir = 'asc'; }
	}

	let sorted = $derived.by(() => {
		if (!sortField) return documents;
		return [...documents].sort((a, b) => {
			const av = a[sortField] ?? '', bv = b[sortField] ?? '';
			const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
			return sortDir === 'asc' ? cmp : -cmp;
		});
	});

	let slug = $derived(collection.slug);
	let label = $derived(collection.labels?.plural ?? slug);
</script>

<div class="rk-list-header">
	<h1>{label}</h1>
	<a href="{basePath}/collections/{slug}/create">Create New</a>
</div>

<table class="rk-table">
	<thead>
		<tr>
			{#each columns as col}
				<th><button type="button" onclick={() => toggleSort(col)}>{col} {sortField === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}</button></th>
			{/each}
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each sorted as doc}
			<tr>
				{#each columns as col}
					<td>{doc[col] ?? ''}</td>
				{/each}
				<td><a href="{basePath}/collections/{slug}/{doc.id}">Edit</a></td>
			</tr>
		{/each}
	</tbody>
</table>

{#if totalPages > 1}
	<div class="rk-pagination">
		{#if page > 1}<a href="?page={page - 1}">Prev</a>{/if}
		<span>Page {page} of {totalPages}</span>
		{#if page < totalPages}<a href="?page={page + 1}">Next</a>{/if}
	</div>
{/if}

<style>
	.rk-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
	.rk-table { width: 100%; border-collapse: collapse; }
	.rk-table th, .rk-table td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; }
	.rk-table th button { background: none; border: none; cursor: pointer; font-weight: bold; padding: 0; }
	.rk-pagination { display: flex; gap: 1rem; align-items: center; margin-top: 1rem; }
</style>
