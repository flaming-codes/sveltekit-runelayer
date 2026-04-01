<script lang="ts">
	import { TextArea } from "carbon-components-svelte";

	let { name, label, value = $bindable(), required = false, helperText = "JSON payload" }: {
		name: string;
		label?: string;
		value?: unknown;
		required?: boolean;
		helperText?: string;
	} = $props();

	function serializeValue(input: unknown) {
		if (typeof input === "string") return input;
		if (input === null || input === undefined) return "";
		return JSON.stringify(input, null, 2);
	}
</script>

<TextArea
	id={name}
	{name}
	labelText={label ?? name}
	{helperText}
	value={serializeValue(value)}
	rows={8}
	{required}
	on:input={(event: Event) => {
		value = (event.target as HTMLTextAreaElement | null)?.value ?? "";
	}}
/>
