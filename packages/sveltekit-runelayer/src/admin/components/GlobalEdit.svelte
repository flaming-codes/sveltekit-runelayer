<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Tile,
	} from "carbon-components-svelte";
	import type { GlobalConfig } from "../../schema/globals.js";
	import FieldRenderer from "./fields/FieldRenderer.svelte";

	let { global, document = {}, basePath = "/admin" }: {
		global: GlobalConfig;
		document?: Record<string, any>;
		basePath?: string;
	} = $props();

	let values = $state<Record<string, any>>({});
	let lastDocId = $state<string | undefined>(undefined);
	$effect(() => {
		const currentId = document?.id;
		if (currentId !== lastDocId) {
			values = document ? { ...document } : {};
			lastDocId = currentId;
		}
	});

	let label = $derived(global.label ?? global.slug);
	let formId = $derived(`global-form-${global.slug}`);
</script>

<section class="rk-page">
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/globals/${global.slug}`} isCurrentPage>{label}</BreadcrumbItem>
			</Breadcrumb>
			<div class="rk-page-title-row">
				<div class="rk-page-title-group">
					<p class="rk-eyebrow">Global configuration</p>
					<h1>{label}</h1>
				</div>
				<Button type="submit" form={formId}>Save</Button>
			</div>
		</div>
	</div>

	<div class="rk-page-body">
		<form id={formId} method="POST" action="?/update" class="rk-form">
			<input type="hidden" name="id" value={document?.id ?? global.slug} />

			<Tile>
				<div class="rk-section-header">
					<h2>Configuration</h2>
					<p class="rk-section-meta">{global.fields.length} fields</p>
				</div>
				<div class="rk-fields">
					{#each global.fields as field}
						<FieldRenderer {field} bind:values />
					{/each}
				</div>
			</Tile>
		</form>
	</div>
</section>

<style>
	@import "./page-layout.css";

	.rk-form {
		max-width: 48rem;
	}

	.rk-section-header h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.rk-section-meta {
		margin: var(--cds-spacing-02) 0 0;
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}

	.rk-fields {
		display: grid;
		gap: var(--cds-spacing-05);
		margin-top: var(--cds-spacing-06);
	}
</style>
