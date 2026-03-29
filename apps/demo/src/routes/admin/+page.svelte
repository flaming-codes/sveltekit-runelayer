<script lang="ts">
  import { Dashboard } from "@flaming-codes/sveltekit-runelayer/admin";

  let { data } = $props();
</script>

<Dashboard collections={data.collections} basePath="/admin" />
