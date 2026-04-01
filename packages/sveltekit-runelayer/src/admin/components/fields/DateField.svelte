<script lang="ts">
	import { TextInput } from "carbon-components-svelte";

	let { name, label, value = $bindable(), required = false, includeTime = false }: {
		name: string;
		label?: string;
		value?: string;
		required?: boolean;
		includeTime?: boolean;
	} = $props();
</script>

<TextInput
	id={name}
	{name}
	type={includeTime ? "datetime-local" : "date"}
	labelText={label ?? name}
	bind:value
	{required}
/>
