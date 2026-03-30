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
	$effect(() => {
		values = document ? { ...document } : {};
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
	.rk-page-header {
		background: var(--cds-ui-background);
		border-bottom: 1px solid var(--cds-border-subtle);
		padding: var(--cds-spacing-06) var(--cds-spacing-06) var(--cds-spacing-05);
	}

	.rk-page-header-inner {
		max-width: 90rem;
		margin: 0 auto;
	}

	.rk-page-title-row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--cds-spacing-05);
		margin-top: var(--cds-spacing-04);
	}

	.rk-eyebrow {
		margin: 0;
		font-size: 0.75rem;
		letter-spacing: 0.32px;
		text-transform: uppercase;
		color: var(--cds-text-secondary);
	}

	.rk-page-title-group h1 {
		margin: var(--cds-spacing-02) 0 0;
		font-size: 1.75rem;
		font-weight: 300;
		line-height: 1.2;
	}

	.rk-page-body {
		max-width: 90rem;
		margin: 0 auto;
		padding: var(--cds-spacing-05) var(--cds-spacing-06) var(--cds-spacing-07);
	}

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

	@media (max-width: 672px) {
		.rk-page-header {
			padding: var(--cds-spacing-05) var(--cds-spacing-05) var(--cds-spacing-04);
		}

		.rk-page-body {
			padding-inline: var(--cds-spacing-05);
		}

		.rk-page-title-row {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
