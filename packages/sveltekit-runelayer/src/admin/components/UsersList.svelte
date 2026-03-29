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
		Select,
		SelectItem,
		Tag,
		TextInput,
		Tile,
	} from "carbon-components-svelte";
	import type { DataTableHeader } from "carbon-components-svelte/src/DataTable/DataTable.svelte";

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
		{ key: "actions", value: "Actions" },
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

	function usersHref(nextPage: number, nextLimit: number = limit) {
		const params = new URLSearchParams();
		if (searchTerm.trim().length > 0) {
			params.set("q", searchTerm.trim());
		}
		if (roleFilter.trim().length > 0) {
			params.set("role", roleFilter.trim().toLowerCase());
		}
		if (nextPage > 1) {
			params.set("page", String(nextPage));
		}
		if (nextLimit !== 20) {
			params.set("limit", String(nextLimit));
		}
		const query = params.toString();
		return `${basePath}/users${query ? `?${query}` : ""}`;
	}
</script>

<section class="rk-page">
	<Grid fullWidth condensed>
		<Row>
			<Column sm={4} md={8} lg={12}>
				<Breadcrumb noTrailingSlash>
					<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
					<BreadcrumbItem href={`${basePath}/users`} isCurrentPage>Users</BreadcrumbItem>
				</Breadcrumb>
				<div class="rk-page-header">
					<p class="rk-eyebrow">Access</p>
					<h1>Users</h1>
					<p class="rk-description">Manage admin and editor accounts, credentials, and access roles.</p>
				</div>
			</Column>
			<Column sm={4} md={8} lg={4} class="rk-page-action">
				<Button href={`${basePath}/users/create`}>Create user</Button>
			</Column>
		</Row>

		<Row>
			<Column sm={4} md={4} lg={4}>
				<Tile class="rk-summary-tile">
					<p class="rk-summary-label">Users</p>
					<p class="rk-summary-value">{totalUsers}</p>
					<Tag type="blue">Auth records</Tag>
				</Tile>
			</Column>
			<Column sm={4} md={4} lg={4}>
				<Tile class="rk-summary-tile">
					<p class="rk-summary-label">Visible</p>
					<p class="rk-summary-value">{users.length}</p>
					<p class="rk-summary-copy">Rows in the current page window.</p>
				</Tile>
			</Column>
			<Column sm={4} md={8} lg={8}>
				<Tile class="rk-summary-tile">
					<form method="GET" action={`${basePath}/users`} class="rk-filters">
						<TextInput
							name="q"
							labelText="Search"
							placeholder="Name or email"
							value={searchTerm}
						/>
						<Select name="role" labelText="Role" value={roleFilter}>
							<SelectItem value="" text="All roles" />
							<SelectItem value="admin" text="Admin" />
							<SelectItem value="editor" text="Editor" />
							<SelectItem value="user" text="User" />
						</Select>
						<div class="rk-filter-actions">
							<Button type="submit" kind="primary">Apply</Button>
							<Button kind="ghost" href={`${basePath}/users`}>Reset</Button>
						</div>
					</form>
				</Tile>
			</Column>
		</Row>

		<Row>
			<Column sm={4} md={8} lg={16}>
				<DataTable {headers} rows={rows} sortable>
					<svelte:fragment slot="cell" let:row let:cell>
						{#if cell.key === "name"}
							<a href={`${basePath}/users/${row.id}`} class="rk-table-link">{cell.value}</a>
						{:else if cell.key === "role"}
							<Tag type={cell.value === "admin" ? "blue" : cell.value === "editor" ? "teal" : "gray"}>
								{cell.value}
							</Tag>
						{:else if cell.key === "status"}
							<Tag type={cell.value === "Banned" ? "red" : "green"}>{cell.value}</Tag>
						{:else if cell.key === "actions"}
							<a href={`${basePath}/users/${row.id}`} class="rk-table-link">Open</a>
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
					<nav class="rk-pagination" aria-label="User pagination">
						<Pagination
							totalItems={totalUsers}
							pageSize={limit}
							page={page}
							pageSizes={[10, 20, 50]}
							on:change={(event: CustomEvent<{ page?: number; pageSize?: number }>) => {
								const nextPage = event.detail.page ?? page;
								const nextLimit = event.detail.pageSize ?? limit;
								window.location.assign(usersHref(nextPage, nextLimit));
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

	.rk-filters {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 0.75rem;
	}

	.rk-filter-actions {
		display: flex;
		gap: 0.75rem;
		grid-column: 1 / -1;
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

		.rk-filters {
			grid-template-columns: 1fr;
		}
	}
</style>
