<script lang="ts">
	import { Checkbox } from "carbon-components-svelte";

	let { name, label, value = $bindable() }: {
		name: string;
		label?: string;
		value?: boolean;
	} = $props();
</script>

<Checkbox id={name} {name} labelText={label ?? name} bind:checked={value} />
