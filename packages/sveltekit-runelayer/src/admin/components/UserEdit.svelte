<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Column,
		Grid,
		Row,
		Select,
		SelectItem,
		Tag,
		TextInput,
		Tile,
	} from "carbon-components-svelte";

	type ManagedUser = {
		id: string;
		name: string;
		email: string;
		role: string;
		image: string | null;
		emailVerified: boolean;
		banned?: boolean | null;
		banReason?: string | null;
		banExpires?: string | null;
	};

	let {
		managedUser = null,
		roles = ["admin", "editor", "user"],
		basePath = "/admin",
	}: {
		managedUser?: ManagedUser | null;
		roles?: string[];
		basePath?: string;
	} = $props();

	let isNew = $derived(!managedUser?.id);
	let title = $derived(isNew ? "Create user" : "Edit user");
	let actionName = $derived(isNew ? "?/createUser" : "?/updateUser");
	let role = $state("user");

	$effect(() => {
		role = managedUser?.role ?? "user";
	});
</script>

<section class="rk-page">
	<form method="POST" action={actionName} class="rk-form">
		<Grid fullWidth condensed>
			<Row>
				<Column sm={4} md={8} lg={12}>
					<Breadcrumb noTrailingSlash>
						<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
						<BreadcrumbItem href={`${basePath}/users`}>Users</BreadcrumbItem>
						<BreadcrumbItem href={isNew ? `${basePath}/users/create` : `${basePath}/users/${managedUser?.id}`} isCurrentPage>
							{title}
						</BreadcrumbItem>
					</Breadcrumb>
					<div class="rk-page-header">
						<p class="rk-eyebrow">Access</p>
						<h1>{title}</h1>
						<p class="rk-description">Manage account identity, role assignment, and password access.</p>
					</div>
				</Column>
				<Column sm={4} md={8} lg={4} class="rk-header-actions">
					<Tag type={isNew ? "blue" : "green"}>{isNew ? "New account" : "Existing account"}</Tag>
				</Column>
			</Row>

			<Row>
				<Column sm={4} md={8} lg={11}>
					<Tile class="rk-editor-tile">
						<div class="rk-fields">
							<TextInput
								name="name"
								labelText="Name"
								placeholder="Jane Doe"
								value={managedUser?.name ?? ""}
								required
							/>
							<TextInput
								name="email"
								type="email"
								labelText="Email"
								placeholder="jane@example.com"
								value={managedUser?.email ?? ""}
								required
							/>
							<Select name="role" labelText="Role" bind:value={role}>
								{#each roles as roleOption}
									<SelectItem value={roleOption} text={roleOption} />
								{/each}
							</Select>
							<TextInput
								name="password"
								type="password"
								labelText={isNew ? "Password" : "New password"}
								placeholder={isNew ? "Required" : "Leave blank to keep existing password"}
								required={isNew}
							/>
						</div>
					</Tile>
				</Column>
				<Column sm={4} md={8} lg={5}>
					<Tile class="rk-sidebar-tile">
						<p class="rk-eyebrow">Account details</p>
						<h2>{managedUser?.name ?? "New user"}</h2>
						<dl class="rk-meta-list">
							<div>
								<dt>Status</dt>
								<dd>{managedUser?.banned ? "Banned" : managedUser?.emailVerified ? "Verified" : "Pending"}</dd>
							</div>
							<div>
								<dt>User ID</dt>
								<dd>{managedUser?.id ?? "Assigned after creation"}</dd>
							</div>
							<div>
								<dt>Role</dt>
								<dd>{role}</dd>
							</div>
						</dl>
						<div class="rk-actions">
							<Button type="submit">{isNew ? "Create user" : "Save changes"}</Button>
							<Button kind="secondary" href={`${basePath}/users`}>Back to users</Button>
							{#if !isNew}
								<Button type="submit" kind="danger" formaction="?/deleteUser">Delete user</Button>
							{/if}
						</div>
					</Tile>
				</Column>
			</Row>
		</Grid>
	</form>
</section>

<style>
	.rk-page {
		grid-column: 1 / -1;
	}

	.rk-form {
		width: 100%;
	}

	.rk-page-header {
		margin: 1rem 0 2rem;
	}

	:global(.rk-header-actions) {
		display: flex;
		justify-content: flex-end;
		align-items: flex-end;
	}

	.rk-eyebrow {
		margin: 0;
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--cds-text-secondary);
	}

	.rk-page-header h1,
	:global(.rk-sidebar-tile) h2 {
		margin: 0.5rem 0 0;
		font-size: clamp(2rem, 3vw, 3rem);
		font-weight: 300;
	}

	.rk-description {
		margin: 0.75rem 0 0;
		color: var(--cds-text-secondary);
	}

	:global(.rk-editor-tile),
	:global(.rk-sidebar-tile) {
		height: 100%;
	}

	.rk-fields {
		display: grid;
		gap: 1rem;
	}

	.rk-meta-list {
		display: grid;
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.rk-meta-list div {
		padding-top: 0.75rem;
		border-top: 1px solid var(--cds-border-subtle);
	}

	.rk-meta-list dt {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--cds-text-secondary);
	}

	.rk-meta-list dd {
		margin: 0.35rem 0 0;
		word-break: break-word;
	}

	.rk-actions {
		display: grid;
		gap: 0.75rem;
	}

	@media (max-width: 1055px) {
		:global(.rk-header-actions) {
			justify-content: flex-start;
		}
	}
</style>
