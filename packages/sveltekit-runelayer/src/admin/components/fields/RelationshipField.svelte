<script lang="ts">
	import { TextInput } from "carbon-components-svelte";

	let { name, label, value = $bindable(), relationTo = "", required = false }: {
		name: string;
		label?: string;
		value?: string;
		relationTo: string | string[];
		required?: boolean;
	} = $props();
	let target = $derived(Array.isArray(relationTo) ? relationTo.join(", ") : relationTo);
</script>

<TextInput
	id={name}
	{name}
	type="text"
	labelText={label ?? name}
	helperText={`Document ID (relation: ${target})`}
	placeholder="Document ID"
	bind:value
	{required}
/>
