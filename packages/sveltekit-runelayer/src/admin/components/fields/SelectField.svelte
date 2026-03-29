<script lang="ts">
	let { name, label, value = $bindable(''), options = [], required = false }: {
		name: string; label?: string; value: string; options: { label: string; value: string }[]; required?: boolean;
	} = $props();
</script>
<label>{label ?? name}
	<select {name} bind:value {required}>
		<option value="">-- Select --</option>
		{#each options as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
</label>
