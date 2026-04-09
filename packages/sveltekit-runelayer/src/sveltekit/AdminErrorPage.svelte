<script lang="ts">
	import AdminErrorView from "../admin/components/ErrorPage.svelte";

	let {
		status = 500,
		error = null,
		basePath = "/admin",
	}: {
		status?: number;
		error?: { message?: string } | null;
		basePath?: string;
	} = $props();
</script>

<AdminErrorView {status} {error} {basePath} />
