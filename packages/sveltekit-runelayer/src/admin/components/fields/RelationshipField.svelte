<script lang="ts">
	let { name, label, value = $bindable(''), relationTo = '', required = false }: {
		name: string; label?: string; value: string; relationTo: string | string[]; required?: boolean;
	} = $props();
	let target = $derived(Array.isArray(relationTo) ? relationTo.join(', ') : relationTo);
</script>
<label>{label ?? name} <span style="font-size:0.8em;color:#666">(relates to: {target})</span>
	<input type="text" {name} bind:value {required} placeholder="Document ID" />
</label>
