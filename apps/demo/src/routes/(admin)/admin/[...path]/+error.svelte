<script lang="ts">
  import { AdminErrorPage } from "@flaming-codes/sveltekit-runelayer/sveltekit";

  let { status, error } = $props();
</script>

<AdminErrorPage {status} {error} />
