<script lang="ts">
	import { TextInput } from "carbon-components-svelte";
	import Locked from "carbon-icons-svelte/lib/Locked.svelte";
	import Unlocked from "carbon-icons-svelte/lib/Unlocked.svelte";

	let {
		name,
		label,
		value = $bindable(),
		required = false,
		sourceValue = "",
		fromLabel = "",
	}: {
		name: string;
		label?: string;
		value?: null | string;
		required?: boolean;
		sourceValue?: null | string;
		fromLabel?: string;
	} = $props();

	/** Whether the slug auto-syncs from the source field. */
	let locked = $state(!value);

	function slugify(input: string): string {
		return input
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
	}

	// Auto-generate slug from source when locked
	$effect(() => {
		if (locked && sourceValue) {
			value = slugify(sourceValue);
		}
	});

	function handleBlur() {
		if (!locked && typeof value === "string" && value) {
			value = slugify(value);
		}
	}

	function toggleLock() {
		locked = !locked;
		// When re-locking, sync from source immediately
		if (locked && sourceValue) {
			value = slugify(sourceValue);
		}
	}

	let preview = $derived(value ? `/${value}` : "/");
</script>

<div class="rk-slug-field">
	<div class="rk-slug-input-row">
		<div class="rk-slug-input">
			<TextInput
				id={name}
				{name}
				labelText={label ?? name}
				bind:value
				{required}
				readonly={locked}
				placeholder={locked ? "Auto-generated from {fromLabel}" : "e.g. my-page-slug"}
				helperText={locked
					? `Auto-generated from "${fromLabel}". Click the lock to edit manually.`
					: "Lowercase letters, numbers, and hyphens only. Auto-formatted on blur."}
				on:blur={handleBlur}
			/>
		</div>
		<button
			type="button"
			class="rk-slug-lock"
			onclick={toggleLock}
			title={locked ? "Unlock to edit manually" : "Lock to auto-generate from " + fromLabel}
		>
			{#if locked}
				<Locked size={16} />
			{:else}
				<Unlocked size={16} />
			{/if}
		</button>
	</div>
	<div class="rk-slug-preview">
		<span class="rk-slug-preview-label">URL segment:</span>
		<code class="rk-slug-preview-value">{preview}</code>
	</div>
</div>

<style>
	.rk-slug-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.rk-slug-input-row {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
	}
	.rk-slug-input {
		flex: 1;
	}
	.rk-slug-lock {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		margin-bottom: 1.25rem;
		padding: 0;
		border: 1px solid var(--cds-border-strong, #6f6f6f);
		background: var(--cds-field, #262626);
		color: var(--cds-text-secondary, #c6c6c6);
		cursor: pointer;
	}
	.rk-slug-lock:hover {
		background: var(--cds-field-hover, #333333);
		color: var(--cds-text-primary, #f4f4f4);
	}
	.rk-slug-preview {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
		font-size: 0.75rem;
		color: var(--cds-text-helper, #a8a8a8);
	}
	.rk-slug-preview-label {
		white-space: nowrap;
	}
	.rk-slug-preview-value {
		font-family: var(--cds-code-01-font-family, monospace);
		color: var(--cds-text-secondary, #c6c6c6);
		background: var(--cds-field, #262626);
		padding: 0.125rem 0.375rem;
		border-radius: 2px;
	}
</style>
