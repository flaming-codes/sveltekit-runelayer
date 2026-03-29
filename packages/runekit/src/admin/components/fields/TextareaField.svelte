<script lang="ts">
	let { name, label, value = $bindable(''), required = false }: {
		name: string; label?: string; value: string; required?: boolean;
	} = $props();
</script>
<label>{label ?? name} <textarea {name} bind:value {required} rows="4"></textarea></label>
