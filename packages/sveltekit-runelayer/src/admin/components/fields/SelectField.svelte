<script lang="ts">
	import { Select, SelectItem } from "carbon-components-svelte";

	let { name, label, value = $bindable(), options = [], required = false }: {
		name: string;
		label?: string;
		value?: string;
		options: { label: string; value: string }[];
		required?: boolean;
	} = $props();
</script>

<Select id={name} {name} labelText={label ?? name} bind:selected={value} {required}>
	<SelectItem value="" text="Select an option" />
	{#each options as option}
		<SelectItem value={option.value} text={option.label} />
	{/each}
</Select>
