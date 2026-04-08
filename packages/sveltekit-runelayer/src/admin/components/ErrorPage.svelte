<script lang="ts">
	import {
		Breadcrumb,
		BreadcrumbItem,
		Button,
		ButtonSet,
		Tag,
		Tile,
	} from "carbon-components-svelte";

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
	let label = $derived(is404 ? "Not Found" : is5xx ? "Server Error" : "Error");
	let tagType: "warm-gray" | "red" | "cool-gray" = $derived(
		is404 ? "warm-gray" : is5xx ? "red" : "cool-gray",
	);
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
	<div class="rk-page-header">
		<div class="rk-page-header-inner">
			<Breadcrumb noTrailingSlash>
				<BreadcrumbItem href={basePath}>Dashboard</BreadcrumbItem>
				<BreadcrumbItem href={basePath} isCurrentPage>{label}</BreadcrumbItem>
			</Breadcrumb>
		</div>
	</div>

	<div class="rk-page-body rk-error-body">
		<div class="rk-error-frame">
			<Tile class="rk-error-tile">
				<div class="rk-error-stack">
					<Tag size="sm" type={tagType}>{label}</Tag>
					<p class="rk-error-code">{status}</p>
					<div class="rk-error-copy">
						<h1>{title}</h1>
						<p class="rk-error-subtitle">{subtitle}</p>
						<p class="rk-error-hint">{hint}</p>
					</div>
					<ButtonSet>
						<Button href={basePath}>Go to dashboard</Button>
						<Button kind="secondary" on:click={() => history.back()}>Go back</Button>
					</ButtonSet>
				</div>
			</Tile>
		</div>
	</div>
</section>

<style>
	@import "./page-layout.css";

	.rk-error-page {
		min-height: 100svh;
		display: grid;
		grid-template-rows: auto 1fr;
	}

	.rk-error-body {
		display: flex;
		align-items: center;
	}

	.rk-error-frame {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	:global(.rk-error-tile) {
		width: fit-content;
		max-width: min(100%, 40rem);
	}

	.rk-error-stack {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-05);
		align-items: flex-start;
	}

	.rk-error-code {
		margin: 0;
		font-size: clamp(4rem, 11vw, 7rem);
		font-weight: 300;
		line-height: 0.85;
		letter-spacing: -0.04em;
		color: var(--cds-text-primary);
	}

	.rk-error-copy {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-03);
		max-width: 36rem;
	}

	.rk-error-copy h1 {
		margin: 0;
		font-size: clamp(1.75rem, 3vw, 2.5rem);
		font-weight: 300;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}

	.rk-error-subtitle,
	.rk-error-hint {
		margin: 0;
		font-size: 1rem;
		line-height: 1.5;
	}

	.rk-error-subtitle {
		color: var(--cds-text-primary);
	}

	.rk-error-hint {
		color: var(--cds-text-secondary);
	}

	@media (max-width: 672px) {
		.rk-error-body {
			align-items: flex-start;
		}

		:global(.rk-error-tile) {
			width: 100%;
		}
	}
</style>
