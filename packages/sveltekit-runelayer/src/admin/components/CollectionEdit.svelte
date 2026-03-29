<script lang="ts">
	import type { CollectionConfig } from '../../schema/collections.js';
	import FieldRenderer from './fields/FieldRenderer.svelte';

	let { collection, document = null, basePath = '/admin' }: {
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

<h1>{isNew ? `Create ${label}` : `Edit ${label}`}</h1>

<form method="POST" action={isNew ? '?/create' : '?/update'}>
	{#if !isNew}
		<input type="hidden" name="id" value={document?.id} />
	{/if}

	{#each collection.fields as field}
		<div style="margin-bottom: 0.75rem;">
			<FieldRenderer {field} bind:values />
		</div>
	{/each}

	<div class="rk-actions">
		<button type="submit">{isNew ? 'Create' : 'Save'}</button>
		<a href={`${basePath}/collections/${slug}`}>Cancel</a>
		{#if !isNew}
			<button type="submit" formmethod="POST" formaction="?/delete" class="rk-delete">Delete</button>
		{/if}
	</div>
</form>

<style>
	.rk-actions { display: flex; gap: 1rem; align-items: center; margin-top: 1rem; }
	.rk-delete { background: #c00; color: #fff; border: none; padding: 0.4rem 1rem; cursor: pointer; }
</style>
