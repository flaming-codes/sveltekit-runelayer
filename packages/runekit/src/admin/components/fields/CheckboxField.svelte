<script lang="ts">
	let { name, label, value = $bindable(false) }: {
		name: string; label?: string; value: boolean;
	} = $props();
</script>
<label><input type="checkbox" {name} bind:checked={value} /> {label ?? name}</label>
