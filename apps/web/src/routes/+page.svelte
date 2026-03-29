<script lang="ts">
  import { createRunekit, defineConfig } from '@flaming-codes/sveltekit-runelayer';

  const config = defineConfig({ adminPath: '/admin' });
  const kit = createRunekit(config);
</script>

<h1>sveltekit-runelayer</h1>
<p>CMS admin available at <a href={kit.adminPath}>{kit.adminPath}</a></p>
