<script lang="ts">
	import { TextArea } from "carbon-components-svelte";

	let { name, label, value = $bindable(), required = false, invalid = false, invalidText = "" }: {
		name: string;
		label?: string;
		value?: null | string;
		required?: boolean;
		invalid?: boolean;
		invalidText?: string;
	} = $props();
</script>

<TextArea id={name} {name} labelText={label ?? name} bind:value {required} {invalid} {invalidText} rows={4} />
