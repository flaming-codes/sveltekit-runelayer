<script lang="ts">
	import { Button } from "carbon-components-svelte";

	let {
		status = 500,
		error = null,
		basePath = "/admin",
	}: {
		status?: number;
		error?: { message?: string } | null;
		basePath?: string;
	} = $props();

	let is404 = $derived(status === 404);
	let is5xx = $derived(status >= 500);

	let title = $derived(is404 ? "Page not found" : is5xx ? "Something went wrong" : "Request failed");
	let subtitle = $derived(
		error?.message ??
			(is404
				? "The page you're looking for doesn't exist or has been moved."
				: is5xx
					? "An unexpected error occurred while processing your request."
					: "The admin request did not complete successfully."),
	);
	let hint = $derived(
		is404
			? "Check that the URL is correct, or navigate back to the dashboard."
			: is5xx
				? "Try refreshing the page. If the problem persists, check the server logs."
				: "You may not have the required permissions, or the resource may have changed.",
	);
</script>

<section class="rk-error-page">
	<div class="rk-error-container">
		<div class="rk-error-status-block" class:rk-error-status-404={is404} class:rk-error-status-5xx={is5xx}>
			<span class="rk-error-code">{status}</span>
		</div>

		<div class="rk-error-body">
			<p class="rk-error-label">{is404 ? "Not Found" : is5xx ? "Server Error" : "Error"}</p>
			<h1 class="rk-error-title">{title}</h1>
			<p class="rk-error-subtitle">{subtitle}</p>
			<p class="rk-error-hint">{hint}</p>

			<div class="rk-error-actions">
				<Button href={basePath}>Go to dashboard</Button>
				<Button kind="secondary" on:click={() => history.back()}>Go back</Button>
			</div>
		</div>
	</div>
</section>

<style>
	.rk-error-page {
		grid-column: 1 / -1;
		display: grid;
		place-items: center;
		min-height: 70vh;
		padding: var(--cds-spacing-07) var(--cds-spacing-05);
	}

	.rk-error-container {
		display: flex;
		width: min(640px, 100%);
		border: 1px solid var(--cds-border-subtle);
		background: var(--cds-layer-02);
		overflow: hidden;
	}

	.rk-error-status-block {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 140px;
		padding: var(--cds-spacing-07) var(--cds-spacing-06);
		background: var(--cds-layer-accent-01);
	}

	.rk-error-status-404 {
		background: var(--cds-support-warning);
	}

	.rk-error-status-5xx {
		background: var(--cds-support-error);
	}

	.rk-error-code {
		font-size: 3.5rem;
		font-weight: 300;
		line-height: 1;
		letter-spacing: -0.02em;
		color: var(--cds-text-primary);
	}

	.rk-error-status-404 .rk-error-code {
		color: var(--cds-text-inverse);
	}

	.rk-error-body {
		flex: 1;
		padding: var(--cds-spacing-07);
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
	}

	.rk-error-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--cds-text-helper);
		margin: 0;
	}

	.rk-error-title {
		font-size: 1.5rem;
		font-weight: 400;
		line-height: 1.3;
		margin: 0;
		color: var(--cds-text-primary);
	}

	.rk-error-subtitle {
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--cds-text-secondary);
		margin: var(--cds-spacing-02) 0 0;
	}

	.rk-error-hint {
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--cds-text-helper);
		margin: 0;
		padding-top: var(--cds-spacing-03);
		border-top: 1px solid var(--cds-border-subtle);
	}

	.rk-error-actions {
		display: flex;
		gap: var(--cds-spacing-04);
		margin-top: var(--cds-spacing-05);
	}

	/* Carbon md breakpoint (672px) */
	@media (max-width: 672px) {
		.rk-error-container {
			flex-direction: column;
		}

		.rk-error-status-block {
			min-width: unset;
			padding: var(--cds-spacing-06);
		}

		.rk-error-code {
			font-size: 2.5rem;
		}

		.rk-error-body {
			padding: var(--cds-spacing-06);
		}

		.rk-error-actions {
			flex-direction: column;
		}
	}
</style>
