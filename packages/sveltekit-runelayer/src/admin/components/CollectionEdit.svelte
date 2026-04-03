<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		ButtonSet,
		Column,
		Grid,
		InlineNotification,
		Modal,
		Row,
		Tab,
		TabContent,
		Tabs,
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
	let activeTab = $state(0);

	let isNew = $derived(!document?.id);
	let slug = $derived(collection.slug);
	let label = $derived(collection.labels?.singular ?? slug);
	let pluralLabel = $derived(collection.labels?.plural ?? slug);
	let formId = $derived(`collection-form-${slug}`);
	let deleteFormId = $derived(`collection-delete-form-${slug}`);
	let restoreFormId = $derived(`collection-restore-form-${slug}`);

	let hasVersions = $derived(!!collection.versions);
	let status = $derived<string>((document?._status as string) ?? "draft");
	let isDraft = $derived(status === "draft");
	let isPublished = $derived(status === "published");
</script>

<section class="rk-page">
	<!-- Header -->
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/collections/${slug}`}>{pluralLabel}</BreadcrumbItem>
				<BreadcrumbItem
					href={`${basePath}/collections/${slug}${isNew ? "/create" : `/${document?.id}`}`}
					isCurrentPage
				>
					{isNew ? `New ${label}` : `Edit ${label}`}
				</BreadcrumbItem>
			</Breadcrumb>

			<div class="rk-page-title-row">
				<div class="rk-title-with-status">
					<h1>{isNew ? `New ${label}` : `Edit ${label}`}</h1>
					{#if hasVersions && !isNew}
						<div class="rk-status-badges">
							<Tag type={isPublished ? "green" : "teal"}>
								{isPublished ? "Published" : "Draft"}
							</Tag>
							<span class="rk-version-badge">v{document?._version ?? 1}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Action bar -->
			<div class="rk-action-bar">
				<ButtonSet>
					{#if hasVersions}
						{#if isNew}
							<Button type="submit" form={formId}>Create as draft</Button>
						{:else if isDraft}
							<Button type="submit" form={formId} formaction="?/publish">Publish</Button>
							<Button kind="secondary" type="submit" form={formId} formaction="?/saveDraft">
								Save draft
							</Button>
						{:else}
							<Button type="submit" form={formId} formaction="?/saveDraft">Save as draft</Button>
							<Button
								kind="tertiary"
								type="submit"
								form={formId}
								formaction="?/unpublish"
							>
								Unpublish
							</Button>
						{/if}
					{:else}
						<Button type="submit" form={formId}>
							{isNew ? "Create" : "Save changes"}
						</Button>
					{/if}
				</ButtonSet>
				<div class="rk-action-bar-secondary">
					{#if !isNew}
						<Button
							kind="danger-ghost"
							size="small"
							on:click={() => {
								deleteModalOpen = true;
							}}
						>
							Delete
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Body -->
	<div class="rk-page-body">
		{#if hasVersions && !isNew && isPublished}
			<InlineNotification
				kind="info"
				title="Currently published"
				subtitle="Saving as draft will unpublish this document. It will no longer be visible in public queries."
				hideCloseButton
				lowContrast
			/>
		{/if}

		{#if hasVersions && !isNew && versions.length > 0}
			<Tabs bind:selected={activeTab}>
				<Tab label="Content" />
				<Tab label="Version history ({versions.length})" />
				<svelte:fragment slot="content">
					<TabContent>
						<form id={formId} method="POST" action={isNew ? "?/create" : "?/update"} class="rk-form">
							{#if !isNew}
								<input type="hidden" name="id" value={document?.id} />
							{/if}
							<Grid fullWidth>
								<Row>
									<Column sm={4} md={8} lg={12}>
										<div class="rk-fields-section">
											{#each collection.fields as field}
												<FieldRenderer {field} bind:values />
											{/each}
										</div>
									</Column>
									<Column sm={4} md={8} lg={4}>
										<Tile class="rk-meta-tile">
											<h3 class="rk-meta-heading">Document info</h3>
											<dl class="rk-meta-list">
												<div>
													<dt>Collection</dt>
													<dd>{pluralLabel}</dd>
												</div>
												<div>
													<dt>ID</dt>
													<dd class="rk-mono">{document?.id}</dd>
												</div>
												{#if document?.updatedAt}
													<div>
														<dt>Last saved</dt>
														<dd>{new Date(document.updatedAt as string).toLocaleString()}</dd>
													</div>
												{/if}
												{#if document?.createdAt}
													<div>
														<dt>Created</dt>
														<dd>{new Date(document.createdAt as string).toLocaleString()}</dd>
													</div>
												{/if}
											</dl>
										</Tile>
									</Column>
								</Row>
							</Grid>
						</form>
					</TabContent>
					<TabContent>
						<div class="rk-version-tab">
							<VersionHistory
								{versions}
								currentVersion={document?._version ?? 1}
								onRestore={(versionId) => {
									restoreVersionId = versionId;
									restoreModalOpen = true;
								}}
							/>
						</div>
					</TabContent>
				</svelte:fragment>
			</Tabs>
		{:else}
			<!-- No versioning or new document: just the form -->
			<form id={formId} method="POST" action={isNew ? "?/create" : "?/update"} class="rk-form">
				{#if !isNew}
					<input type="hidden" name="id" value={document?.id} />
				{/if}
				<Grid fullWidth>
					<Row>
						<Column sm={4} md={8} lg={12}>
							<div class="rk-fields-section">
								{#each collection.fields as field}
									<FieldRenderer {field} bind:values />
								{/each}
							</div>
						</Column>
						{#if !isNew}
							<Column sm={4} md={8} lg={4}>
								<Tile class="rk-meta-tile">
									<h3 class="rk-meta-heading">Document info</h3>
									<dl class="rk-meta-list">
										<div>
											<dt>Collection</dt>
											<dd>{pluralLabel}</dd>
										</div>
										<div>
											<dt>ID</dt>
											<dd class="rk-mono">{document?.id}</dd>
										</div>
										{#if document?.updatedAt}
											<div>
												<dt>Last saved</dt>
												<dd>{new Date(document.updatedAt as string).toLocaleString()}</dd>
											</div>
										{/if}
									</dl>
								</Tile>
							</Column>
						{/if}
					</Row>
				</Grid>
			</form>
		{/if}
	</div>

	<!-- Delete modal -->
	{#if !isNew}
		<form id={deleteFormId} method="POST" action="?/delete">
			<input type="hidden" name="id" value={document?.id} />
		</form>
		<Modal
			danger
			bind:open={deleteModalOpen}
			modalHeading="Delete document"
			primaryButtonText="Delete permanently"
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

	<!-- Restore version modal -->
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
				preserved in the version history.
			</p>
		</Modal>
	{/if}
</section>

<style>
	@import "./page-layout.css";
	@import "./editor-layout.css";

	/* Title + status badges inline */
	.rk-title-with-status {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-05);
		flex-wrap: wrap;
	}

	.rk-title-with-status h1 {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 300;
		line-height: 1.2;
	}

	.rk-status-badges {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}

	.rk-version-badge {
		font-family: var(--cds-code-01-font-family, monospace);
		font-size: 0.75rem;
		color: var(--cds-text-secondary);
	}

	/* Action bar */
	.rk-action-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cds-spacing-05);
		margin-top: var(--cds-spacing-05);
		padding-top: var(--cds-spacing-04);
		border-top: 1px solid var(--cds-border-subtle);
	}

	.rk-action-bar-secondary {
		display: flex;
		gap: var(--cds-spacing-03);
	}

	/* Remove the title-row default h1 margin since we handle it inline */
	.rk-page-title-row {
		margin-top: var(--cds-spacing-04);
	}

	/* Fields section */
	.rk-fields-section {
		display: grid;
		gap: var(--cds-spacing-05);
		padding: var(--cds-spacing-05) 0;
	}

	/* Meta tile */
	:global(.rk-meta-tile) {
		height: fit-content;
	}

	.rk-meta-heading {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.rk-mono {
		font-family: var(--cds-code-01-font-family, monospace);
		font-size: 0.75rem;
		word-break: break-all;
	}

	/* Version tab content */
	.rk-version-tab {
		padding: var(--cds-spacing-05) 0;
	}

	/* Notification spacing */
	.rk-page-body :global(.bx--inline-notification) {
		margin-bottom: var(--cds-spacing-05);
	}

	/* Tabs override for full-width content */
	.rk-page-body :global(.bx--tab-content) {
		padding: 0;
	}
</style>
