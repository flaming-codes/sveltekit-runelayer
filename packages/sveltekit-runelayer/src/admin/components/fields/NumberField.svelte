<script lang="ts">
	let { name, label, value = $bindable(0), required = false }: {
		name: string; label?: string; value: number; required?: boolean;
	} = $props();
</script>
<label>{label ?? name} <input type="number" {name} bind:value {required} /></label>
