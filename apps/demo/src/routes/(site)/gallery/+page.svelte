<script lang="ts">
  import {
    Grid,
    Row,
    Column,
    Tile,
    Tag,
    Modal,
    Breadcrumb,
    BreadcrumbItem,
  } from "carbon-components-svelte";

  import type { EnrichedMedia } from "$lib/types.js";

  let { data } = $props();

  let selectedMedia: EnrichedMedia | null = $state(null);
  let modalOpen = $state(false);

  function openModal(item: EnrichedMedia) {
    selectedMedia = item;
    modalOpen = true;
  }

  function closeModal() {
    modalOpen = false;
    selectedMedia = null;
  }
</script>

<Grid>
  <Row>
    <Column>
      <Breadcrumb noTrailingSlash>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem href="/gallery" isCurrentPage>Gallery</BreadcrumbItem>
      </Breadcrumb>
    </Column>
  </Row>

  <Row>
    <Column>
      <h1>Media Gallery</h1>
      <p>Browse uploaded media files managed through the CMS.</p>
    </Column>
  </Row>

  <Row>
    {#each data.media as item}
      <Column lg={4} md={4} sm={4}>
        <Tile
          style="margin-bottom: 1rem; cursor: pointer;"
          on:click={() => openModal(item)}
        >
          {#if item.url && item.mimeType?.startsWith("image/")}
            <img
              src={item.url}
              alt={item.alt ?? item.filename}
              style="width: 100%; height: 200px; object-fit: cover; margin-bottom: 0.5rem;"
            />
          {:else}
            <div
              style="width: 100%; height: 200px; background: var(--cds-layer-02); display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem;"
            >
              <span>{item.mimeType ?? "Unknown type"}</span>
            </div>
          {/if}
          <h4>{item.filename}</h4>
          {#if item.alt}
            <p style="font-size: 0.875rem; color: var(--cds-text-secondary);">
              {item.alt}
            </p>
          {/if}
          {#if item.parsedTags.length > 0}
            <div style="margin-top: 0.5rem;">
              {#each item.parsedTags as tag}
                <Tag type="cool-gray" size="sm">{tag}</Tag>
              {/each}
            </div>
          {/if}
        </Tile>
      </Column>
    {/each}
  </Row>
</Grid>

<Modal
  open={modalOpen}
  modalHeading={selectedMedia?.filename ?? "Media"}
  passiveModal
  on:close={closeModal}
>
  {#if selectedMedia}
    {#if selectedMedia.url && selectedMedia.mimeType?.startsWith("image/")}
      <img
        src={selectedMedia.url}
        alt={selectedMedia.alt ?? selectedMedia.filename}
        style="width: 100%; max-height: 500px; object-fit: contain; margin-bottom: 1rem;"
      />
    {/if}
    {#if selectedMedia.caption}
      <p style="margin-bottom: 0.5rem;">{selectedMedia.caption}</p>
    {/if}
    <p style="font-size: 0.875rem; color: var(--cds-text-secondary);">
      Type: {selectedMedia.mimeType ?? "Unknown"}
    </p>
    {#if selectedMedia.parsedTags?.length > 0}
      <div style="margin-top: 0.5rem;">
        {#each selectedMedia.parsedTags as tag}
          <Tag type="blue">{tag}</Tag>
        {/each}
      </div>
    {/if}
  {/if}
</Modal>
