<script lang="ts">
  import {
    Grid,
    Row,
    Column,
    Tile,
    Tag,
    Breadcrumb,
    BreadcrumbItem,
    UnorderedList,
    ListItem,
  } from "carbon-components-svelte";

  let { data } = $props();

  let settings = $derived(data.settings);
  let stats = $derived(data.stats);
</script>

<Grid>
  <Row>
    <Column>
      <Breadcrumb noTrailingSlash>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem href="/about" isCurrentPage>About</BreadcrumbItem>
      </Breadcrumb>
    </Column>
  </Row>

  <Row>
    <Column>
      <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">
        {settings.siteName ?? "Runekit Demo"}
      </h1>
      {#if settings.tagline}
        <p style="font-size: 1.25rem; color: var(--cds-text-secondary); margin-bottom: 1.5rem;">
          {settings.tagline}
        </p>
      {/if}
    </Column>
  </Row>

  {#if settings.description}
    <Row>
      <Column>
        <Tile style="margin-bottom: 2rem;">
          <p>{settings.description}</p>
        </Tile>
      </Column>
    </Row>
  {/if}

  <Row>
    <Column>
      <h2 style="margin-bottom: 1rem;">Site Statistics</h2>
    </Column>
  </Row>

  <Row>
    <Column lg={5} md={4} sm={4}>
      <Tile style="margin-bottom: 1rem; text-align: center;">
        <h3 style="font-size: 2rem;">{stats.authors}</h3>
        <Tag type="blue">Authors</Tag>
      </Tile>
    </Column>
    <Column lg={5} md={4} sm={4}>
      <Tile style="margin-bottom: 1rem; text-align: center;">
        <h3 style="font-size: 2rem;">{stats.posts}</h3>
        <Tag type="green">Posts</Tag>
      </Tile>
    </Column>
    <Column lg={5} md={4} sm={4}>
      <Tile style="margin-bottom: 1rem; text-align: center;">
        <h3 style="font-size: 2rem;">{stats.categories}</h3>
        <Tag type="purple">Categories</Tag>
      </Tile>
    </Column>
  </Row>

  <Row>
    <Column>
      <h2 style="margin: 2rem 0 1rem;">CMS Features Showcased</h2>
      <Tile>
        <UnorderedList>
          <ListItem>16 field types (text, number, select, rich text, JSON, relationships, and more)</ListItem>
          <ListItem>Role-based access control with deny-by-default security</ListItem>
          <ListItem>Lifecycle hooks (beforeChange, afterChange, beforeDelete, afterDelete)</ListItem>
          <ListItem>Query API with pagination, sorting, and filtering</ListItem>
          <ListItem>Auto-seeding for demo data generation</ListItem>
          <ListItem>Carbon Design System UI components</ListItem>
          <ListItem>Local filesystem media storage with path traversal protection</ListItem>
          <ListItem>Better Auth session management</ListItem>
          <ListItem>Host-managed drizzle-kit migrations with libsql/Turso support</ListItem>
          <ListItem>Single-package CMS-as-a-library architecture</ListItem>
        </UnorderedList>
      </Tile>
    </Column>
  </Row>
</Grid>
