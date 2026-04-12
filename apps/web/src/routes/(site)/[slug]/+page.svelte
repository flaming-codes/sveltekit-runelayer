<script lang="ts">
  import MarketingPage from "$lib/components/marketing/MarketingPage.svelte";

  let { data } = $props();
</script>

<MarketingPage page={data.page} chrome={data.chrome} />
