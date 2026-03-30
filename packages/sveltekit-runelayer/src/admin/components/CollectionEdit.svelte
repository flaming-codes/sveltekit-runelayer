<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Column,
		Grid,
		Modal,
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
	let lastDocId = $state<string | undefined>(undefined);
	$effect(() => {
		const currentId = document?.id;
		if (currentId !== lastDocId) {
			values = document ? { ...document } : {};
			lastDocId = currentId;
		}
	});

	let deleteModalOpen = $state(false);

	let isNew = $derived(!document?.id);
	let slug = $derived(collection.slug);
	let label = $derived(collection.labels?.singular ?? slug);
	let pluralLabel = $derived(collection.labels?.plural ?? slug);
	let formId = $derived(`collection-form-${slug}`);
	let deleteFormId = $derived(`collection-delete-form-${slug}`);
</script>

<section class="rk-page">
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/collections/${slug}`}>{pluralLabel}</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/collections/${slug}${isNew ? "/create" : `/${document?.id}`}`} isCurrentPage>
					{isNew ? `Create ${label}` : `Edit ${label}`}
				</BreadcrumbItem>
			</Breadcrumb>
			<div class="rk-page-title-row">
				<div>
					<p class="rk-eyebrow">Collection editor</p>
					<h1>{isNew ? `Create ${label}` : `Edit ${label}`}</h1>
				</div>
				<Tag type={isNew ? "blue" : "green"}>{isNew ? "New" : "Existing"}</Tag>
			</div>
		</div>
	</div>

	<div class="rk-page-body">
		<form id={formId} method="POST" action={isNew ? "?/create" : "?/update"} class="rk-form">
			{#if !isNew}
				<input type="hidden" name="id" value={document?.id} />
			{/if}

			<Grid fullWidth condensed>
				<Row>
					<Column sm={4} md={8} lg={11}>
						<Tile class="rk-editor-tile">
							<div class="rk-section-header">
								<h2>Content</h2>
								<p class="rk-section-meta">{collection.fields.length} fields</p>
							</div>
							<div class="rk-fields">
								{#each collection.fields as field}
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
										on:click={() => { deleteModalOpen = true; }}
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

		{#if !isNew}
			<form id={deleteFormId} method="POST" action="?/delete">
				<input type="hidden" name="id" value={document?.id} />
			</form>
			<Modal
				danger
				bind:open={deleteModalOpen}
				modalHeading="Delete document"
				primaryButtonText="Delete"
				secondaryButtonText="Cancel"
				on:click:button--secondary={() => { deleteModalOpen = false; }}
				on:submit={() => {
					const form = window.document.getElementById(deleteFormId);
					if (form instanceof HTMLFormElement) form.requestSubmit();
				}}
			>
				<p>Are you sure you want to delete this document? This action cannot be undone.</p>
			</Modal>
		{/if}
	</div>
</section>

<style>
	@import "./page-layout.css";
	@import "./editor-layout.css";

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
		margin-top: var(--cds-spacing-06);
	}
</style>
