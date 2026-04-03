<script lang="ts">
	import { ComboBox, MultiSelect, Select, SelectItem, InlineLoading } from "carbon-components-svelte";
	import type { RefSentinel } from "../../../schema/fields.js";

	let {
		name,
		label,
		value = $bindable(),
		relationTo = "",
		hasMany = false,
		required = false,
	}: {
		name: string;
		label?: string;
		value?: unknown;
		relationTo: string | string[];
		hasMany?: boolean;
		required?: boolean;
	} = $props();

	// Polymorphic: array of collection slugs
	let isPolymorphic = $derived(Array.isArray(relationTo));
	let collections = $derived(Array.isArray(relationTo) ? relationTo : [relationTo]);

	// For polymorphic fields: track which collection is selected
	let selectedCollection = $state(
		Array.isArray(relationTo) ? (relationTo[0] ?? "") : (relationTo as string),
	);

	// Options fetched from the API
	type DocOption = { id: string; label: string };
	let options = $state<DocOption[]>([]);
	let loading = $state(false);
	let fetchError = $state("");

	// Extract the current sentinel value(s) for display
	function toSentinel(v: unknown, collectionSlug: string): RefSentinel | null {
		if (!v || typeof v !== "object") return null;
		const rec = v as Record<string, unknown>;
		if (typeof rec._ref === "string") {
			return { _ref: rec._ref, _collection: (rec._collection as string) ?? collectionSlug };
		}
		return null;
	}

	function bareIdToSentinel(v: unknown, collectionSlug: string): RefSentinel | null {
		if (typeof v === "string" && v.length > 0) {
			return { _ref: v, _collection: collectionSlug };
		}
		return toSentinel(v, collectionSlug);
	}

	// Derived: the currently active collection slug (for mono-collection fields)
	let activeCollection = $derived(
		isPolymorphic ? selectedCollection : (relationTo as string),
	);

	// Fetch options whenever activeCollection changes
	$effect(() => {
		const slug = activeCollection;
		if (!slug) return;
		loading = true;
		fetchError = "";
		options = [];
		fetch(`/runelayer/api/${encodeURIComponent(slug)}?limit=100`)
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json() as Promise<{ docs: Record<string, unknown>[]; useAsTitle?: string }>;
			})
			.then((data) => {
				const titleKey = data.useAsTitle;
				options = (data.docs ?? []).map((doc) => {
					const id = typeof doc.id === "string" ? doc.id : String(doc.id ?? "");
					let labelText: string;
					if (titleKey && typeof doc[titleKey] === "string" && (doc[titleKey] as string).length > 0) {
						labelText = doc[titleKey] as string;
					} else {
						labelText = id;
					}
					return { id, label: labelText };
				});
			})
			.catch((err: unknown) => {
				fetchError = err instanceof Error ? err.message : "Failed to load options";
			})
			.finally(() => {
				loading = false;
			});
	});

	// Items for ComboBox and MultiSelect: { id, text }
	let docItems = $derived(options.map((o) => ({ id: o.id, text: o.label })));

	// Current single selected id (for ComboBox)
	let selectedId = $derived(bareIdToSentinel(value, activeCollection)?._ref ?? "");

	// Current selected ids array (for MultiSelect)
	let selectedIds = $derived(
		Array.isArray(value)
			? (value as unknown[])
					.map((v) => bareIdToSentinel(v, activeCollection)?._ref)
					.filter((id): id is string => typeof id === "string" && id.length > 0)
			: (() => {
					const sentinel = bareIdToSentinel(value, activeCollection);
					return sentinel ? [sentinel._ref] : [];
				})(),
	);

	function handleSelect(id: string) {
		if (!id) {
			value = undefined;
			return;
		}
		value = { _ref: id, _collection: activeCollection };
	}

	function handleMultiSelect(ids: string[]) {
		value = ids.map((id) => ({ _ref: id, _collection: activeCollection }));
	}
</script>

<div class="rk-relationship-field">
	{#if isPolymorphic}
		<div class="rk-relationship-collection-select">
			<Select
				id="{name}-collection"
				labelText="{label ?? name} (collection)"
				bind:selected={selectedCollection}
			>
				{#each collections as col}
					<SelectItem value={col} text={col} />
				{/each}
			</Select>
		</div>
	{/if}

	{#if loading}
		<div class="rk-relationship-loading">
			<InlineLoading description="Loading options…" />
		</div>
	{:else if fetchError}
		<p class="rk-relationship-error">Error loading options: {fetchError}</p>
	{:else if hasMany}
		<MultiSelect
			id={name}
			titleText={isPolymorphic ? undefined : (label ?? name)}
			label="Select documents"
			items={docItems}
			{selectedIds}
			{required}
			on:select={(e) => handleMultiSelect(e.detail.selectedIds)}
		/>
	{:else}
		<ComboBox
			id={name}
			titleText={isPolymorphic ? undefined : (label ?? name)}
			placeholder="Select a document"
			items={docItems}
			{selectedId}
			{required}
			on:select={(e) => handleSelect(e.detail.selectedId ?? "")}
			on:clear={() => handleSelect("")}
		/>
	{/if}
</div>

<style>
	.rk-relationship-field {
		display: grid;
		gap: var(--cds-spacing-03);
	}

	.rk-relationship-loading {
		padding: var(--cds-spacing-03) 0;
	}

	.rk-relationship-error {
		font-size: 0.75rem;
		color: var(--cds-support-error);
		margin: 0;
	}
</style>
