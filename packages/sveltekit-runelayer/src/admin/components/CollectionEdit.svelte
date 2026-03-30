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
	let pluralLabel = $derived(collection.labels?.plural ?? slug);
	let formId = $derived(`collection-form-${slug}`);
</script>

<section class="rk-page">
	<form id={formId} method="POST" action={isNew ? "?/create" : "?/update"} class="rk-form">
		{#if !isNew}
			<input type="hidden" name="id" value={document?.id} />
		{/if}

		<Grid fullWidth condensed>
			<Row>
				<Column sm={4} md={8} lg={12}>
					<Breadcrumb noTrailingSlash>
						<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
						<BreadcrumbItem href={`${basePath}/collections/${slug}`}>{pluralLabel}</BreadcrumbItem>
						<BreadcrumbItem href={`${basePath}/collections/${slug}${isNew ? "/create" : `/${document?.id}`}`} isCurrentPage>
							{isNew ? `Create ${label}` : `Edit ${label}`}
						</BreadcrumbItem>
					</Breadcrumb>
					<div class="rk-page-header">
						<p class="rk-eyebrow">Collection editor</p>
						<h1>{isNew ? `Create ${label}` : `Edit ${label}`}</h1>
						<p class="rk-description">
							Use the package-owned Carbon form controls to manage this document.
						</p>
					</div>
				</Column>
				<Column sm={4} md={8} lg={4} class="rk-header-actions">
					<Tag type={isNew ? "blue" : "green"}>{isNew ? "New document" : "Existing document"}</Tag>
				</Column>
			</Row>

			<Row>
				<Column sm={4} md={8} lg={11}>
					<Tile class="rk-editor-tile">
						<div class="rk-section-header">
							<h2>Content</h2>
							<p>{collection.fields.length} configured fields</p>
						</div>
						<div class="rk-fields">
							{#each collection.fields as field}
								<div class="rk-field"><FieldRenderer {field} bind:values /></div>
							{/each}
						</div>
					</Tile>
				</Column>
				<Column sm={4} md={8} lg={5}>
					<Tile class="rk-sidebar-tile">
						<p class="rk-eyebrow">Publishing</p>
						<h2>{label}</h2>
						<dl class="rk-meta-list">
							<div>
								<dt>Collection</dt>
								<dd>{pluralLabel}</dd>
							</div>
							<div>
								<dt>Mode</dt>
								<dd>{isNew ? "Create" : "Update"}</dd>
							</div>
							<div>
								<dt>Identifier</dt>
								<dd>{document?.id ?? "Assigned after creation"}</dd>
							</div>
						</dl>
						<div class="rk-actions">
							<Button type="submit" form={formId}>{isNew ? "Create document" : "Save changes"}</Button>
							<Button kind="secondary" href={`${basePath}/collections/${slug}`}>Back to list</Button>
							{#if !isNew}
								<Button
									kind="danger"
									type="submit"
									form={formId}
									formmethod="POST"
									formaction="?/delete"
									on:click={(e) => {
										if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
											e.preventDefault();
										}
									}}
								>
									Delete document
								</Button>
							{/if}
						</div>
					</Tile>
				</Column>
			</Row>
		</Grid>
	</form>
</section>

<style>
	.rk-page {
		grid-column: 1 / -1;
	}

	.rk-form {
		width: 100%;
	}

	.rk-page-header {
		margin: 1rem 0 2rem;
	}

	:global(.rk-header-actions) {
		display: flex;
		justify-content: flex-end;
		align-items: flex-end;
	}

	.rk-eyebrow {
		margin: 0;
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--cds-text-secondary);
	}

	.rk-page-header h1,
	:global(.rk-sidebar-tile) h2 {
		margin: 0.5rem 0 0;
		font-size: clamp(2rem, 3vw, 3rem);
		font-weight: 300;
	}

	.rk-description,
	.rk-section-header p {
		margin: 0.75rem 0 0;
		color: var(--cds-text-secondary);
	}

	:global(.rk-editor-tile),
	:global(.rk-sidebar-tile) {
		height: 100%;
	}

	.rk-section-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 400;
	}

	.rk-fields {
		display: grid;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.rk-meta-list {
		display: grid;
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.rk-meta-list div {
		padding-top: 0.75rem;
		border-top: 1px solid var(--cds-border-subtle);
	}

	.rk-meta-list dt {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--cds-text-secondary);
	}

	.rk-meta-list dd {
		margin: 0.35rem 0 0;
	}

	.rk-actions {
		display: grid;
		gap: 0.75rem;
	}

	@media (max-width: 1055px) {
		:global(.rk-header-actions) {
			justify-content: flex-start;
		}
	}
</style>
