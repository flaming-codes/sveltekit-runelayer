<script lang="ts">
	let { action = '?/login', error = '' }: { action?: string; error?: string } = $props();
	let email = $state('');
	let password = $state('');
</script>

<div class="rk-login">
	<h1>Login</h1>
	{#if error}<p class="rk-error">{error}</p>{/if}
	<form method="POST" {action}>
		<label>Email <input type="email" name="email" bind:value={email} required /></label>
		<label>Password <input type="password" name="password" bind:value={password} required /></label>
		<button type="submit">Sign In</button>
	</form>
</div>

<style>
	.rk-login { max-width: 320px; margin: 4rem auto; font-family: system-ui, sans-serif; }
	.rk-login label { display: block; margin-bottom: 0.75rem; }
	.rk-login input { display: block; width: 100%; padding: 0.4rem; margin-top: 0.25rem; }
	.rk-login button { margin-top: 0.5rem; padding: 0.5rem 1.5rem; }
	.rk-error { color: red; }
</style>
