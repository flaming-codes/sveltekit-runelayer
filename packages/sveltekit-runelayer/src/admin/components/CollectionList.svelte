<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Column,
		DataTable,
		Grid,
		Pagination,
		Row,
		Tag,
		Tile,
		Toolbar,
		ToolbarContent,
		ToolbarSearch,
	} from "carbon-components-svelte";
	import type { DataTableHeader } from "carbon-components-svelte/src/DataTable/DataTable.svelte";
	import type { CollectionConfig } from "../../schema/collections.js";

	type CollectionRow = {
		id: string;
		actions: string;
		[key: string]: string;
	};

	let {
		collection,
		documents = [],
		page = 1,
		totalPages = 1,
		totalDocs = 0,
		limit = 20,
		basePath = "/admin",
	}: {
		collection: CollectionConfig;
		documents: Record<string, any>[];
		page?: number;
		totalPages?: number;
		totalDocs?: number;
		limit?: number;
		basePath?: string;
	} = $props();

	let searchTerm = $state("");
	let columns = $derived(
		collection.admin?.defaultColumns ?? collection.fields.slice(0, 3).map((field) => field.name),
	);
	let sortField = $state("");
	let sortDir = $state<"asc" | "desc">("asc");
	let slug = $derived(collection.slug);
	let label = $derived(collection.labels?.plural ?? slug);
	let singularLabel = $derived(collection.labels?.singular ?? collection.slug);
	let firstColumn = $derived(columns[0] ?? "id");

	function formatHeading(value: string) {
		return value
			.replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
			.replaceAll(/[-_]+/g, " ")
			.replaceAll(/\s+/g, " ")
			.trim()
			.replace(/^./, (char) => char.toUpperCase());
	}

	function displayValue(value: unknown): string {
		if (value === null || value === undefined || value === "") return "-";
		if (typeof value === "boolean") return value ? "Yes" : "No";
		if (Array.isArray(value)) return value.map((item) => displayValue(item)).join(", ");
		if (typeof value === "object") return JSON.stringify(value);
		return String(value);
	}

	function buildCollectionHref(nextPage: number, nextLimit: number = limit) {
		const params = new URLSearchParams();
		if (nextPage > 1) params.set("page", String(nextPage));
		if (nextLimit !== 20) params.set("limit", String(nextLimit));
		const query = params.toString();
		return `${basePath}/collections/${slug}${query ? `?${query}` : ""}`;
	}

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

	let filtered = $derived.by(() => {
		if (!searchTerm) return sorted;
		const normalizedSearch = searchTerm.toLowerCase();
		return sorted.filter((document) =>
			columns.some((column) => displayValue(document[column]).toLowerCase().includes(normalizedSearch)),
		);
	});

	let headers: DataTableHeader<CollectionRow>[] = $derived(
		[
			...columns.map(
				(column) =>
					({
						key: column as string & {},
						value: formatHeading(column),
					}) satisfies DataTableHeader<CollectionRow>,
			),
			{ key: "actions", value: "Actions" } satisfies DataTableHeader<CollectionRow>,
		],
	);

	let rows: CollectionRow[] = $derived(
		filtered.map(
			(document, index) =>
				({
					id: String(document.id ?? `${slug}-${index}`),
					actions: "Edit",
					...Object.fromEntries(
						columns.map((column) => [column, displayValue(document[column])]),
					),
				}) satisfies CollectionRow,
		),
	);
</script>

