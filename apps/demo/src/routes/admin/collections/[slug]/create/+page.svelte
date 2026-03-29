<script lang="ts">
  import { CollectionEdit } from "@flaming-codes/sveltekit-runelayer/admin";

  let { data } = $props();
</script>

<CollectionEdit collection={data.collection} document={null} basePath="/admin" />
