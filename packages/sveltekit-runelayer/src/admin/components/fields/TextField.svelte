<script lang="ts">
	import { TextInput } from "carbon-components-svelte";

	let { name, label, value = $bindable(), required = false, type = "text", invalid = false, invalidText = "" }: {
		name: string;
		label?: string;
		value?: null | number | string;
		required?: boolean;
		type?: "text" | "email" | "slug" | "number";
		invalid?: boolean;
		invalidText?: string;
	} = $props();
</script>

<TextInput id={name} {name} labelText={label ?? name} bind:value {type} {required} {invalid} {invalidText} />
