<script lang="ts">
	import type { CollectionConfig } from "../../schema/collections.js";

	let {
		collection,
		documents = [],
		page = 1,
		totalPages = 1,
		totalDocs = 0,
		basePath = "/admin",
	}: {
		collection: CollectionConfig;
		documents: Record<string, any>[];
		page?: number;
		totalPages?: number;
		totalDocs?: number;
		basePath?: string;
	} = $props();

	let columns = $derived(
		collection.admin?.defaultColumns ?? collection.fields.slice(0, 3).map((field) => field.name),
	);
	let sortField = $state("");
	let sortDir = $state<"asc" | "desc">("asc");
	let slug = $derived(collection.slug);
	let label = $derived(collection.labels?.plural ?? slug);

	function toggleSort(column: string) {
		if (sortField === column) {
			sortDir = sortDir === "asc" ? "desc" : "asc";
			return;
		}
		sortField = column;
		sortDir = "asc";
	}

	let sorted = $derived.by(() => {
		if (!sortField) return documents;
		return [...documents].sort((left, right) => {
			const leftValue = left[sortField] ?? "";
			const rightValue = right[sortField] ?? "";
			const compare = String(leftValue).localeCompare(String(rightValue), undefined, {
				numeric: true,
			});
			return sortDir === "asc" ? compare : -compare;
		});
	});
</script>

<section class="rk-page">
	<div class="rk-page-header">
		<div>
			<h1>{label}</h1>
			<p>{totalDocs} total documents</p>
		</div>
		<a class="rk-button" href={`${basePath}/collections/${slug}/create`}>Create New</a>
	</div>

	<div class="rk-table-wrap">
		<table>
			<thead>
				<tr>
					{#each columns as column}
						<th>
							<button type="button" onclick={() => toggleSort(column)}>
								{column}
								{#if sortField === column}<span>{sortDir === "asc" ? " ↑" : " ↓"}</span>{/if}
							</button>
						</th>
					{/each}
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#if sorted.length === 0}
					<tr><td colspan={columns.length + 1}>No documents in this collection yet.</td></tr>
				{:else}
					{#each sorted as doc}
						<tr>
							{#each columns as column}
								<td>{doc[column] ?? ""}</td>
							{/each}
							<td><a href={`${basePath}/collections/${slug}/${doc.id}`}>Edit</a></td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	{#if totalPages > 1}
		<div class="rk-pagination">
			{#if page > 1}
				<a href={`?page=${page - 1}`}>Previous</a>
			{/if}
			<span>Page {page} of {totalPages}</span>
			{#if page < totalPages}
				<a href={`?page=${page + 1}`}>Next</a>
			{/if}
		</div>
	{/if}
</section>

<style>
	.rk-page {
		grid-column: 1 / -1;
	}

	.rk-page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.rk-page-header p {
		margin-top: 0.35rem;
		color: var(--cds-text-secondary, #c6c6c6);
	}

	.rk-button {
		display: inline-block;
		padding: 0.6rem 1rem;
		border: 1px solid var(--cds-button-primary, #0f62fe);
		background: var(--cds-button-primary, #0f62fe);
		color: #fff;
		text-decoration: none;
	}

	.rk-table-wrap {
		overflow-x: auto;
		border: 1px solid var(--cds-border-subtle, #525252);
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.75rem;
		border-bottom: 1px solid var(--cds-border-subtle, #525252);
		text-align: left;
	}

	th button {
		all: unset;
		cursor: pointer;
	}

	.rk-pagination {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-top: 1rem;
	}
</style>
