<script lang="ts">
	import { TextArea } from "carbon-components-svelte";

	let { name, label, value = $bindable(), required = false, helperText = "JSON payload" }: {
		name: string;
		label?: string;
		value?: unknown;
		required?: boolean;
		helperText?: string;
	} = $props();

	let rawText = $state(serializeValue(value));
	let parseError = $state("");

	// Sync external value changes into the raw text
	$effect(() => {
		const serialized = serializeValue(value);
		if (serialized !== rawText) {
			rawText = serialized;
			parseError = "";
		}
	});

	function serializeValue(input: unknown) {
		if (typeof input === "string") return input;
		if (input === null || input === undefined) return "";
		return JSON.stringify(input, null, 2);
	}

	function handleInput(event: Event) {
		rawText = (event.target as HTMLTextAreaElement | null)?.value ?? "";
	}

	function handleBlur() {
		const trimmed = rawText.trim();
		if (trimmed === "") {
			value = undefined;
			parseError = "";
			return;
		}
		try {
			value = JSON.parse(trimmed);
			parseError = "";
		} catch (e) {
			parseError = "Invalid JSON: " + (e instanceof Error ? e.message : String(e));
		}
	}
</script>

<div class="rk-json-field">
	<TextArea
		id={name}
		{name}
		labelText={label ?? name}
		helperText={parseError || helperText}
		invalid={!!parseError}
		value={rawText}
		rows={8}
		{required}
		on:input={handleInput}
		on:blur={handleBlur}
	/>
</div>

<style>
	.rk-json-field {
		display: grid;
	}
</style>
