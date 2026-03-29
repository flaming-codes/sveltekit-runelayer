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

	let title = $derived(status === 404 ? "Page not found" : status >= 500 ? "Something went wrong" : "Request failed");
	let subtitle = $derived(error?.message ?? "The admin request did not complete successfully.");
</script>

<section class="rk-error-page">
	<div class="rk-error-card">
		<h1>{status}: {title}</h1>
		<p>{subtitle}</p>
		<a href={basePath}>Back to admin</a>
	</div>
</section>

<style>
	.rk-error-page {
		grid-column: 1 / -1;
		display: grid;
		place-items: center;
		min-height: 70vh;
	}

	.rk-error-card {
		width: min(560px, 100%);
		padding: 1.5rem;
		border: 1px solid var(--cds-border-subtle, #525252);
		background: var(--cds-layer-02, #262626);
	}

	.rk-error-card p {
		margin: 0.75rem 0 1.25rem;
		color: var(--cds-text-secondary, #c6c6c6);
	}

	.rk-error-card a {
		display: inline-block;
		padding: 0.6rem 1rem;
		background: var(--cds-button-primary, #0f62fe);
		color: #fff;
		text-decoration: none;
	}
</style>
