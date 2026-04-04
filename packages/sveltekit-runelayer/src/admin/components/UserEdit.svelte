<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Column,
		Grid,
		Heading,
		Modal,
		Row,
		Section,
		Select,
		SelectItem,
		Tag,
		TextInput,
		Tile,
		Toolbar,
		ToolbarContent,
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
	let formId = "user-edit-form";
	let role = $state("user");
	let lastUserId = $state<string | undefined>(undefined);
	let deleteModalOpen = $state(false);

	$effect(() => {
		const currentId = managedUser?.id;
		if (currentId !== lastUserId) {
			role = managedUser?.role ?? "user";
			lastUserId = currentId;
		}
	});
</script>

<section class="rk-page">
	<!-- Header (sticky) -->
	<div class="rk-page-header rk-page-header--sticky">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/users`}>Users</BreadcrumbItem>
				<BreadcrumbItem
					href={isNew ? `${basePath}/users/create` : `${basePath}/users/${managedUser?.id}`}
					isCurrentPage
				>
					{title}
				</BreadcrumbItem>
			</Breadcrumb>

			<div class="rk-page-title-row">
				<div class="rk-title-with-status">
					<Section>
						<Heading>{title}</Heading>
					</Section>
					<Tag type={isNew ? "blue" : "green"}>{isNew ? "New" : "Existing"}</Tag>
				</div>
			</div>

			<!-- Action toolbar -->
			<div class="rk-toolbar-row">
				<Toolbar>
					<ToolbarContent>
						<Button type="submit" form={formId}>
							{isNew ? "Create user" : "Save changes"}
						</Button>
						<Button kind="secondary" href={`${basePath}/users`}>Back to users</Button>
						{#if !isNew}
							<div class="rk-toolbar-spacer"></div>
							<Button kind="danger-ghost" on:click={() => { deleteModalOpen = true; }}>
								Delete user
							</Button>
						{/if}
					</ToolbarContent>
				</Toolbar>
			</div>
		</div>
	</div>

	<div class="rk-page-body">
		<form id={formId} method="POST" action={actionName} class="rk-form">
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
						</Tile>
					</Column>
				</Row>
			</Grid>
		</form>

		{#if !isNew}
			<form id="user-delete-form" method="POST" action="?/deleteUser">
				<input type="hidden" name="id" value={managedUser?.id} />
			</form>
			<Modal
				danger
				bind:open={deleteModalOpen}
				modalHeading="Delete user"
				primaryButtonText="Delete"
				secondaryButtonText="Cancel"
				on:click:button--secondary={() => { deleteModalOpen = false; }}
				on:submit={() => {
					const form = window.document.getElementById("user-delete-form");
					if (form instanceof HTMLFormElement) form.requestSubmit();
				}}
			>
				<p>Are you sure you want to delete this user? This action cannot be undone.</p>
			</Modal>
		{/if}
	</div>
</section>

<style>
	@import "./page-layout.css";
	@import "./editor-layout.css";

	/* Sticky header */
	.rk-page-header--sticky {
		position: sticky;
		top: 0;
		z-index: 200;
	}

	.rk-title-with-status {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-05);
		flex-wrap: wrap;
	}

	.rk-title-with-status :global(h1) {
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

	/* Spacer pushes delete to the right */
	.rk-toolbar-spacer {
		flex: 1;
	}

	:global(.rk-editor-tile),
	:global(.rk-sidebar-tile) {
		height: 100%;
	}
</style>
