<script lang="ts">
  import "carbon-components-svelte/css/all.css";

  let { children } = $props();
</script>

{@render children()}
