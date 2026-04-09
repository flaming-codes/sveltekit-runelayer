<script lang="ts">
  import { AdminRoutePage } from "@flaming-codes/sveltekit-runelayer/sveltekit/components";
  import type { RunelayerAdminPageProps } from "@flaming-codes/sveltekit-runelayer/sveltekit/components";

  let { data, form }: RunelayerAdminPageProps = $props();
</script>

<AdminRoutePage {data} {form} />
