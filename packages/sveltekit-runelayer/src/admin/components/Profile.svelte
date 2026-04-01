<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Column,
		Grid,
		Row,
		Tag,
		Tile,
	} from "carbon-components-svelte";
	import { Logout, UserAvatar } from "carbon-icons-svelte";

	let {
		user = null,
		basePath = "/admin",
	}: {
		user?: { email: string; role: string; name: string; image: string | null } | null;
		basePath?: string;
	} = $props();

	let displayName = $derived(user?.name || user?.email || "Unknown");
</script>

<div class="rk-page">
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/profile`} isCurrentPage>Profile</BreadcrumbItem>
			</Breadcrumb>
			<div class="rk-page-title-row">
				<div>
					<p class="rk-eyebrow">Account</p>
					<h1>Profile</h1>
				</div>
			</div>
		</div>
	</div>

	<div class="rk-page-body">
		{#if user}
			<Grid condensed fullWidth>
				<Row>
					<Column sm={4} md={4} lg={6}>
						<Tile class="rk-profile-card">
							<div class="rk-profile-avatar">
								{#if user.image}
									<img src={user.image} alt={displayName} class="rk-avatar-img" />
								{:else}
									<div class="rk-avatar-placeholder">
										<UserAvatar size={32} />
									</div>
								{/if}
							</div>

							<div class="rk-profile-info">
								<p class="rk-profile-label">Name</p>
								<p class="rk-profile-value">{displayName}</p>
							</div>

							<div class="rk-profile-info">
								<p class="rk-profile-label">Email</p>
								<p class="rk-profile-value">{user.email}</p>
							</div>

							<div class="rk-profile-info">
								<p class="rk-profile-label">Role</p>
								<Tag size="sm" type={user.role === "admin" ? "blue" : user.role === "editor" ? "teal" : "cool-gray"}>
									{user.role}
								</Tag>
							</div>

							<div class="rk-profile-actions">
								<form method="POST" action={`${basePath}/logout?/logout`}>
									<Button type="submit" kind="danger-tertiary" icon={Logout}>
										Log out
									</Button>
								</form>
							</div>
						</Tile>
					</Column>
				</Row>
			</Grid>
		{:else}
			<Tile>
				<p>No user session found. You may need to log in.</p>
				<Button href={`${basePath}/login`} kind="primary">Log in</Button>
			</Tile>
		{/if}
	</div>
</div>

<style>
	@import "./page-layout.css";

	:global(.rk-page .bx--grid) {
		padding-inline: 0;
	}

	:global(.rk-page .bx--row) {
		margin-inline: 0;
	}

	:global(.rk-profile-card) {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-06);
		padding: var(--cds-spacing-06);
	}

	.rk-profile-avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 4rem;
		height: 4rem;
		border-radius: 50%;
		overflow: hidden;
		background: var(--cds-layer-02);
		color: var(--cds-icon-secondary);
	}

	.rk-avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.rk-avatar-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.rk-profile-info {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-02);
	}

	.rk-profile-label {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.34;
		letter-spacing: 0.32px;
		text-transform: uppercase;
		color: var(--cds-text-secondary);
	}

	.rk-profile-value {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.43;
		color: var(--cds-text-primary);
	}

	.rk-profile-actions {
		padding-top: var(--cds-spacing-05);
		border-top: 1px solid var(--cds-border-subtle);
	}

</style>
