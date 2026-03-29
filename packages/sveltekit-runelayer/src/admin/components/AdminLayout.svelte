<script lang="ts">
	import {
		Content,
		Header,
		HeaderAction,
		HeaderNav,
		HeaderNavItem,
		HeaderNavMenu,
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
	import { Dashboard, Folders, Settings, UserAvatar } from "carbon-icons-svelte";
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
		user?: { email: string } | null;
		basePath?: string;
		currentPath?: string;
		ui?: AdminUiConfig;
		children: Snippet;
	} = $props();

	let isSideNavOpen = $state(false);
	let isUserMenuOpen = $state(false);

	let appName = $derived(ui.appName ?? "Runelayer");
	let productName = $derived(ui.productName ?? "CMS");
	let footerText = $derived(ui.footerText ?? "Powered by Runelayer");
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

			<HeaderNav aria-label="Admin sections">
				<HeaderNavItem href={basePath} text="Dashboard" isSelected={isDashboardActive()} />
				{#if collections.length > 0}
					<HeaderNavMenu text="Collections" expanded={collectionSectionOpen}>
						{#each collections as collection}
							<HeaderNavItem
								href={`${basePath}/collections/${collection.slug}`}
								text={collection.labels?.plural ?? collection.slug}
								isSelected={isCollectionActive(collection.slug)}
							/>
						{/each}
					</HeaderNavMenu>
				{/if}
				{#if globals.length > 0}
					<HeaderNavMenu text="Globals" expanded={globalSectionOpen}>
						{#each globals as global}
							<HeaderNavItem
								href={`${basePath}/globals/${global.slug}`}
								text={global.label ?? global.slug}
								isSelected={isGlobalActive(global.slug)}
							/>
						{/each}
					</HeaderNavMenu>
				{/if}
			</HeaderNav>

			{#if user}
				<HeaderUtilities>
					<HeaderAction
						icon={UserAvatar}
						text={user.email}
						bind:isOpen={isUserMenuOpen}
						iconDescription="Account menu"
					>
						<div class="rk-user-panel">
							<p class="rk-user-panel-label">Signed in</p>
							<p class="rk-user-panel-email">{user.email}</p>
							<form method="POST" action={`${basePath}/logout`}>
								<button class="rk-user-panel-button" type="submit">Log out</button>
							</form>
						</div>
					</HeaderAction>
				</HeaderUtilities>
			{/if}
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
				<SideNavDivider />
			</SideNavItems>
		</SideNav>

		<Content id="main-content" class="rk-shell-content">
			<div class="rk-grid">
				{@render children()}
			</div>
			<footer class="rk-shell-footer">{footerText}</footer>
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
		padding: 0 0 2rem;
	}

	.rk-grid {
		display: grid;
		grid-template-columns: repeat(16, minmax(0, 1fr));
		gap: 1rem;
		padding: 2rem 1.5rem 0;
		max-width: 90rem;
		margin: 0 auto;
	}

	.rk-grid > :global(*) {
		grid-column: 1 / -1;
	}

	.rk-user-panel {
		display: grid;
		gap: 0.5rem;
		padding: 1rem;
		min-width: 16rem;
		background: var(--cds-layer);
		border-left: 1px solid var(--cds-border-subtle);
	}

	.rk-user-panel-label {
		margin: 0;
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.rk-user-panel-email {
		margin: 0;
		font-size: 0.875rem;
		word-break: break-word;
	}

	.rk-user-panel-button {
		width: 100%;
		padding: 0.875rem 1rem;
		border: 0;
		background: var(--cds-button-secondary);
		color: var(--cds-text-on-color);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.rk-user-panel-button:hover {
		background: var(--cds-button-secondary-hover);
	}

	.rk-shell-footer {
		max-width: 90rem;
		margin: 2rem auto 0;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--cds-border-subtle);
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	:global(.rk-shell .bx--side-nav) {
		border-right: 1px solid var(--cds-border-subtle);
	}

	:global(.rk-shell .bx--header__global) {
		align-items: stretch;
	}

	:global(.rk-shell .bx--header__menu-bar) {
		padding-left: 1rem;
	}

	:global(.rk-shell .bx--header-panel) {
		width: auto;
	}

	@media (max-width: 1024px) {
		.rk-grid {
			padding: 1.5rem 1rem 0;
		}

		.rk-shell-footer {
			padding-inline: 1rem;
		}
	}
</style>
