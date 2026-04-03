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
	import type { GlobalConfig } from "../../schema/globals.js";
	import type { VersionEntry } from "../../sveltekit/types.js";
	import FieldRenderer from "./fields/FieldRenderer.svelte";
	import VersionHistory from "./VersionHistory.svelte";

	let {
		global,
		document = {},
		versions = [],
		basePath = "/admin",
	}: {
		global: GlobalConfig;
		document?: Record<string, any>;
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

	let restoreModalOpen = $state(false);
	let restoreVersionId = $state<string>("");
	let activeTab = $state(0);

	let label = $derived(global.label ?? global.slug);
	let formId = $derived(`global-form-${global.slug}`);
	let restoreFormId = $derived(`global-restore-form-${global.slug}`);

	let hasVersions = $derived(!!global.versions);
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
				<BreadcrumbItem href={`${basePath}/globals/${global.slug}`} isCurrentPage>
					{label}
				</BreadcrumbItem>
			</Breadcrumb>

			<div class="rk-page-title-row">
				<div class="rk-title-with-status">
					<h1>{label}</h1>
					{#if hasVersions}
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
						{#if isDraft}
							<Button type="submit" form={formId} formaction="?/publishGlobal">Publish</Button>
							<Button kind="secondary" type="submit" form={formId} formaction="?/saveDraftGlobal">
								Save draft
							</Button>
						{:else}
							<Button kind="secondary" type="submit" form={formId} formaction="?/saveDraftGlobal">
								Save as new draft
							</Button>
							<Button
								kind="tertiary"
								type="submit"
								form={formId}
								formaction="?/unpublishGlobal"
							>
								Unpublish
							</Button>
						{/if}
					{:else}
						<Button type="submit" form={formId}>Save</Button>
					{/if}
				</ButtonSet>
			</div>
		</div>
	</div>

	<!-- Body -->
	<div class="rk-page-body">
		{#if hasVersions && isPublished}
			<InlineNotification
				kind="info"
				title="Currently published"
				subtitle="Saving changes will create a new draft version. Use Publish to update the live document."
				hideCloseButton
				lowContrast
			/>
		{/if}

		<form id={formId} method="POST" action="?/update" class="rk-form">
			<input type="hidden" name="id" value={document?.id ?? global.slug} />

			<Tabs bind:selected={activeTab}>
				<Tab label="Configuration" />
				<Tab label="Info" />
				{#if hasVersions}
					<Tab label="Versions ({versions.length})" disabled={versions.length === 0} />
				{/if}
				<svelte:fragment slot="content">
					<!-- Configuration tab -->
					<TabContent>
						<div class="rk-tab-panel">
							<div class="rk-fields-section">
								{#each global.fields as field}
									<FieldRenderer {field} bind:values />
								{/each}
							</div>
						</div>
					</TabContent>

					<!-- Info tab -->
					<TabContent>
						<div class="rk-tab-panel">
							<dl class="rk-meta-list">
								<div>
									<dt>Global</dt>
									<dd>{label}</dd>
								</div>
								<div>
									<dt>Slug</dt>
									<dd class="rk-mono">{global.slug}</dd>
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

		{#if hasVersions}
			<form id={restoreFormId} method="POST" action="?/restoreGlobalVersion">
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
	</div>
</section>

<style>
	@import "./page-layout.css";

	.rk-form {
		width: 100%;
	}

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

	.rk-action-bar {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-05);
		margin-top: var(--cds-spacing-05);
		padding-top: var(--cds-spacing-04);
		border-top: 1px solid var(--cds-border-subtle);
	}

	.rk-page-title-row {
		margin-top: var(--cds-spacing-04);
	}

	.rk-tab-panel {
		padding: var(--cds-spacing-06) 0;
		max-width: 48rem;
	}

	.rk-fields-section {
		display: grid;
		gap: var(--cds-spacing-05);
	}

	.rk-meta-list {
		display: grid;
		gap: var(--cds-spacing-04);
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
		word-break: break-word;
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

	.rk-page-body :global(.bx--inline-notification) {
		margin-bottom: var(--cds-spacing-05);
	}

	.rk-page-body :global(.bx--tab-content) {
		padding: 0;
	}
</style>
