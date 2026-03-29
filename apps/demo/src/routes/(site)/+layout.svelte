<script lang="ts">
  import "carbon-components-svelte/css/g10.css";
  import {
    Header,
    HeaderNav,
    HeaderNavItem,
    SideNav,
    SideNavItems,
    SideNavLink,
    SideNavDivider,
    SkipToContent,
    Content,
  } from "carbon-components-svelte";
  import {
    Home,
    Blog,
    Category,
    UserAvatar,
    ShoppingCatalog,
    Image,
    Information,
  } from "carbon-icons-svelte";

  let { data, children } = $props();

  let isSideNavOpen = $state(false);

  const iconMap: Record<string, any> = {
    "/": Home,
    "/blog": Blog,
    "/categories": Category,
    "/authors": UserAvatar,
    "/products": ShoppingCatalog,
    "/gallery": Image,
    "/about": Information,
  };
</script>

<Header
  companyName="Runelayer"
  platformName="Demo"
  bind:isSideNavOpen={isSideNavOpen}
>
  <svelte:fragment slot="skipToContent">
    <SkipToContent />
  </svelte:fragment>
  <HeaderNav>
    {#each data.navItems as item}
      <HeaderNavItem href={item.href} text={item.label} />
    {/each}
  </HeaderNav>
</Header>

<SideNav bind:isOpen={isSideNavOpen}>
  <SideNavItems>
    {#each data.navItems as item}
      <SideNavLink
        href={item.href}
        text={item.label}
        icon={iconMap[item.href]}
      />
    {/each}
    <SideNavDivider />
    <SideNavLink
      href="/admin"
      text="Admin Panel"
    />
  </SideNavItems>
</SideNav>

<Content>
  {@render children()}
</Content>

<footer class="demo-footer">
  <p>{data.siteSettings.footerText}</p>
</footer>

<style>
  .demo-footer {
    padding: 2rem;
    text-align: center;
    color: var(--cds-text-secondary, #525252);
    border-top: 1px solid var(--cds-border-subtle, #e0e0e0);
    margin-top: 3rem;
  }
</style>
