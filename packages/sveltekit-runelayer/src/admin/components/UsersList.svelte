<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		DataTable,
		Pagination,
		Select,
		SelectItem,
		Tag,
		TextInput,
		Toolbar,
		ToolbarContent,
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
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/users`} isCurrentPage>Users</BreadcrumbItem>
			</Breadcrumb>
			<div class="rk-page-title-row">
				<div>
					<p class="rk-eyebrow">Access</p>
					<h1>{totalUsers} Users</h1>
				</div>
				<Button href={`${basePath}/users/create`}>Create user</Button>
			</div>
		</div>
	</div>

	<div class="rk-page-body">
		<form method="GET" action={`${basePath}/users`} class="rk-toolbar-filters">
			<div class="rk-filter-fields">
				<TextInput
					name="q"
					size="sm"
					labelText=""
					hideLabel
					placeholder="Search name or email"
					value={searchTerm}
				/>
				<Select name="role" size="sm" labelText="" hideLabel value={roleFilter}>
					<SelectItem value="" text="All roles" />
					<SelectItem value="admin" text="Admin" />
					<SelectItem value="editor" text="Editor" />
					<SelectItem value="user" text="User" />
				</Select>
				<Button type="submit" size="small" kind="primary">Apply</Button>
				{#if searchTerm || roleFilter}
					<Button size="small" kind="ghost" href={`${basePath}/users`}>Reset</Button>
				{/if}
			</div>
		</form>

		<DataTable {headers} rows={rows} sortable size="short">
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

	.rk-toolbar-filters {
		margin-bottom: var(--cds-spacing-05);
	}

	.rk-filter-fields {
		display: flex;
		align-items: flex-end;
		gap: var(--cds-spacing-03);
		flex-wrap: wrap;
	}

	.rk-table-link {
		color: var(--cds-link-primary);
		text-decoration: none;
		font-weight: 600;
	}

	.rk-table-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 672px) {
		.rk-filter-fields {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
