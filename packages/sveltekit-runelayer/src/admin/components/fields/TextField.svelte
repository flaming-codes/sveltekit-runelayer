<script lang="ts">
	let { name, label, value = $bindable(""), required = false, type = "text" }: {
		name: string;
		label?: string;
		value: string;
		required?: boolean;
		type?: "text" | "email" | "slug" | "number";
	} = $props();
</script>

<label class="rk-field-label" for={name}>{label ?? name}</label>
<input class="rk-field-input" id={name} {name} {type} bind:value required={required} />
