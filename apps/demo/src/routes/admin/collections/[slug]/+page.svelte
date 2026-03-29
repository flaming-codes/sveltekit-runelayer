<script lang="ts">
  import { CollectionList } from "@flaming-codes/sveltekit-runelayer/admin";

  let { data } = $props();
</script>

<CollectionList
  collection={data.collection}
  documents={data.docs}
  page={data.page}
  totalPages={data.totalPages}
  basePath="/admin"
/>
