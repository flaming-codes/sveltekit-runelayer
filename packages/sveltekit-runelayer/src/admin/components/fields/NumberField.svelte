<script lang="ts">
	import { NumberInput } from "carbon-components-svelte";

	let { name, label, value = $bindable(), required = false, invalid = false, invalidText = "" }: {
		name: string;
		label?: string;
		value?: null | number;
		required?: boolean;
		invalid?: boolean;
		invalidText?: string;
	} = $props();
</script>

<NumberInput id={name} {name} labelText={label ?? name} bind:value {required} {invalid} {invalidText} allowEmpty />
