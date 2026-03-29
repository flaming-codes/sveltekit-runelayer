<script lang="ts">
	import type { GlobalConfig } from "../../schema/globals.js";
	import FieldRenderer from "./fields/FieldRenderer.svelte";

	let { global, document = {}, basePath = "/admin" }: {
		global: GlobalConfig;
		document?: Record<string, any>;
		basePath?: string;
	} = $props();

	let values = $state<Record<string, any>>({});
	$effect(() => {
		values = document ? { ...document } : {};
	});

	let label = $derived(global.label ?? global.slug);
</script>

<section class="rk-page">
	<h1>{label}</h1>
	<p class="rk-subtitle">Global singleton configuration</p>

	<form method="POST" action="?/update" class="rk-form">
		<input type="hidden" name="id" value={document?.id ?? global.slug} />

		<div class="rk-fields">
			{#each global.fields as field}
				<div><FieldRenderer {field} bind:values /></div>
			{/each}
		</div>

		<div class="rk-actions">
			<button class="rk-btn rk-btn-primary" type="submit">Save Global</button>
			<a class="rk-btn rk-btn-secondary" href={basePath}>Back to dashboard</a>
		</div>
	</form>
</section>

<style>
	.rk-page {
		grid-column: 1 / -1;
	}

	.rk-subtitle {
		margin: 0.5rem 0 1rem;
		color: var(--cds-text-secondary, #c6c6c6);
	}

	.rk-form {
		max-width: 920px;
	}

	.rk-fields {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin: 1rem 0 1.25rem;
	}

	.rk-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.rk-btn {
		padding: 0.6rem 1rem;
		border: 1px solid transparent;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		font: inherit;
	}

	.rk-btn-primary {
		background: var(--cds-button-primary, #0f62fe);
		color: #fff;
	}

	.rk-btn-secondary {
		border-color: var(--cds-border-subtle, #6f6f6f);
	}
</style>
