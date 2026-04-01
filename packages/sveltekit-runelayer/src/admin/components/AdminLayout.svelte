<script lang="ts">
	import {
		Content,
		Header,
		HeaderAction,
		HeaderUtilities,
		SideNav,
		SideNavDivider,
		SideNavItems,
		SideNavLink,
		SideNavMenu,
		SideNavMenuItem,
		SkipToContent,
		Theme,
	} from "carbon-components-svelte";
	import { Dashboard, Folders, Login, Logout, Settings, UserAvatar } from "carbon-icons-svelte";
	import type { Snippet } from "svelte";
	import type { CollectionConfig } from "../../schema/collections.js";
	import type { GlobalConfig } from "../../schema/globals.js";

	type AdminUiConfig = {
		appName?: string;
		productName?: string;
		footerText?: string;
	};

	let {
		collections = [],
		globals = [],
		user = null,
		basePath = "/admin",
		currentPath = "/admin",
		ui = {},
		children,
	}: {
		collections?: CollectionConfig[];
		globals?: GlobalConfig[];
		user?: { email: string; role?: string; name?: string; image?: string | null } | null;
		basePath?: string;
		currentPath?: string;
		ui?: AdminUiConfig;
		children: Snippet;
	} = $props();

	let isSideNavOpen = $state(false);
	let isUserMenuOpen = $state(false);

	let appName = $derived(ui.appName ?? "Runelayer");
	let productName = $derived(ui.productName ?? "CMS");
	let normalizedBasePath = $derived(basePath.endsWith("/") ? basePath.slice(0, -1) : basePath);
	let normalizedCurrentPath = $derived(
		currentPath.endsWith("/") && currentPath.length > 1
			? currentPath.slice(0, -1)
			: currentPath,
	);
	let collectionSectionOpen = $derived(
		collections.some((collection) =>
			normalizedCurrentPath.startsWith(`${normalizedBasePath}/collections/${collection.slug}`),
		),
	);
	let globalSectionOpen = $derived(
		globals.some((global) => normalizedCurrentPath === `${normalizedBasePath}/globals/${global.slug}`),
	);

	function isDashboardActive() {
		return normalizedCurrentPath === normalizedBasePath;
	}

	function isCollectionActive(slug: string) {
		return normalizedCurrentPath.startsWith(`${normalizedBasePath}/collections/${slug}`);
	}

	function isGlobalActive(slug: string) {
		return normalizedCurrentPath === `${normalizedBasePath}/globals/${slug}`;
	}

	function isUsersActive() {
		return normalizedCurrentPath.startsWith(`${normalizedBasePath}/users`);
	}

</script>

	<Theme theme="g10">
	<div class="rk-shell" data-admin-theme="g10">
		<Header
				href={basePath}
				companyName={appName}
				platformName={productName}
				bind:isSideNavOpen
				uiShellAriaLabel={`${appName} ${productName}`}
			>
				<svelte:fragment slot="skipToContent">
					<SkipToContent />
				</svelte:fragment>

				<HeaderUtilities>
				<HeaderAction
					icon={UserAvatar}
					text={user ? (user.name || user.email) : "Account"}
					bind:isOpen={isUserMenuOpen}
					iconDescription="Account menu"
				>
					<div class="rk-user-panel">
						{#if user}
							<div class="rk-user-panel-header">
								<p class="rk-user-panel-label">Signed in as</p>
								{#if user.name}
									<p class="rk-user-panel-name">{user.name}</p>
								{/if}
								<p class="rk-user-panel-email">{user.email}</p>
								{#if user.role}
									<p class="rk-user-panel-role">{user.role}</p>
								{/if}
							</div>
							<div class="rk-user-panel-nav" role="menu" aria-label="User actions">
								<a href={`${basePath}/profile`} class="rk-user-panel-link" role="menuitem">
									<UserAvatar size={16} />
									Profile
								</a>
								<form method="POST" action={`${basePath}/logout?/logout`}>
									<button class="rk-user-panel-link rk-user-panel-link--danger" type="submit" role="menuitem">
										<Logout size={16} />
										Log out
									</button>
								</form>
							</div>
						{:else}
							<div class="rk-user-panel-header">
								<p class="rk-user-panel-label">Not signed in</p>
								<p class="rk-user-panel-email">Sign in to manage your account.</p>
							</div>
							<div class="rk-user-panel-nav" role="menu" aria-label="User actions">
								<a href={`${basePath}/login`} class="rk-user-panel-link" role="menuitem">
									<Login size={16} />
									Log in
								</a>
							</div>
						{/if}
					</div>
				</HeaderAction>
			</HeaderUtilities>
			</Header>

		<SideNav bind:isOpen={isSideNavOpen} aria-label="Admin navigation" fixed={false}>
			<SideNavItems>
				<SideNavLink
					href={basePath}
					text="Dashboard"
					icon={Dashboard}
					isSelected={isDashboardActive()}
				/>
				{#if collections.length > 0}
					<SideNavMenu text="Collections" icon={Folders} expanded={collectionSectionOpen}>
						{#each collections as collection}
							<SideNavMenuItem
								href={`${basePath}/collections/${collection.slug}`}
								text={collection.labels?.plural ?? collection.slug}
								isSelected={isCollectionActive(collection.slug)}
							/>
						{/each}
					</SideNavMenu>
				{/if}
				{#if globals.length > 0}
					<SideNavMenu text="Globals" icon={Settings} expanded={globalSectionOpen}>
						{#each globals as global}
							<SideNavMenuItem
								href={`${basePath}/globals/${global.slug}`}
								text={global.label ?? global.slug}
								isSelected={isGlobalActive(global.slug)}
							/>
						{/each}
					</SideNavMenu>
				{/if}
				<SideNavLink
					href={`${basePath}/users`}
					text="Users"
					icon={UserAvatar}
					isSelected={isUsersActive()}
				/>
				<SideNavDivider />
			</SideNavItems>
		</SideNav>

		<Content id="main-content" class="rk-shell-content">
			{@render children()}
		</Content>
	</div>
</Theme>

<style>
	.rk-shell {
		min-height: 100vh;
		background: var(--cds-layer-01);
		color: var(--cds-text-primary);
	}

	:global(.rk-shell-content) {
		padding: 0;
	}

	.rk-user-panel {
		min-width: 16rem;
		background: var(--cds-layer);
		border-left: 1px solid var(--cds-border-subtle);
	}

	.rk-user-panel-header {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 1rem;
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.rk-user-panel-label {
		margin: 0;
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.32px;
	}

	.rk-user-panel-name {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--cds-text-primary);
	}

	.rk-user-panel-email {
		margin: 0;
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
		word-break: break-word;
	}

	.rk-user-panel-role {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		text-transform: capitalize;
	}

	.rk-user-panel-nav {
		display: flex;
		flex-direction: column;
	}

	.rk-user-panel-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.875rem 1rem;
		border: 0;
		background: transparent;
		color: var(--cds-text-primary);
		font: inherit;
		font-size: 0.875rem;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
		transition: background-color 110ms;
	}

	.rk-user-panel-link:hover {
		background: var(--cds-layer-hover);
	}

	.rk-user-panel-link--danger {
		color: var(--cds-support-error);
	}

	.rk-user-panel-link--danger:hover {
		background: var(--cds-support-error);
		color: var(--cds-text-on-color);
	}

	:global(.rk-shell .bx--side-nav) {
		border-right: 1px solid var(--cds-border-subtle);
	}

	:global(.rk-shell .bx--header__global) {
		align-items: stretch;
	}

:global(.rk-shell .bx--header-panel) {
		width: auto;
	}

</style>
