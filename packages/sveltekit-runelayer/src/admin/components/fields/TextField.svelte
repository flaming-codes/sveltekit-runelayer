<script lang="ts">
	let { name, label, value = $bindable(''), required = false }: {
		name: string; label?: string; value: string; required?: boolean;
	} = $props();
</script>
<label>{label ?? name} <input type="text" {name} bind:value {required} /></label>
