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
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/users`}>Users</BreadcrumbItem>
				<BreadcrumbItem href={isNew ? `${basePath}/users/create` : `${basePath}/users/${managedUser?.id}`} isCurrentPage>
					{title}
				</BreadcrumbItem>
			</Breadcrumb>
			<div class="rk-page-title-row">
				<div>
					<p class="rk-eyebrow">Access</p>
					<h1>{title}</h1>
				</div>
				<Tag type={isNew ? "blue" : "green"}>{isNew ? "New" : "Existing"}</Tag>
			</div>
		</div>
	</div>

	<div class="rk-page-body">
		<form method="POST" action={actionName} class="rk-form">
			<Grid fullWidth condensed>
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
							<h2 class="rk-sidebar-title">{managedUser?.name ?? "New user"}</h2>
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
									<Button
										type="submit"
										kind="danger"
										formaction="?/deleteUser"
										on:click={(e) => {
											if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
												e.preventDefault();
											}
										}}
									>Delete user</Button>
								{/if}
							</div>
						</Tile>
					</Column>
				</Row>
			</Grid>
		</form>
	</div>
</section>

<style>
	.rk-page-header {
		background: var(--cds-ui-background);
		border-bottom: 1px solid var(--cds-border-subtle);
		padding: var(--cds-spacing-06) var(--cds-spacing-06) var(--cds-spacing-05);
	}

	.rk-page-header-inner {
		max-width: 90rem;
		margin: 0 auto;
	}

	.rk-page-title-row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--cds-spacing-05);
		margin-top: var(--cds-spacing-04);
	}

	.rk-eyebrow {
		margin: 0;
		font-size: 0.75rem;
		letter-spacing: 0.32px;
		text-transform: uppercase;
		color: var(--cds-text-secondary);
	}

	.rk-page-title-row h1 {
		margin: var(--cds-spacing-02) 0 0;
		font-size: 1.75rem;
		font-weight: 300;
		line-height: 1.2;
	}

	.rk-page-body {
		max-width: 90rem;
		margin: 0 auto;
		padding: var(--cds-spacing-05) var(--cds-spacing-06) var(--cds-spacing-07);
	}

	.rk-form {
		width: 100%;
	}

	:global(.rk-editor-tile),
	:global(.rk-sidebar-tile) {
		height: 100%;
	}

	.rk-fields {
		display: grid;
		gap: var(--cds-spacing-05);
	}

	.rk-sidebar-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.rk-meta-list {
		display: grid;
		gap: var(--cds-spacing-04);
		margin: var(--cds-spacing-06) 0;
	}

	.rk-meta-list div {
		padding-top: var(--cds-spacing-04);
		border-top: 1px solid var(--cds-border-subtle);
	}

	.rk-meta-list dt {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.32px;
		color: var(--cds-text-secondary);
	}

	.rk-meta-list dd {
		margin: var(--cds-spacing-02) 0 0;
		word-break: break-word;
	}

	.rk-actions {
		display: grid;
		gap: var(--cds-spacing-03);
	}

	@media (max-width: 672px) {
		.rk-page-header {
			padding: var(--cds-spacing-05) var(--cds-spacing-05) var(--cds-spacing-04);
		}

		.rk-page-body {
			padding-inline: var(--cds-spacing-05);
		}
	}
</style>
