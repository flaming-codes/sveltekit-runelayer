<script lang="ts">
	let { name, label, value = $bindable(''), required = false, includeTime = false }: {
		name: string; label?: string; value: string; required?: boolean; includeTime?: boolean;
	} = $props();
</script>
<label>{label ?? name} <input type={includeTime ? 'datetime-local' : 'date'} {name} bind:value {required} /></label>
