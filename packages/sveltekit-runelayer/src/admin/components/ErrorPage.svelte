<script lang="ts">
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
				<a class="rk-error-btn-primary" href={basePath}>Go to dashboard</a>
				<button class="rk-error-btn-secondary" type="button" onclick={() => history.back()}>Go back</button>
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
		padding: 2rem 1rem;
	}

	.rk-error-container {
		display: flex;
		width: min(640px, 100%);
		border: 1px solid var(--cds-border-subtle, #525252);
		background: var(--cds-layer-02, #262626);
		overflow: hidden;
	}

	.rk-error-status-block {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 140px;
		padding: 2rem 1.5rem;
		background: var(--cds-layer-accent-01, #393939);
	}

	.rk-error-status-404 {
		background: var(--cds-support-warning, #f1c21b);
	}

	.rk-error-status-5xx {
		background: var(--cds-support-error, #da1e28);
	}

	.rk-error-code {
		font-size: 3.5rem;
		font-weight: 300;
		line-height: 1;
		letter-spacing: -0.02em;
		color: var(--cds-text-primary, #f4f4f4);
	}

	.rk-error-status-404 .rk-error-code {
		color: var(--cds-text-inverse, #161616);
	}

	.rk-error-body {
		flex: 1;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.rk-error-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--cds-text-helper, #a8a8a8);
		margin: 0;
	}

	.rk-error-title {
		font-size: 1.5rem;
		font-weight: 400;
		line-height: 1.3;
		margin: 0;
		color: var(--cds-text-primary, #f4f4f4);
	}

	.rk-error-subtitle {
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--cds-text-secondary, #c6c6c6);
		margin: 0.25rem 0 0;
	}

	.rk-error-hint {
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--cds-text-helper, #a8a8a8);
		margin: 0;
		padding-top: 0.5rem;
		border-top: 1px solid var(--cds-border-subtle, #525252);
	}

	.rk-error-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.rk-error-btn-primary {
		display: inline-flex;
		align-items: center;
		padding: 0.6875rem 1rem;
		font-size: 0.875rem;
		font-weight: 400;
		background: var(--cds-button-primary, #0f62fe);
		color: #fff;
		text-decoration: none;
		border: none;
		cursor: pointer;
		transition: background 0.15s;
	}

	.rk-error-btn-primary:hover {
		background: var(--cds-button-primary-hover, #0353e9);
	}

	.rk-error-btn-secondary {
		display: inline-flex;
		align-items: center;
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		font-weight: 400;
		background: transparent;
		color: var(--cds-text-primary, #f4f4f4);
		border: 1px solid var(--cds-button-secondary, #6f6f6f);
		cursor: pointer;
		transition: background 0.15s;
	}

	.rk-error-btn-secondary:hover {
		background: var(--cds-layer-hover-02, #474747);
	}

	@media (max-width: 480px) {
		.rk-error-container {
			flex-direction: column;
		}

		.rk-error-status-block {
			min-width: unset;
			padding: 1.5rem;
		}

		.rk-error-code {
			font-size: 2.5rem;
		}

		.rk-error-body {
			padding: 1.5rem;
		}

		.rk-error-actions {
			flex-direction: column;
		}
	}
</style>
