<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		ButtonSet,
		InlineNotification,
		Modal,
		Tab,
		TabContent,
		Tabs,
		Tag,
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
							<Button type="submit" form={formId}>Create draft</Button>
						{:else if isDraft}
							<Button type="submit" form={formId} formaction="?/publish">Publish</Button>
							<Button kind="secondary" type="submit" form={formId} formaction="?/saveDraft">
								Save draft
							</Button>
						{:else}
							<Button kind="secondary" type="submit" form={formId} formaction="?/saveDraft">
								Save as new draft
							</Button>
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
				<div class="rk-action-bar-end">
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
				subtitle="Saving changes will create a new draft version. Use Publish to update the live document."
				hideCloseButton
				lowContrast
			/>
		{/if}

		<!-- Shared form wraps everything so all tabs submit field data -->
		<form id={formId} method="POST" action={isNew ? "?/create" : "?/update"} class="rk-form">
			{#if !isNew}
				<input type="hidden" name="id" value={document?.id} />
			{/if}
			<input type="hidden" name="payload" value={JSON.stringify(values)} />

			<Tabs bind:selected={activeTab}>
				<Tab label="Content" />
				<Tab label="Info" disabled={isNew} />
				{#if hasVersions}
					<Tab label="Versions ({versions.length})" disabled={isNew || versions.length === 0} />
				{/if}
				<svelte:fragment slot="content">
					<!-- Content tab -->
					<TabContent>
						<div class="rk-tab-panel">
							<div class="rk-fields-section">
								{#each collection.fields as field}
									<FieldRenderer {field} fields={collection.fields} bind:values />
								{/each}
							</div>
						</div>
					</TabContent>

					<!-- Info tab -->
					<TabContent>
						<div class="rk-tab-panel">
							<div class="rk-info-grid">
								<dl class="rk-meta-list">
									<div>
										<dt>Collection</dt>
										<dd>{pluralLabel}</dd>
									</div>
									<div>
										<dt>ID</dt>
										<dd class="rk-mono">{document?.id}</dd>
									</div>
									{#if hasVersions}
										<div>
											<dt>Status</dt>
											<dd>
												<Tag size="sm" type={isPublished ? "green" : "teal"}>
													{isPublished ? "Published" : "Draft"}
												</Tag>
											</dd>
										</div>
										<div>
											<dt>Version</dt>
											<dd>{document?._version ?? 1}</dd>
										</div>
									{/if}
									{#if document?.createdAt}
										<div>
											<dt>Created</dt>
											<dd>{new Date(document.createdAt as string).toLocaleString()}</dd>
										</div>
									{/if}
									{#if document?.updatedAt}
										<div>
											<dt>Last saved</dt>
											<dd>{new Date(document.updatedAt as string).toLocaleString()}</dd>
										</div>
									{/if}
								</dl>
							</div>
						</div>
					</TabContent>

					<!-- Versions tab -->
					{#if hasVersions}
						<TabContent>
							<div class="rk-tab-panel">
								{#if versions.length > 0}
									<VersionHistory
										{versions}
										currentVersion={document?._version ?? 1}
										onRestore={(versionId) => {
											restoreVersionId = versionId;
											restoreModalOpen = true;
										}}
									/>
								{:else}
									<p class="rk-empty-state">No version history yet.</p>
								{/if}
							</div>
						</TabContent>
					{/if}
				</svelte:fragment>
			</Tabs>
		</form>
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
				Restoring will create a new draft with the content from this version.
				The current state is preserved in the version history.
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

	.rk-action-bar-end {
		display: flex;
		gap: var(--cds-spacing-03);
	}

	.rk-page-title-row {
		margin-top: var(--cds-spacing-04);
	}

	/* Tab panels */
	.rk-tab-panel {
		padding: var(--cds-spacing-06) 0;
		max-width: 48rem;
	}

	/* Fields section */
	.rk-fields-section {
		display: grid;
		gap: var(--cds-spacing-05);
	}

	/* Info grid */
	.rk-info-grid {
		max-width: 36rem;
	}

	.rk-mono {
		font-family: var(--cds-code-01-font-family, monospace);
		font-size: 0.75rem;
		word-break: break-all;
	}

	.rk-empty-state {
		color: var(--cds-text-secondary);
		font-size: 0.875rem;
	}

	/* Notification spacing */
	.rk-page-body :global(.bx--inline-notification) {
		margin-bottom: var(--cds-spacing-05);
	}

	/* Tab content padding reset */
	.rk-page-body :global(.bx--tab-content) {
		padding: 0;
	}
</style>
