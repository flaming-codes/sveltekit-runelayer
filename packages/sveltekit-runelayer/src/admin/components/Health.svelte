<script lang="ts">
	import { Tag, Tile } from "carbon-components-svelte";
	import { Checkmark, WarningAlt } from "carbon-icons-svelte";

	let {
		health = { status: "unknown", database: false, collections: 0, globals: 0, timestamp: "" },
	}: {
		health?: {
			status: string;
			database: boolean;
			collections: number;
			globals: number;
			timestamp: string;
		};
	} = $props();
</script>

<div class="rk-health">
	<div class="rk-health-header">
		<h1 class="rk-health-title">System Health</h1>
	</div>

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

		<div class="rk-health-details">
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
		</div>
	</Tile>
</div>

<style>
	.rk-health {
		grid-column: 1 / -1;
	}

	.rk-health-header {
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--cds-border-subtle);
	}

	.rk-health-title {
		margin: 0;
		font-size: 2.625rem;
		font-weight: 300;
		line-height: 1.2;
		color: var(--cds-text-primary);
	}

	:global(.rk-health-card) {
		max-width: 32rem;
	}

	.rk-health-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		color: var(--cds-text-primary);
	}

	.rk-health-list {
		margin: 0;
	}

	.rk-health-item {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem 0;
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
