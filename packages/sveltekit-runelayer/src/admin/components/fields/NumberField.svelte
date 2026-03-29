<script lang="ts">
	let { name, label, value = $bindable(0), required = false }: {
		name: string;
		label?: string;
		value: number;
		required?: boolean;
	} = $props();
</script>

<label class="rk-field-label" for={name}>{label ?? name}</label>
<input class="rk-field-input" id={name} {name} type="number" bind:value required={required} />
