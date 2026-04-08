<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		DataTable,
		Heading,
		Pagination,
		Section,
		Select,
		SelectItem,
		Tag,
		Toolbar,
		ToolbarContent,
		ToolbarSearch,
	} from "carbon-components-svelte";
	import { goto } from "$app/navigation";

	type DataTableHeader<T = Record<string, unknown>> = {
		key: keyof T & string;
		value: string;
		sort?: (a: T[keyof T], b: T[keyof T]) => number;
		display?: (value: T[keyof T]) => string;
		empty?: string;
	};

	type ManagedUser = {
		id: string;
		name: string;
		email: string;
		role: string;
		emailVerified?: boolean;
		banned?: boolean | null;
	};

	type UserRow = {
		id: string;
		name: string;
		email: string;
		role: string;
		status: string;
		actions: string;
	};

	let {
		users = [],
		page = 1,
		totalPages = 1,
		totalUsers = 0,
		limit = 20,
		searchTerm = "",
		roleFilter = "",
		basePath = "/admin",
	}: {
		users?: ManagedUser[];
		page?: number;
		totalPages?: number;
		totalUsers?: number;
		limit?: number;
		searchTerm?: string;
		roleFilter?: string;
		basePath?: string;
	} = $props();

	const headers: DataTableHeader<UserRow>[] = [
		{ key: "name", value: "Name" },
		{ key: "email", value: "Email" },
		{ key: "role", value: "Role" },
		{ key: "status", value: "Status" },
		{ key: "actions", value: "" },
	];

	let rows: UserRow[] = $derived(
		users.map((user) => ({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			status: user.banned ? "Banned" : user.emailVerified ? "Verified" : "Pending",
			actions: "Open",
		})),
	);

	function usersHref(nextPage: number, nextLimit: number = limit, q = searchTerm, role = roleFilter) {
		const params = new URLSearchParams();
		if (q.trim().length > 0) params.set("q", q.trim());
		if (role.trim().length > 0) params.set("role", role.trim().toLowerCase());
		if (nextPage > 1) params.set("page", String(nextPage));
		if (nextLimit !== 20) params.set("limit", String(nextLimit));
		const query = params.toString();
		return `${basePath}/users${query ? `?${query}` : ""}`;
	}

	function applyFilters(q: string, role: string) {
		goto(usersHref(1, limit, q, role));
	}

	let localSearch = $state("");
	let localRole = $state("");

	$effect(() => {
		localSearch = searchTerm;
		localRole = roleFilter;
	});
</script>

<section class="rk-page">
	<!-- Header (sticky) -->
	<div class="rk-page-header rk-page-header--sticky">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/users`} isCurrentPage>Users</BreadcrumbItem>
			</Breadcrumb>

			<div class="rk-page-title-row">
				<Section>
					<Heading>{totalUsers} Users</Heading>
				</Section>
			</div>

			<!-- Action toolbar -->
			<div class="rk-toolbar-row">
				<Toolbar>
					<ToolbarContent>
						<Button href={`${basePath}/users/create`}>Create user</Button>
					</ToolbarContent>
				</Toolbar>
			</div>
		</div>
	</div>

	<div class="rk-page-body">
		<DataTable {headers} {rows} sortable size="short">
			<Toolbar>
				<ToolbarContent>
					<ToolbarSearch
						persistent
						value={localSearch}
						placeholder="Search name or email"
						on:input={(e) => {
							localSearch = (e.target as HTMLInputElement | null)?.value ?? "";
						}}
						on:clear={() => {
							localSearch = "";
							applyFilters("", localRole);
						}}
						on:keydown={(e: KeyboardEvent) => {
							if (e.key === "Enter") applyFilters(localSearch, localRole);
						}}
					/>
					<div class="rk-role-filter">
						<Select
							hideLabel
							labelText="Role"
							size="sm"
							value={localRole}
							on:change={(e) => {
								localRole = (e.target as HTMLSelectElement | null)?.value ?? "";
								applyFilters(localSearch, localRole);
							}}
						>
							<SelectItem value="" text="All roles" />
							<SelectItem value="admin" text="Admin" />
							<SelectItem value="editor" text="Editor" />
							<SelectItem value="user" text="User" />
						</Select>
					</div>
					{#if searchTerm || roleFilter}
						<Button kind="ghost" size="small" href={`${basePath}/users`}>Reset</Button>
					{/if}
				</ToolbarContent>
			</Toolbar>
			<svelte:fragment slot="cell" let:row let:cell>
				{#if cell.key === "name"}
					<a href={`${basePath}/users/${row.id}`} class="rk-table-link">{cell.value}</a>
				{:else if cell.key === "role"}
					<Tag size="sm" type={cell.value === "admin" ? "blue" : cell.value === "editor" ? "teal" : "gray"}>
						{cell.value}
					</Tag>
				{:else if cell.key === "status"}
					<Tag size="sm" type={cell.value === "Banned" ? "red" : cell.value === "Verified" ? "green" : "outline"}>
						{cell.value}
					</Tag>
				{:else if cell.key === "actions"}
					<a href={`${basePath}/users/${row.id}`} class="rk-table-link" aria-label={`Open ${row.name || row.id}`}>Open</a>
				{:else}
					{cell.value}
				{/if}
			</svelte:fragment>
		</DataTable>

		{#if totalPages > 1}
			<Pagination
				totalItems={totalUsers}
				pageSize={limit}
				page={page}
				pageSizes={[10, 20, 50]}
				on:change={(event: CustomEvent<{ page?: number; pageSize?: number }>) => {
					const nextPage = event.detail.page ?? page;
					const nextLimit = event.detail.pageSize ?? limit;
					goto(usersHref(nextPage, nextLimit));
				}}
			/>
		{/if}
	</div>
</section>

<style>
	@import "./page-layout.css";

	/* Sticky header */
	.rk-page-header--sticky {
		position: sticky;
		top: 0;
		z-index: 200;
	}

	.rk-page-header :global(h1) {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 300;
		line-height: 1.2;
	}

	/* Toolbar row */
	.rk-toolbar-row {
		margin-top: var(--cds-spacing-04);
		border-top: 1px solid var(--cds-border-subtle);
	}

	.rk-toolbar-row :global(.bx--table-toolbar) {
		background: transparent;
		min-height: 3rem;
	}

	.rk-toolbar-row :global(.bx--toolbar-content) {
		padding: var(--cds-spacing-03) 0;
	}

	.rk-page-title-row {
		margin-top: var(--cds-spacing-04);
	}

	/* Role filter inside DataTable toolbar */
	.rk-role-filter {
		display: flex;
		align-items: center;
	}

	.rk-role-filter :global(.bx--select) {
		min-width: 10rem;
	}

	.rk-table-link {
		color: var(--cds-link-primary);
		text-decoration: none;
		font-weight: 600;
	}

	.rk-table-link:hover {
		text-decoration: underline;
	}
</style>
