<script lang="ts">
	import { Breadcrumb, BreadcrumbItem, Tag, Tile } from "carbon-components-svelte";
	import { Checkmark, WarningAlt } from "carbon-icons-svelte";

	let {
		health = { status: "unknown", database: false, collections: 0, globals: 0, timestamp: "" },
		basePath = "/admin",
	}: {
		health?: {
			status: string;
			database: boolean;
			collections: number;
			globals: number;
			timestamp: string;
		};
		basePath?: string;
	} = $props();
</script>

<div class="rk-page">
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={`${basePath}/health`} isCurrentPage>Health</BreadcrumbItem>
			</Breadcrumb>
			<div class="rk-page-title-row">
				<div>
					<p class="rk-eyebrow">System</p>
					<h1>Health</h1>
				</div>
			</div>
		</div>
	</div>

	<div class="rk-page-body">
		<Tile class="rk-health-card">
			<div class="rk-health-status">
				{#if health.status === "ok"}
					<Checkmark size={24} />
					<Tag type="green" size="sm">Healthy</Tag>
				{:else}
					<WarningAlt size={24} />
					<Tag type="red" size="sm">Degraded</Tag>
				{/if}
			</div>

			<dl class="rk-health-list">
				<div class="rk-health-item">
					<dt>Database</dt>
					<dd>{health.database ? "Connected" : "Unreachable"}</dd>
				</div>
				<div class="rk-health-item">
					<dt>Collections</dt>
					<dd>{health.collections}</dd>
				</div>
				<div class="rk-health-item">
					<dt>Globals</dt>
					<dd>{health.globals}</dd>
				</div>
				<div class="rk-health-item">
					<dt>Checked at</dt>
					<dd>{health.timestamp}</dd>
				</div>
			</dl>
		</Tile>
	</div>
</div>

<style>
	@import "./page-layout.css";

	:global(.rk-health-card) {
		max-width: 32rem;
	}

	.rk-health-status {
		display: flex;
		align-items: center;
		gap: var(--cds-spacing-03);
		margin-bottom: var(--cds-spacing-06);
		color: var(--cds-text-primary);
	}

	.rk-health-list {
		margin: 0;
	}

	.rk-health-item {
		display: flex;
		justify-content: space-between;
		padding: var(--cds-spacing-04) 0;
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.rk-health-item:last-child {
		border-bottom: none;
	}

	.rk-health-item dt {
		font-size: 0.875rem;
		color: var(--cds-text-secondary);
	}

	.rk-health-item dd {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--cds-text-primary);
	}

</style>
