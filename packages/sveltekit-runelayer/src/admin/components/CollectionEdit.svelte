<script lang="ts">
	import type { CollectionConfig } from "../../schema/collections.js";
	import FieldRenderer from "./fields/FieldRenderer.svelte";

	let { collection, document = null, basePath = "/admin" }: {
		collection: CollectionConfig;
		document?: Record<string, any> | null;
		basePath?: string;
	} = $props();

	let values = $state<Record<string, any>>({});
	$effect(() => {
		values = document ? { ...document } : {};
	});

	let isNew = $derived(!document?.id);
	let slug = $derived(collection.slug);
	let label = $derived(collection.labels?.singular ?? slug);
</script>

<section class="rk-page">
	<h1>{isNew ? `Create ${label}` : `Edit ${label}`}</h1>

	<form method="POST" action={isNew ? "?/create" : "?/update"} class="rk-form">
		{#if !isNew}
			<input type="hidden" name="id" value={document?.id} />
		{/if}

		<div class="rk-fields">
			{#each collection.fields as field}
				<div class="rk-field"><FieldRenderer {field} bind:values /></div>
			{/each}
		</div>

		<div class="rk-actions">
			<button class="rk-btn rk-btn-primary" type="submit">{isNew ? "Create" : "Save"}</button>
			<a class="rk-btn rk-btn-secondary" href={`${basePath}/collections/${slug}`}>Cancel</a>
			{#if !isNew}
				<button class="rk-btn rk-btn-danger" type="submit" formmethod="POST" formaction="?/delete"
					>Delete</button
				>
			{/if}
		</div>
	</form>
</section>

<style>
	.rk-page {
		grid-column: 1 / -1;
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

	.rk-btn-danger {
		border-color: var(--cds-support-error, #fa4d56);
		color: var(--cds-support-error, #fa4d56);
		background: transparent;
	}
</style>
