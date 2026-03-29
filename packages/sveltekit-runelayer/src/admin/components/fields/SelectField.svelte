<script lang="ts">
	let { name, label, value = $bindable(""), options = [], required = false }: {
		name: string;
		label?: string;
		value: string;
		options: { label: string; value: string }[];
		required?: boolean;
	} = $props();
</script>

<label class="rk-field-label" for={name}>{label ?? name}</label>
<select class="rk-field-input" id={name} {name} bind:value required={required}>
	<option value="">Select an option</option>
	{#each options as option}
		<option value={option.value}>{option.label}</option>
	{/each}
</select>
