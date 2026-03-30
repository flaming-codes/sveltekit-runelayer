<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Column,
		Grid,
		Row,
		Tag,
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
				<div>
					<p class="rk-eyebrow">Global configuration</p>
					<h1>{label}</h1>
				</div>
				<Tag type="teal">Singleton</Tag>
			</div>
		</div>
	</div>

	<div class="rk-page-body">
		<form id={formId} method="POST" action="?/update" class="rk-form">
			<input type="hidden" name="id" value={document?.id ?? global.slug} />

			<Grid fullWidth condensed>
				<Row>
					<Column sm={4} md={8} lg={11}>
						<Tile class="rk-editor-tile">
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
					</Column>
					<Column sm={4} md={8} lg={5}>
						<Tile class="rk-sidebar-tile">
							<h2 class="rk-sidebar-title">{label}</h2>
							<dl class="rk-meta-list">
								<div>
									<dt>Slug</dt>
									<dd>{global.slug}</dd>
								</div>
								<div>
									<dt>Identifier</dt>
									<dd>{document?.id ?? global.slug}</dd>
								</div>
								<div>
									<dt>Type</dt>
									<dd>Global singleton</dd>
								</div>
							</dl>
							<div class="rk-actions">
								<Button type="submit" form={formId}>Save global</Button>
								<Button kind="secondary" href={basePath}>Back to dashboard</Button>
							</div>
						</Tile>
					</Column>
				</Row>
			</Grid>
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

	.rk-page-title-row h1 {
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
		width: 100%;
	}

	:global(.rk-editor-tile),
	:global(.rk-sidebar-tile) {
		height: 100%;
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

	.rk-sidebar-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.rk-meta-list {
		display: grid;
		gap: var(--cds-spacing-04);
		margin: var(--cds-spacing-06) 0;
	}

	.rk-meta-list div {
		padding-top: var(--cds-spacing-04);
		border-top: 1px solid var(--cds-border-subtle);
	}

	.rk-meta-list dt {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.32px;
		color: var(--cds-text-secondary);
	}

	.rk-meta-list dd {
		margin: var(--cds-spacing-02) 0 0;
	}

	.rk-actions {
		display: grid;
		gap: var(--cds-spacing-03);
	}

	@media (max-width: 672px) {
		.rk-page-header {
			padding: var(--cds-spacing-05) var(--cds-spacing-05) var(--cds-spacing-04);
		}

		.rk-page-body {
			padding-inline: var(--cds-spacing-05);
		}
	}
</style>
