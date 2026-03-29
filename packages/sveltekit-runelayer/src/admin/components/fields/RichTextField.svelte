<script lang="ts">
	let { name, label, value = $bindable(""), required = false }: {
		name: string;
		label?: string;
		value: string;
		required?: boolean;
	} = $props();
</script>

<label class="rk-field-label" for={name}>{label ?? name}</label>
<p class="rk-field-help">Rich text JSON (Tiptap integration placeholder)</p>
<textarea class="rk-field-input rk-field-textarea" id={name} {name} bind:value required={required} rows={8}
></textarea>
