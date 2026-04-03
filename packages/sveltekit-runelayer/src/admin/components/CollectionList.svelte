<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		DataTable,
		Pagination,
		Tag,
		Toolbar,
		ToolbarContent,
		ToolbarSearch,
	} from "carbon-components-svelte";
	import { goto } from "$app/navigation";
	import type { CollectionConfig } from "../../schema/collections.js";

	type DataTableHeader<T = Record<string, unknown>> = {
		key: keyof T & string;
		value: string;
		sort?: (a: T[keyof T], b: T[keyof T]) => number;
		display?: (value: T[keyof T]) => string;
		empty?: string;
	};

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
	let hasVersions = $derived(!!collection.versions);

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
			columns.some((column) =>
				displayValue(document[column]).toLowerCase().includes(normalizedSearch),
			),
		);
	});

	let headers: DataTableHeader<CollectionRow>[] = $derived([
		...columns.map(
			(column) =>
				({
					key: column as string & {},
					value: formatHeading(column),
				}) satisfies DataTableHeader<CollectionRow>,
		),
		...(hasVersions
			? [{ key: "_status", value: "Status" } satisfies DataTableHeader<CollectionRow>]
			: []),
		{ key: "actions", value: "Actions" } satisfies DataTableHeader<CollectionRow>,
	]);

	let rows: CollectionRow[] = $derived(
		filtered.map(
			(document, index) =>
				({
					id: String(document.id ?? `${slug}-${index}`),
					actions: "Edit",
					...Object.fromEntries(columns.map((column) => [column, displayValue(document[column])])),
					...(hasVersions ? { _status: (document._status as string) ?? "draft" } : {}),
				}) satisfies CollectionRow,
		),
	);
</script>

<section class="rk-page">
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/collections/${slug}`} isCurrentPage>
					{label}
				</BreadcrumbItem>
			</Breadcrumb>
			<div class="rk-page-title-row">
				<div>
					<p class="rk-eyebrow">Collection</p>
					<h1>{totalDocs} {label}</h1>
				</div>
				<Button href={`${basePath}/collections/${slug}/create`}>Create {singularLabel}</Button>
			</div>
		</div>
	</div>

	<div class="rk-page-body">
		<DataTable {headers} {rows} sortable size="short">
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
				</ToolbarContent>
			</Toolbar>
			<svelte:fragment slot="cell" let:row let:cell>
				{#if cell.key === firstColumn}
					<a href={`${basePath}/collections/${slug}/${row.id}`} class="rk-table-link">
						{cell.value}
					</a>
				{:else if cell.key === "actions"}
					<a
						href={`${basePath}/collections/${slug}/${row.id}`}
						class="rk-table-link"
						aria-label={`Open ${row[firstColumn] || row.id}`}
					>
						Open
					</a>
				{:else if cell.key === "_status"}
					<Tag size="sm" type={cell.value === "published" ? "green" : "teal"}>{cell.value}</Tag>
				{:else if cell.value === "Yes" || cell.value === "No"}
					<Tag size="sm" type={cell.value === "Yes" ? "green" : "gray"}>{cell.value}</Tag>
				{:else}
					{cell.value}
				{/if}
			</svelte:fragment>
		</DataTable>

		{#if totalPages > 1}
			<Pagination
				totalItems={totalDocs}
				pageSize={limit}
				{page}
				pageSizes={[10, 20, 50]}
				on:change={(event: CustomEvent<{ page?: number; pageSize?: number }>) => {
					const nextPage = event.detail.page ?? page;
					const nextLimit = event.detail.pageSize ?? limit;
					goto(buildCollectionHref(nextPage, nextLimit));
				}}
			/>
		{/if}
	</div>
</section>

<style>
	@import "./page-layout.css";

	.rk-table-link {
		color: var(--cds-link-primary);
		text-decoration: none;
		font-weight: 600;
	}

	.rk-table-link:hover {
		text-decoration: underline;
	}
</style>
