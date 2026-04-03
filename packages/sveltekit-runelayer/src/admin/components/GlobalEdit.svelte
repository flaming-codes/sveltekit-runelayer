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
							<Button type="submit" form={formId} formaction="?/saveDraftGlobal">
								Save as draft
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
				subtitle="Saving as draft will unpublish this global. It will no longer be visible in public queries."
				hideCloseButton
				lowContrast
			/>
		{/if}

		{#if hasVersions && versions.length > 0}
			<Tabs bind:selected={activeTab}>
				<Tab label="Configuration" />
				<Tab label="Version history ({versions.length})" />
				<svelte:fragment slot="content">
					<TabContent>
						<form id={formId} method="POST" action="?/update" class="rk-form">
							<input type="hidden" name="id" value={document?.id ?? global.slug} />
							<div class="rk-fields-section">
								{#each global.fields as field}
									<FieldRenderer {field} bind:values />
								{/each}
							</div>
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
			<form id={formId} method="POST" action="?/update" class="rk-form">
				<input type="hidden" name="id" value={document?.id ?? global.slug} />
				<div class="rk-fields-section">
					{#each global.fields as field}
						<FieldRenderer {field} bind:values />
					{/each}
				</div>
			</form>
		{/if}

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
					This will restore the selected version as a new draft. The current content will be
					preserved in the version history.
				</p>
			</Modal>
		{/if}
	</div>
</section>

<style>
	@import "./page-layout.css";

	.rk-form {
		max-width: 48rem;
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

	.rk-fields-section {
		display: grid;
		gap: var(--cds-spacing-05);
		padding: var(--cds-spacing-05) 0;
	}

	.rk-version-tab {
		padding: var(--cds-spacing-05) 0;
	}

	.rk-page-title-row {
		margin-top: var(--cds-spacing-04);
	}

	.rk-page-body :global(.bx--inline-notification) {
		margin-bottom: var(--cds-spacing-05);
	}

	.rk-page-body :global(.bx--tab-content) {
		padding: 0;
	}
</style>
