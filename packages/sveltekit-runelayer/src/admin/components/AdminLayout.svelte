<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { CollectionConfig } from '../../schema/collections.js';
	import type { GlobalConfig } from '../../schema/globals.js';

	let { collections = [], globals = [], user = null, basePath = '/admin', children }: {
		collections?: CollectionConfig[];
		globals?: GlobalConfig[];
		user?: { email: string } | null;
		basePath?: string;
		children: Snippet;
	} = $props();
</script>

<div class="rk-admin">
	<nav class="rk-sidebar">
		<div class="rk-sidebar-brand"><a href={basePath}>Runekit</a></div>
		<ul>
			<li><a href={basePath}>Dashboard</a></li>
			{#if collections.length}
				<li class="rk-nav-heading">Collections</li>
				{#each collections as c}
					<li><a href="{basePath}/collections/{c.slug}">{c.labels?.plural ?? c.slug}</a></li>
				{/each}
			{/if}
			{#if globals.length}
				<li class="rk-nav-heading">Globals</li>
				{#each globals as g}
					<li><a href="{basePath}/globals/{g.slug}">{g.label ?? g.slug}</a></li>
				{/each}
			{/if}
		</ul>
	</nav>
	<div class="rk-main">
		<header class="rk-topbar">
			<span>{user?.email ?? ''}</span>
			{#if user}
				<form method="POST" action="{basePath}/logout" style="display:inline">
					<button type="submit">Logout</button>
				</form>
			{/if}
		</header>
		<main class="rk-content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.rk-admin { display: flex; min-height: 100vh; font-family: system-ui, sans-serif; }
	.rk-sidebar { width: 220px; background: #1a1a2e; color: #eee; padding: 1rem 0; }
	.rk-sidebar-brand { padding: 0 1rem 1rem; font-weight: bold; font-size: 1.2rem; }
	.rk-sidebar-brand a { color: #eee; text-decoration: none; }
	.rk-sidebar ul { list-style: none; margin: 0; padding: 0; }
	.rk-sidebar li a { display: block; padding: 0.4rem 1rem; color: #ccc; text-decoration: none; }
	.rk-sidebar li a:hover { background: #16213e; color: #fff; }
	.rk-nav-heading { padding: 0.8rem 1rem 0.2rem; font-size: 0.75rem; text-transform: uppercase; color: #888; }
	.rk-main { flex: 1; display: flex; flex-direction: column; }
	.rk-topbar { display: flex; justify-content: flex-end; align-items: center; gap: 1rem; padding: 0.5rem 1rem; background: #f5f5f5; border-bottom: 1px solid #ddd; }
	.rk-content { padding: 1.5rem; }
</style>
