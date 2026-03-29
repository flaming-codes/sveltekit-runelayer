<script lang="ts">
	let { name, label, value = $bindable(false) }: {
		name: string;
		label?: string;
		value: boolean;
	} = $props();
</script>

<label class="rk-field-checkbox" for={name}>
	<input id={name} {name} type="checkbox" bind:checked={value} />
	<span>{label ?? name}</span>
</label>
