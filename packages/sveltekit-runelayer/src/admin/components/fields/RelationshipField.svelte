<script lang="ts">
	let { name, label, value = $bindable(""), relationTo = "", required = false }: {
		name: string;
		label?: string;
		value: string;
		relationTo: string | string[];
		required?: boolean;
	} = $props();
	let target = $derived(Array.isArray(relationTo) ? relationTo.join(", ") : relationTo);
</script>

<label class="rk-field-label" for={name}>{label ?? name}</label>
<p class="rk-field-help">Document ID (relation: {target})</p>
<input
	class="rk-field-input"
	id={name}
	{name}
	type="text"
	bind:value
	required={required}
	placeholder="Document ID"
/>
