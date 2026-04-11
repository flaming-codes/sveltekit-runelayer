<script lang="ts">
  import { Theme } from "carbon-components-svelte";
  import "/src/app.css";
  import SiteFooter from "$lib/components/marketing/SiteFooter.svelte";
  import SiteHeader from "$lib/components/marketing/SiteHeader.svelte";

  let { data, children } = $props();
</script>

<Theme theme="white">
  <div class="rl-grid-lines" aria-hidden="true">
    <div></div><div></div><div></div><div></div><div></div><div></div>
    <div></div><div></div><div></div><div></div><div></div><div></div>
  </div>
  <div class="rl-shell">
    <SiteHeader chrome={data.chrome} currentPath={data.currentPath} />
    <main id="main-content" class="rl-main">{@render children()}</main>
    <SiteFooter chrome={data.chrome} />
  </div>
</Theme>
