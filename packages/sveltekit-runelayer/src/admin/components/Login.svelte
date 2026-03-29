<script lang="ts">
	let { action = "?/login", error = "", ui = {} }: {
		action?: string;
		error?: string;
		ui?: { appName?: string; productName?: string };
	} = $props();
	let email = $state("");
	let password = $state("");
	let appName = $derived(ui.appName ?? "Runelayer");
	let productName = $derived(ui.productName ?? "CMS");
</script>

<section class="rk-login-page">
	<div class="rk-login-card">
		<h1>{appName} {productName}</h1>
		<p>Sign in to access the admin workspace.</p>
		{#if error}
			<p class="rk-error">{error}</p>
		{/if}
		<form method="POST" {action}>
			<label for="email">Email</label>
			<input id="email" name="email" type="email" bind:value={email} required />
			<label for="password">Password</label>
			<input id="password" name="password" type="password" bind:value={password} required />
			<button type="submit">Sign In</button>
		</form>
	</div>
</section>

<style>
	.rk-login-page {
		grid-column: 1 / -1;
		display: grid;
		place-items: center;
		min-height: 70vh;
	}

	.rk-login-card {
		width: min(460px, 100%);
		padding: 1.5rem;
		border: 1px solid var(--cds-border-subtle);
		background: var(--cds-layer-02);
	}

	.rk-login-card p {
		color: var(--cds-text-secondary);
		margin: 0.5rem 0 1rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	input {
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--cds-border-strong-01);
		background: var(--cds-field);
		color: inherit;
	}

	button {
		margin-top: 0.5rem;
		padding: 0.65rem 0.9rem;
		border: 1px solid var(--cds-button-primary);
		background: var(--cds-button-primary);
		color: var(--cds-text-on-color);
		cursor: pointer;
	}

	.rk-error {
		color: var(--cds-support-error);
		font-weight: 600;
	}
</style>
