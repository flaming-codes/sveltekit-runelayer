<script lang="ts">
	import type { Snippet } from "svelte";
	import type { CollectionConfig } from "../../schema/collections.js";
	import type { GlobalConfig } from "../../schema/globals.js";

	type AdminUiConfig = {
		theme?: "white" | "g10" | "g80" | "g90" | "g100";
		appName?: string;
		productName?: string;
		footerText?: string;
	};

	let {
		collections = [],
		globals = [],
		user = null,
		basePath = "/admin",
		ui = {},
		children,
	}: {
		collections?: CollectionConfig[];
		globals?: GlobalConfig[];
		user?: { email: string } | null;
		basePath?: string;
		ui?: AdminUiConfig;
		children: Snippet;
	} = $props();

	let appName = $derived(ui.appName ?? "Runelayer");
	let productName = $derived(ui.productName ?? "CMS");
	let footerText = $derived(ui.footerText ?? "Powered by Runelayer");
	let theme = $derived(ui.theme ?? "g100");

	$effect(() => {
		if (typeof document === "undefined") {
			return;
		}

		const root = document.documentElement;
		const previousTheme = root.getAttribute("theme");

		root.setAttribute("theme", theme);

		return () => {
			if (previousTheme === null) {
				root.removeAttribute("theme");
				return;
			}

			root.setAttribute("theme", previousTheme);
		};
	});
</script>

<div class={`rk-shell rk-theme-${theme}`}>
	<header class="rk-shell-header">
		<div class="rk-shell-brand">
			<a href={basePath}>{appName}</a>
			<span>{productName}</span>
		</div>
		<nav class="rk-shell-topnav" aria-label="Admin sections">
			<a href={basePath}>Dashboard</a>
			{#if collections.length > 0}
				<a href={`${basePath}/collections/${collections[0].slug}`}>Collections</a>
			{/if}
			{#if globals.length > 0}
				<a href={`${basePath}/globals/${globals[0].slug}`}>Globals</a>
			{/if}
		</nav>
		{#if user}
			<div class="rk-shell-user">
				<span>{user.email}</span>
				<form method="POST" action={`${basePath}/logout`}>
					<button type="submit">Logout</button>
				</form>
			</div>
		{/if}
	</header>

	<div class="rk-shell-body">
		<aside class="rk-shell-sidebar" aria-label="Admin navigation">
			<a href={basePath}>Dashboard</a>
			{#if collections.length > 0}
				<p class="rk-nav-heading">Collections</p>
				{#each collections as collection}
					<a href={`${basePath}/collections/${collection.slug}`}
						>{collection.labels?.plural ?? collection.slug}</a
					>
				{/each}
			{/if}
			{#if globals.length > 0}
				<p class="rk-nav-heading">Globals</p>
				{#each globals as global}
					<a href={`${basePath}/globals/${global.slug}`}>{global.label ?? global.slug}</a>
				{/each}
			{/if}
		</aside>

		<main class="rk-shell-content" id="main-content">
			<div class="rk-grid">
				{@render children()}
			</div>
			<footer class="rk-shell-footer">{footerText}</footer>
		</main>
	</div>
</div>

<style>
	.rk-shell {
		min-height: 100vh;
		background: var(--cds-layer-01, #161616);
		color: var(--cds-text-primary, #f4f4f4);
	}

	.rk-theme-white,
	.rk-theme-g10 {
		background: var(--cds-layer-01, #f4f4f4);
		color: var(--cds-text-primary, #161616);
	}

	.rk-shell-header {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--cds-border-subtle, #393939);
	}

	.rk-shell-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
	}

	.rk-shell-brand a {
		color: inherit;
		text-decoration: none;
	}

	.rk-shell-brand span {
		font-size: 0.875rem;
		opacity: 0.75;
	}

	.rk-shell-topnav {
		display: flex;
		gap: 0.75rem;
	}

	.rk-shell-topnav a,
	.rk-shell-sidebar a {
		color: inherit;
		text-decoration: none;
		padding: 0.35rem 0.5rem;
		border-radius: 4px;
	}

	.rk-shell-topnav a:hover,
	.rk-shell-sidebar a:hover {
		background: var(--cds-layer-hover-01, rgba(141, 141, 141, 0.2));
	}

	.rk-shell-user {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
	}

	.rk-shell-user button {
		padding: 0.45rem 0.75rem;
		border: 1px solid var(--cds-border-subtle, #6f6f6f);
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	.rk-shell-body {
		display: grid;
		grid-template-columns: 250px minmax(0, 1fr);
		min-height: calc(100vh - 61px);
	}

	.rk-shell-sidebar {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
		border-right: 1px solid var(--cds-border-subtle, #393939);
	}

	.rk-nav-heading {
		margin: 0.75rem 0 0.25rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.7;
	}

	.rk-shell-content {
		padding: 1rem;
	}

	.rk-grid {
		display: grid;
		grid-template-columns: repeat(16, minmax(0, 1fr));
		gap: 1rem;
	}

	.rk-grid > :global(*) {
		grid-column: 1 / -1;
	}

	.rk-shell-footer {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid var(--cds-border-subtle, #393939);
		font-size: 0.875rem;
		opacity: 0.8;
	}

	@media (max-width: 1024px) {
		.rk-shell-body {
			grid-template-columns: 1fr;
		}

		.rk-shell-sidebar {
			border-right: 0;
			border-bottom: 1px solid var(--cds-border-subtle, #393939);
		}
	}
</style>
