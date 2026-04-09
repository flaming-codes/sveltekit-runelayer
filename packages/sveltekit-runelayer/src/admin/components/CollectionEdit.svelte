<script lang="ts">
	import { tick } from "svelte";
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		Heading,
		InlineNotification,
		Modal,
		Section,
		Tab,
		TabContent,
		Tabs,
		Tag,
		Toolbar,
		ToolbarContent,
	} from "carbon-components-svelte";
	import type { CollectionConfig } from "../../schema/collections.js";
	import type { RunelayerAdminFormData, VersionEntry } from "../../sveltekit/types.js";
	import {
		mergeFieldErrors,
		snapshotEditorValues,
		type EditorValidationMode,
		validateEditorValues,
	} from "./editor-validation.js";
	import FieldRenderer from "./fields/FieldRenderer.svelte";
	import VersionHistory from "./VersionHistory.svelte";

	let {
		collection,
		document = null,
		versions = [],
		basePath = "/admin",
		form = null,
	}: {
		collection: CollectionConfig;
		document?: Record<string, any> | null;
		versions?: VersionEntry[];
		basePath?: string;
		form?: RunelayerAdminFormData | null;
	} = $props();

	let values = $state<Record<string, any>>({});
	let clientFieldErrors = $state<Record<string, string[]>>({});
	let serverFieldErrors = $state<Record<string, string[]>>({});
	let pageError = $state("");
	let serverSnapshot = $state<string | null>(null);
	let initialSnapshot = $state("{}");
	let hasInteracted = $state(false);
	let validationMode = $state<EditorValidationMode>("strict");
	let lastSeedKey = $state("");

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
	let payload = $derived(snapshotEditorValues($state.snapshot(values)));
	let payloadJson = $derived(JSON.stringify(payload));
	let activeFieldErrors = $derived(mergeFieldErrors(serverFieldErrors, clientFieldErrors));

	function validationModeForAction(action: string | null | undefined): EditorValidationMode {
		return action === "?/saveDraft" ? "draft" : "strict";
	}

	function seedEditorState() {
		const seedValues = $state.snapshot(
			(form?.values as Record<string, any> | undefined) ?? document ?? {},
		);
		const snapshot = JSON.stringify(snapshotEditorValues(seedValues));

		values = structuredClone(seedValues);
		serverFieldErrors = form?.fieldErrors ?? {};
		clientFieldErrors = {};
		pageError = form?.error ?? "";
		serverSnapshot = form?.values ? snapshot : null;
		initialSnapshot = snapshot;
		hasInteracted = false;
		validationMode = "strict";
	}

	$effect(() => {
		const seedValues = (form?.values as Record<string, any> | undefined) ?? document ?? {};
		const seedKey = JSON.stringify({
			documentId: document?.id ?? null,
			values: seedValues,
			fieldErrors: form?.fieldErrors ?? {},
			error: form?.error ?? "",
		});

		if (seedKey !== lastSeedKey) {
			seedEditorState();
			lastSeedKey = seedKey;
		}
	});

	$effect(() => {
		const currentPayload = payloadJson;
		if (currentPayload !== initialSnapshot) {
			hasInteracted = true;
		}

		if (serverSnapshot !== null && currentPayload !== serverSnapshot) {
			serverSnapshot = null;
			serverFieldErrors = {};
			pageError = "";
			hasInteracted = true;
		}

		// Debounce the validation pass to avoid O(N + B*F) work on every keystroke.
		// Synchronous reads above ensure the effect tracks all reactive dependencies.
		const timer = setTimeout(() => {
			if (!hasInteracted) {
				clientFieldErrors = {};
				return;
			}

			const validation = validateEditorValues(
				collection.fields,
				payload,
				isNew ? "create" : "update",
				validationMode,
			);

			clientFieldErrors = validation.fieldErrors;
			if (validation.issues.length === 0 && serverSnapshot === null) {
				pageError = "";
			}
		}, 150);

		return () => clearTimeout(timer);
	});

	async function handleSubmit(event: SubmitEvent) {
		const submitter = event.submitter;
		const action =
			submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
				? submitter.getAttribute("formaction")
				: null;

		validationMode = validationModeForAction(action);
		const validation = validateEditorValues(
			collection.fields,
			payload,
			isNew ? "create" : "update",
			validationMode,
		);

		hasInteracted = true;
		clientFieldErrors = validation.fieldErrors;
		if (validation.issues.length > 0) {
			event.preventDefault();
			serverSnapshot = null;
			serverFieldErrors = {};
			pageError = validation.error;
			await tick();
			const alertEl = document.querySelector<HTMLElement>('[role="alert"]');
			if (alertEl) {
				alertEl.setAttribute("tabindex", "-1");
				alertEl.focus();
			}
			return;
		}

		pageError = "";
	}
</script>

<section class="rk-page">
	<!-- Header (sticky) -->
	<div class="rk-page-header rk-page-header--sticky">
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
					<Section>
						<Heading>{isNew ? `New ${label}` : `Edit ${label}`}</Heading>
					</Section>
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

			<!-- Action toolbar -->
			<div class="rk-toolbar-row">
				<Toolbar>
					<ToolbarContent>
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
						{#if !isNew}
							<div class="rk-toolbar-spacer"></div>
							<Button
								kind="danger-ghost"
								on:click={() => {
									deleteModalOpen = true;
								}}
							>
								Delete
							</Button>
						{/if}
					</ToolbarContent>
				</Toolbar>
			</div>
		</div>
	</div>

	<!-- Body -->
	<div class="rk-page-body">
		<div role="alert" aria-atomic="true">
			{#if pageError}
				<InlineNotification
					kind="error"
					title="Validation failed"
					subtitle={pageError}
					hideCloseButton
					lowContrast
				/>
			{/if}
		</div>

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
		<form
			id={formId}
			method="POST"
			action={isNew ? "?/create" : "?/update"}
			class="rk-form"
			onsubmit={handleSubmit}
		>
			{#if !isNew}
				<input type="hidden" name="id" value={document?.id} />
			{/if}
			<input type="hidden" name="payload" value={payloadJson} />

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
									<FieldRenderer
										{field}
										fields={collection.fields}
										bind:values
										errors={activeFieldErrors}
									/>
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

	/* Sticky header */
	.rk-page-header--sticky {
		position: sticky;
		top: 0;
		z-index: 200;
	}

	/* Title + status badges inline */
	.rk-title-with-status {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-05);
		flex-wrap: wrap;
	}

	/* Carbon Heading inside title row */
	.rk-title-with-status :global(h1) {
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

	/* Toolbar row */
	.rk-toolbar-row {
		margin-top: var(--cds-spacing-04);
		border-top: 1px solid var(--cds-border-subtle);
	}

	/* Flush Toolbar background so it blends with the header */
	.rk-toolbar-row :global(.bx--table-toolbar) {
		background: transparent;
		min-height: 3rem;
	}

	.rk-toolbar-row :global(.bx--toolbar-content) {
		padding: var(--cds-spacing-03) 0;
	}

	/* Spacer pushes delete to the right */
	.rk-toolbar-spacer {
		flex: 1;
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
