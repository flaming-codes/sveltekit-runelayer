<script lang="ts">
  import { AdminErrorPage } from "@flaming-codes/sveltekit-runelayer/sveltekit/components";

  let { status, error } = $props();
</script>

<AdminErrorPage {status} {error} />
