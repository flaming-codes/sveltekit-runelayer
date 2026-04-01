<script lang="ts">
	import JsonField from "./JsonField.svelte";

	let { name, label, value = $bindable(), required = false }: {
		name: string;
		label?: string;
		value?: unknown;
		required?: boolean;
	} = $props();
</script>

<JsonField
	{name}
	{label}
	bind:value
	{required}
	helperText="Rich text JSON (Tiptap integration placeholder)"
/>
