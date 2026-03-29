<script lang="ts">
	import {
		Button,
		InlineNotification,
		PasswordInput,
		TextInput,
		Tile,
	} from "carbon-components-svelte";
	import { Login } from "carbon-icons-svelte";

	let {
		action = "?/login",
		error = "",
		ui = {},
	}: {
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
	<div class="rk-login-wrapper">
		<div class="rk-login-header">
			<p class="rk-login-eyebrow">{appName}</p>
			<h1 class="rk-login-title">{productName}</h1>
			<p class="rk-login-subtitle">Sign in to access the admin workspace.</p>
		</div>

		<Tile class="rk-login-card">
			{#if error}
				<InlineNotification
					kind="error"
					title="Authentication failed"
					subtitle={error}
					lowContrast
					hideCloseButton
				/>
			{/if}

			<form method="POST" {action} class="rk-login-form">
				<TextInput
					id="email"
					name="email"
					type="email"
					bind:value={email}
					labelText="Email"
					placeholder="admin@example.com"
					required
				/>
				<PasswordInput
					id="password"
					name="password"
					bind:value={password}
					labelText="Password"
					placeholder="Enter password"
					required
				/>
				<Button type="submit" icon={Login}>Sign in</Button>
			</form>
		</Tile>
	</div>
</section>

<style>
	.rk-login-page {
		display: grid;
		place-items: center;
		min-height: 100vh;
		padding: 2rem;
		background: var(--cds-background);
	}

	.rk-login-wrapper {
		width: min(28rem, 100%);
	}

	.rk-login-header {
		margin-bottom: 2rem;
	}

	.rk-login-eyebrow {
		margin: 0 0 0.25rem;
		font-size: 0.75rem;
		line-height: 1.34;
		letter-spacing: 0.32px;
		text-transform: uppercase;
		color: var(--cds-text-secondary);
	}

	.rk-login-title {
		margin: 0;
		font-size: 2.625rem;
		font-weight: 300;
		line-height: 1.2;
		color: var(--cds-text-primary);
	}

	.rk-login-subtitle {
		margin: 0.5rem 0 0;
		font-size: 1rem;
		line-height: 1.5;
		color: var(--cds-text-secondary);
	}

	:global(.rk-login-card) {
		padding: 2rem;
	}

	.rk-login-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
</style>
