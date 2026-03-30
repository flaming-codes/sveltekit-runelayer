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
		setupAction = "?/createFirstUser",
		error = "",
		mode = "login",
		ui = {},
	}: {
		action?: string;
		setupAction?: string;
		error?: string;
		mode?: "login" | "create-first-user";
		ui?: { appName?: string; productName?: string };
	} = $props();

	let name = $state("");
	let email = $state("");
	let password = $state("");
	let isCreateFirstUser = $derived(mode === "create-first-user");
	let formAction = $derived(isCreateFirstUser ? setupAction : action);
	let errorTitle = $derived(isCreateFirstUser ? "Setup failed" : "Authentication failed");
	let subtitle = $derived(
		isCreateFirstUser
			? "Create the first administrator account to unlock the CMS."
			: "Sign in to access the admin workspace.",
	);
	let submitLabel = $derived(isCreateFirstUser ? "Create admin user" : "Sign in");
	let appName = $derived(ui.appName ?? "Runelayer");
	let productName = $derived(ui.productName ?? "CMS");
</script>

<section class="rk-login-page">
	<div class="rk-login-wrapper">
		<div class="rk-login-header">
			<p class="rk-login-eyebrow">{appName}</p>
			<h1 class="rk-login-title">{productName}</h1>
			<p class="rk-login-subtitle">{subtitle}</p>
		</div>

		<Tile class="rk-login-card">
			{#if error}
				<InlineNotification
					kind="error"
					title={errorTitle}
					subtitle={error}
					lowContrast
					hideCloseButton
				/>
			{/if}

			<form method="POST" action={formAction} class="rk-login-form">
				{#if isCreateFirstUser}
					<TextInput
						id="name"
						name="name"
						bind:value={name}
						labelText="Full name"
						placeholder="Admin User"
						required
					/>
				{/if}
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
				<Button type="submit" icon={Login}>{submitLabel}</Button>
			</form>
		</Tile>
	</div>
</section>

<style>
	.rk-login-page {
		display: grid;
		place-items: center;
		min-height: 100vh;
		padding: var(--cds-spacing-07);
		background: var(--cds-background);
	}

	.rk-login-wrapper {
		width: min(28rem, 100%);
	}

	.rk-login-header {
		margin-bottom: var(--cds-spacing-07);
	}

	.rk-login-eyebrow {
		margin: 0 0 var(--cds-spacing-02);
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
		margin: var(--cds-spacing-03) 0 0;
		font-size: 1rem;
		line-height: 1.5;
		color: var(--cds-text-secondary);
	}

	:global(.rk-login-card) {
		padding: var(--cds-spacing-07);
	}

	.rk-login-form {
		display: flex;
		flex-direction: column;
		gap: var(--cds-spacing-06);
	}
</style>