<section class="rk-page">
	<Grid fullWidth condensed>
		<Row>
			<Column sm={4} md={8} lg={12}>
				<Breadcrumb noTrailingSlash>
					<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
					<BreadcrumbItem href={`${basePath}/collections/${slug}`} isCurrentPage>{label}</BreadcrumbItem>
				</Breadcrumb>
				<div class="rk-page-header">
					<p class="rk-eyebrow">Collection</p>
					<h1>{label}</h1>
					<p class="rk-description">
						Manage {singularLabel.toLowerCase()} entries with Carbon data table controls.
					</p>
				</div>
			</Column>
			<Column sm={4} md={8} lg={4} class="rk-page-action">
				<Button href={`${basePath}/collections/${slug}/create`}>Create {singularLabel}</Button>
			</Column>
		</Row>

		<Row>
			<Column sm={4} md={4} lg={4}>
				<Tile class="rk-summary-tile">
					<p class="rk-summary-label">Documents</p>
					<p class="rk-summary-value">{totalDocs}</p>
					<Tag type="green">Live schema</Tag>
				</Tile>
			</Column>
			<Column sm={4} md={4} lg={4}>
				<Tile class="rk-summary-tile">
					<p class="rk-summary-label">Visible</p>
					<p class="rk-summary-value">{filtered.length}</p>
					<p class="rk-summary-copy">Filtered on the current page.</p>
				</Tile>
			</Column>
			<Column sm={4} md={8} lg={8}>
				<Tile class="rk-summary-tile">
					<p class="rk-summary-label">Columns</p>
					<div class="rk-tag-row">
						{#each columns as column}
							<Tag type="cool-gray">{formatHeading(column)}</Tag>
						{/each}
					</div>
				</Tile>
			</Column>
		</Row>

		<Row>
			<Column sm={4} md={8} lg={16}>
				<DataTable {headers} {rows} sortable>
					<Toolbar>
						<ToolbarContent>
							<ToolbarSearch
								persistent
								value={searchTerm}
								on:input={(event: Event) => {
									searchTerm = (event.target as HTMLInputElement | null)?.value ?? "";
								}}
								on:clear={() => {
									searchTerm = "";
								}}
							/>
							<Button kind="ghost" href={buildCollectionHref(1)}>Reset</Button>
						</ToolbarContent>
					</Toolbar>
					<svelte:fragment slot="cell" let:row let:cell>
						{#if cell.key === firstColumn}
							<a href={`${basePath}/collections/${slug}/${row.id}`} class="rk-table-link">{cell.value}</a>
						{:else if cell.key === "actions"}
							<a href={`${basePath}/collections/${slug}/${row.id}`} class="rk-table-link">Open</a>
						{:else if cell.value === "Yes" || cell.value === "No"}
							<Tag type={cell.value === "Yes" ? "green" : "gray"}>{cell.value}</Tag>
						{:else}
							{cell.value}
						{/if}
					</svelte:fragment>
				</DataTable>
			</Column>
		</Row>

		{#if totalPages > 1}
			<Row>
				<Column sm={4} md={8} lg={16}>
					<nav class="rk-pagination" aria-label={`${label} pagination`}>
						<Pagination
							totalItems={totalDocs}
							pageSize={limit}
							page={page}
							pageSizes={[10, 20, 50]}
							on:change={(event: CustomEvent<{ page?: number; pageSize?: number }>) => {
								const nextPage = event.detail.page ?? page;
								const nextLimit = event.detail.pageSize ?? limit;
								window.location.assign(buildCollectionHref(nextPage, nextLimit));
							}}
						/>
					</nav>
				</Column>
			</Row>
		{/if}
	</Grid>
</section>

<style>
	.rk-page {
		grid-column: 1 / -1;
	}

	.rk-page-header {
		margin: 1rem 0 2rem;
	}

	:global(.rk-page-action) {
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
	}

	.rk-eyebrow,
	.rk-summary-label {
		margin: 0;
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--cds-text-secondary);
	}

	.rk-page-header h1,
	.rk-summary-value {
		margin: 0.5rem 0 0;
		font-size: clamp(2rem, 3vw, 3rem);
		font-weight: 300;
	}

	.rk-description,
	.rk-summary-copy {
		margin: 0.75rem 0 0;
		color: var(--cds-text-secondary);
	}

	:global(.rk-summary-tile) {
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.rk-tag-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.rk-pagination {
		margin-top: 1rem;
	}

	.rk-table-link {
		color: var(--cds-link-primary);
		text-decoration: none;
		font-weight: 600;
	}

	.rk-table-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 1055px) {
		:global(.rk-page-action) {
			justify-content: flex-start;
		}
	}
</style>
