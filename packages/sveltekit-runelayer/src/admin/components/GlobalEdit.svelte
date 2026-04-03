<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		InlineNotification,
		Modal,
		Tag,
		Tile,
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

	let label = $derived(global.label ?? global.slug);
	let formId = $derived(`global-form-${global.slug}`);
	let restoreFormId = $derived(`global-restore-form-${global.slug}`);

	let hasVersions = $derived(!!global.versions);
	let status = $derived<string>((document?._status as string) ?? "draft");
</script>

<section class="rk-page">
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/globals/${global.slug}`} isCurrentPage>
					{label}
				</BreadcrumbItem>
			</Breadcrumb>
			<div class="rk-page-title-row">
				<div class="rk-page-title-group">
					<p class="rk-eyebrow">Global configuration</p>
					<h1>{label}</h1>
				</div>
				<div class="rk-header-actions">
					{#if hasVersions}
						<Tag type={status === "published" ? "green" : "teal"}>
							{status === "published" ? "Published" : "Draft"}
						</Tag>
						{#if status === "draft"}
							<Button type="submit" form={formId} formaction="?/publishGlobal">Publish</Button>
							<Button kind="secondary" type="submit" form={formId} formaction="?/saveDraftGlobal">
								Save draft
							</Button>
						{:else}
							<Button type="submit" form={formId} formaction="?/saveDraftGlobal">
								Save as draft
							</Button>
							<Button kind="tertiary" type="submit" form={formId} formaction="?/unpublishGlobal">
								Unpublish
							</Button>
						{/if}
					{:else}
						<Button type="submit" form={formId}>Save</Button>
					{/if}
				</div>
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

		{#if hasVersions && status === "published"}
			<InlineNotification
				kind="warning"
				title="Draft mode"
				subtitle="Saving as draft will unpublish this global. It will no longer appear in public queries."
				hideCloseButton
				lowContrast
			/>
		{/if}

		{#if hasVersions && versions.length > 0}
			<Tile>
				<VersionHistory
					{versions}
					currentVersion={document?._version ?? 1}
					onRestore={(versionId) => {
						restoreVersionId = versionId;
						restoreModalOpen = true;
					}}
				/>
			</Tile>
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
					preserved in the version history. You can publish the restored content when ready.
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

	.rk-header-actions {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
	}
</style>
