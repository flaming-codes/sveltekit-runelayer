<script lang="ts">
	import { AdminErrorPage as AdminErrorView } from "../admin/index.js";

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
