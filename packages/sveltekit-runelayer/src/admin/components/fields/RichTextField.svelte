<script lang="ts">
	import { TextArea } from "carbon-components-svelte";

	let { name, label, value = $bindable(), required = false }: {
		name: string;
		label?: string;
		value?: unknown;
		required?: boolean;
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
	helperText="Rich text JSON (Tiptap integration placeholder)"
	value={serializeValue(value)}
	rows={8}
	{required}
	on:input={(event: Event) => {
		value = (event.target as HTMLTextAreaElement | null)?.value ?? "";
	}}
/>
