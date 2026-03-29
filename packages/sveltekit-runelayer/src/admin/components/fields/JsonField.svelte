<script lang="ts">
	let { name, label, value = $bindable('{}'), required = false }: {
		name: string; label?: string; value: string; required?: boolean;
	} = $props();
</script>
<label>{label ?? name} <span style="font-size:0.8em;color:#666">(JSON)</span>
	<textarea {name} bind:value {required} rows="6" style="font-family:monospace"></textarea>
</label>
