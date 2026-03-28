<script lang="ts">
  import { createRunekit, defineConfig } from 'runekit';

  const config = defineConfig({ adminPath: '/admin' });
  const kit = createRunekit(config);
</script>

<h1>svelte-runekit</h1>
<p>CMS admin available at <a href={kit.adminPath}>{kit.adminPath}</a></p>
