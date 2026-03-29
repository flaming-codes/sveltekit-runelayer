<script lang="ts">
	import { NumberInput } from "carbon-components-svelte";

	let { name, label, value = $bindable(), required = false }: {
		name: string;
		label?: string;
		value?: null | number;
		required?: boolean;
	} = $props();
</script>

<NumberInput id={name} {name} labelText={label ?? name} bind:value {required} allowEmpty />
