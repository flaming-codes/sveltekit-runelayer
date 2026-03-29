<script lang="ts">
  import { AdminLayout } from "@flaming-codes/sveltekit-runelayer/admin";

  let { data, children } = $props();
</script>

<AdminLayout
  collections={data.collections}
  globals={data.globals}
  user={data.user}
  basePath="/admin"
>
  {@render children()}
</AdminLayout>
