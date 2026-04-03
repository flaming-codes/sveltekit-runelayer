<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Column,
		Grid,
		InlineNotification,
		Modal,
		Row,
		Tag,
		Tile,
	} from "carbon-components-svelte";
	import type { CollectionConfig } from "../../schema/collections.js";
	import type { VersionEntry } from "../../sveltekit/types.js";
	import FieldRenderer from "./fields/FieldRenderer.svelte";
	import VersionHistory from "./VersionHistory.svelte";

	let {
		collection,
		document = null,
		versions = [],
		basePath = "/admin",
	}: {
		collection: CollectionConfig;
		document?: Record<string, any> | null;
		versions?: VersionEntry[];
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
	let restoreModalOpen = $state(false);
	let restoreVersionId = $state<string>("");

	let isNew = $derived(!document?.id);
	let slug = $derived(collection.slug);
	let label = $derived(collection.labels?.singular ?? slug);
	let pluralLabel = $derived(collection.labels?.plural ?? slug);
	let formId = $derived(`collection-form-${slug}`);
	let deleteFormId = $derived(`collection-delete-form-${slug}`);
	let restoreFormId = $derived(`collection-restore-form-${slug}`);

	let hasVersions = $derived(!!collection.versions);
	let status = $derived<string>((document?._status as string) ?? "draft");
</script>

<section class="rk-page">
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/collections/${slug}`}>{pluralLabel}</BreadcrumbItem>
				<BreadcrumbItem
					href={`${basePath}/collections/${slug}${isNew ? "/create" : `/${document?.id}`}`}
					isCurrentPage
				>
					{isNew ? `Create ${label}` : `Edit ${label}`}
				</BreadcrumbItem>
			</Breadcrumb>
			<div class="rk-page-title-row">
				<div>
					<p class="rk-eyebrow">Collection editor</p>
					<h1>{isNew ? `Create ${label}` : `Edit ${label}`}</h1>
				</div>
				{#if hasVersions}
					<div class="rk-status-group">
						<Tag type={status === "published" ? "green" : "teal"}>
							{status === "published" ? "Published" : "Draft"}
						</Tag>
						{#if !isNew}
							<span class="rk-version-label">v{document?._version ?? 1}</span>
						{/if}
					</div>
				{:else}
					<Tag type={isNew ? "blue" : "green"}>{isNew ? "New" : "Existing"}</Tag>
				{/if}
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
								{#if hasVersions && !isNew}
									<div>
										<dt>Status</dt>
										<dd>
											<Tag size="sm" type={status === "published" ? "green" : "teal"}>
												{status === "published" ? "Published" : "Draft"}
											</Tag>
										</dd>
									</div>
									<div>
										<dt>Version</dt>
										<dd>{document?._version ?? 1}</dd>
									</div>
									{#if document?.updatedAt}
										<div>
											<dt>Last saved</dt>
											<dd>{new Date(document.updatedAt as string).toLocaleString()}</dd>
										</div>
									{/if}
								{/if}
							</dl>

							{#if hasVersions && !isNew && versions.length > 0}
								<VersionHistory
									{versions}
									currentVersion={document?._version ?? 1}
									onRestore={(versionId) => {
										restoreVersionId = versionId;
										restoreModalOpen = true;
									}}
								/>
							{/if}

							{#if hasVersions && !isNew && status === "published"}
								<InlineNotification
									kind="warning"
									title="Draft mode"
									subtitle="Saving as draft will unpublish this document. It will no longer appear in public queries."
									hideCloseButton
									lowContrast
								/>
							{/if}

							<div class="rk-actions">
								{#if hasVersions}
									{#if isNew}
										<Button type="submit" form={formId}>Create as draft</Button>
									{:else if status === "draft"}
										<Button type="submit" form={formId} formaction="?/publish">Publish</Button>
										<Button kind="secondary" type="submit" form={formId} formaction="?/saveDraft">
											Save draft
										</Button>
									{:else}
										<Button type="submit" form={formId} formaction="?/saveDraft">
											Save as draft
										</Button>
										<Button kind="tertiary" type="submit" form={formId} formaction="?/unpublish">
											Unpublish
										</Button>
									{/if}
								{:else}
									<Button type="submit" form={formId}>
										{isNew ? "Create document" : "Save changes"}
									</Button>
								{/if}
								<Button kind="secondary" href={`${basePath}/collections/${slug}`}>
									Back to list
								</Button>
								{#if !isNew}
									<Button
										kind="danger"
										on:click={() => {
											deleteModalOpen = true;
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
				on:click:button--secondary={() => {
					deleteModalOpen = false;
				}}
				on:submit={() => {
					const form = window.document.getElementById(deleteFormId);
					if (form instanceof HTMLFormElement) form.requestSubmit();
				}}
			>
				<p>Are you sure you want to delete this document? This action cannot be undone.</p>
			</Modal>
		{/if}

		{#if hasVersions && !isNew}
			<form id={restoreFormId} method="POST" action="?/restoreVersion">
				<input type="hidden" name="id" value={document?.id} />
				<input type="hidden" name="versionId" value={restoreVersionId} />
			</form>
			<Modal
				bind:open={restoreModalOpen}
				modalHeading="Restore version"
				primaryButtonText="Restore"
				secondaryButtonText="Cancel"
				on:click:button--secondary={() => {
					restoreModalOpen = false;
				}}
				on:submit={() => {
					const form = window.document.getElementById(restoreFormId);
					if (form instanceof HTMLFormElement) form.requestSubmit();
				}}
			>
				<p>
					This will restore the selected version as a new draft. The current content will be
					preserved in the version history. You can publish the restored content when ready.
				</p>
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

	.rk-status-group {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}

	.rk-version-label {
		font-family: var(--cds-code-01-font-family, monospace);
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}
</style>
