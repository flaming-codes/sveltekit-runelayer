<script lang="ts">
	let { name, label, value = $bindable(""), required = false, includeTime = false }: {
		name: string;
		label?: string;
		value: string;
		required?: boolean;
		includeTime?: boolean;
	} = $props();
</script>

<label class="rk-field-label" for={name}>{label ?? name}</label>
<input
	class="rk-field-input"
	id={name}
	{name}
	type={includeTime ? "datetime-local" : "date"}
	bind:value
	required={required}
/>
