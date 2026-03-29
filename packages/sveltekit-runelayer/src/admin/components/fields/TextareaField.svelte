<script lang="ts">
	import { TextArea } from "carbon-components-svelte";

	let { name, label, value = $bindable(), required = false }: {
		name: string;
		label?: string;
		value?: null | string;
		required?: boolean;
	} = $props();
</script>

<TextArea id={name} {name} labelText={label ?? name} bind:value {required} rows={4} />
