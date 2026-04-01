# Feedback & Overlay Components

## Modal

Import: `import { Modal } from "carbon-components-svelte"`

### Props

| Prop                         | Type                     | Default                        |
| ---------------------------- | ------------------------ | ------------------------------ |
| `open` (Reactive)            | `boolean`                | `false`                        |
| `ref` (Reactive)             | `null \| HTMLDivElement` | `null`                         |
| `size`                       | `"xs" \| "sm" \| "lg"`   | _undefined_                    |
| `danger`                     | `boolean`                | `false`                        |
| `alert`                      | `boolean`                | `false`                        |
| `passiveModal`               | `boolean`                | `false`                        |
| `modalHeading`               | `string`                 | _undefined_                    |
| `modalLabel`                 | `string`                 | _undefined_                    |
| `modalAriaLabel`             | `string`                 | _undefined_                    |
| `iconDescription`            | `string`                 | `"Close the modal"`            |
| `hasForm`                    | `boolean`                | `false`                        |
| `formId`                     | `string`                 | _undefined_                    |
| `hasScrollingContent`        | `boolean`                | `false`                        |
| `primaryButtonText`          | `string`                 | `""`                           |
| `primaryButtonDisabled`      | `boolean`                | `false`                        |
| `primaryButtonIcon`          | `Icon`                   | _undefined_                    |
| `shouldSubmitOnEnter`        | `boolean`                | `true`                         |
| `secondaryButtonText`        | `string`                 | `""`                           |
| `secondaryButtons`           | `[{ text }, { text }]`   | `[]`                           |
| `selectorPrimaryFocus`       | `string`                 | `"[data-modal-primary-focus]"` |
| `preventCloseOnClickOutside` | `boolean`                | `false`                        |

### Slots

`default`, `heading`, `label`

### Dispatched Events

| Event                        | Detail                                                           |
| ---------------------------- | ---------------------------------------------------------------- |
| `on:click:button--primary`   | -                                                                |
| `on:click:button--secondary` | `{ text }`                                                       |
| `on:close`                   | `{ trigger: "escape-key" \| "outside-click" \| "close-button" }` |
| `on:open`                    | -                                                                |
| `on:submit`                  | -                                                                |
| `on:transitionend`           | `{ open }`                                                       |

### Examples

```svelte
<script>
  import { Modal, Button } from "carbon-components-svelte";
  let open = false;
</script>

<Button on:click={() => (open = true)}>Open Modal</Button>

<!-- Standard modal -->
<Modal
  bind:open
  modalHeading="Confirm action"
  primaryButtonText="Confirm"
  secondaryButtonText="Cancel"
  on:click:button--primary={() => { handleConfirm(); open = false; }}
  on:click:button--secondary={() => (open = false)}
>
  <p>Are you sure you want to proceed?</p>
</Modal>

<!-- Passive modal (no actions, just close button) -->
<Modal bind:open passiveModal modalHeading="Information">
  <p>This is an informational message.</p>
</Modal>

<!-- Danger modal -->
<Modal
  bind:open
  danger
  modalHeading="Delete item"
  primaryButtonText="Delete"
  secondaryButtonText="Cancel"
>
  <p>This action cannot be undone.</p>
</Modal>
```

## ComposedModal / ModalHeader / ModalBody / ModalFooter

Import: `import { ComposedModal, ModalHeader, ModalBody, ModalFooter } from "carbon-components-svelte"`

Use ComposedModal for more control over modal structure.

**ComposedModal props:** Same as Modal minus alert/passiveModal/heading props. Uses `containerClass`, `selectorPrimaryFocus`.
**ModalHeader props:** `title` (""), `label` (""), `labelClass`, `titleClass`, `closeClass`, `closeIconClass`, `iconDescription` ("Close")
**ModalBody props:** `hasForm` (false), `hasScrollingContent` (false)
**ModalFooter props:** `primaryButtonText` (""), `primaryButtonIcon`, `primaryButtonDisabled` (false), `primaryClass`, `secondaryButtonText` (""), `secondaryButtons` ([]), `secondaryClass`, `danger` (false)

```svelte
<ComposedModal bind:open>
  <ModalHeader title="Edit user" label="User management" />
  <ModalBody hasForm>
    <TextInput labelText="Name" bind:value={name} />
    <TextInput labelText="Email" bind:value={email} />
  </ModalBody>
  <ModalFooter
    primaryButtonText="Save"
    secondaryButtonText="Cancel"
    on:click:button--primary={handleSave}
  />
</ComposedModal>
```

## InlineNotification

Import: `import { InlineNotification, NotificationActionButton } from "carbon-components-svelte"`

| Prop                     | Type                                                                            | Default                |
| ------------------------ | ------------------------------------------------------------------------------- | ---------------------- |
| `open` (Reactive)        | `boolean`                                                                       | `true`                 |
| `kind`                   | `"error" \| "info" \| "info-square" \| "success" \| "warning" \| "warning-alt"` | `"error"`              |
| `lowContrast`            | `boolean`                                                                       | `false`                |
| `timeout`                | `number`                                                                        | `0`                    |
| `role`                   | `string`                                                                        | `"alert"`              |
| `title`                  | `string`                                                                        | `""`                   |
| `subtitle`               | `string`                                                                        | `""`                   |
| `hideCloseButton`        | `boolean`                                                                       | `false`                |
| `statusIconDescription`  | `string`                                                                        | `"${kind} icon"`       |
| `closeButtonDescription` | `string`                                                                        | `"Close notification"` |

**Slots:** `default`, `actions`, `subtitleChildren`, `titleChildren`
**Dispatched events:** `on:close` -> `{ timeout: boolean }`

```svelte
<InlineNotification
  kind="success"
  title="Success"
  subtitle="Your changes have been saved."
/>

<InlineNotification kind="error" title="Error" subtitle="Something went wrong.">
  <svelte:fragment slot="actions">
    <NotificationActionButton on:click={retry}>Retry</NotificationActionButton>
  </svelte:fragment>
</InlineNotification>

<!-- Auto-dismiss after 5 seconds -->
<InlineNotification
  kind="info"
  title="Note"
  subtitle="This will disappear soon."
  timeout={5000}
/>
```

## ToastNotification

Import: `import { ToastNotification } from "carbon-components-svelte"`

Same as InlineNotification plus:

| Prop        | Type      | Default |
| ----------- | --------- | ------- |
| `caption`   | `string`  | `""`    |
| `fullWidth` | `boolean` | `false` |

**Slots:** `default`, `captionChildren`, `subtitleChildren`, `titleChildren`

```svelte
<ToastNotification
  kind="warning"
  title="Warning"
  subtitle="Disk space is running low."
  caption="2 minutes ago"
/>
```

## NotificationQueue

Import: `import { NotificationQueue } from "carbon-components-svelte"`

Manages a queue of toast notifications.

| Prop               | Type                                         | Default       |
| ------------------ | -------------------------------------------- | ------------- |
| `position`         | `"top-right" \| "bottom-right"`              | `"top-right"` |
| `offsetTop`        | `string`                                     | `"3rem"`      |
| `offsetBottom`     | `string`                                     | `"1rem"`      |
| `offsetRight`      | `string`                                     | `"1rem"`      |
| `zIndex`           | `number`                                     | `9000`        |
| `maxNotifications` | `number`                                     | `3`           |
| `add`              | `(notification: NotificationData) => string` | _undefined_   |
| `remove`           | `(id: string) => boolean`                    | _undefined_   |
| `clear`            | `() => any`                                  | _undefined_   |

```ts
type NotificationData = {
  id?: string;
  kind?: "error" | "info" | "info-square" | "success" | "warning" | "warning-alt";
  title?: string;
  subtitle?: string;
  caption?: string;
  timeout?: number;
  lowContrast?: boolean;
  closeButtonDescription?: string;
  statusIconDescription?: string;
  hideCloseButton?: boolean;
};
```

```svelte
<script>
  import { NotificationQueue, Button } from "carbon-components-svelte";
  let queue;
</script>

<NotificationQueue bind:this={queue} />

<Button on:click={() => queue.add({ kind: "success", title: "Saved", timeout: 3000 })}>
  Save
</Button>
```

## Loading / InlineLoading

Import: `import { Loading, InlineLoading } from "carbon-components-svelte"`

### Loading Props

| Prop          | Type      | Default     |
| ------------- | --------- | ----------- |
| `small`       | `boolean` | `false`     |
| `active`      | `boolean` | `true`      |
| `withOverlay` | `boolean` | `true`      |
| `description` | `string`  | `"loading"` |

### InlineLoading Props

| Prop              | Type                                              | Default     |
| ----------------- | ------------------------------------------------- | ----------- |
| `status`          | `"active" \| "inactive" \| "finished" \| "error"` | `"active"`  |
| `description`     | `string`                                          | _undefined_ |
| `iconDescription` | `string`                                          | _undefined_ |
| `successDelay`    | `number`                                          | `1500`      |

**Dispatched events:** `on:success`

```svelte
<!-- Full-screen loading overlay -->
<Loading active description="Loading data..." />

<!-- Small spinner without overlay -->
<Loading small active={false} withOverlay={false} />

<!-- Inline loading states -->
<InlineLoading status="active" description="Saving..." />
<InlineLoading status="finished" description="Saved!" />
<InlineLoading status="error" description="Failed to save" />
```

## ProgressIndicator / ProgressStep

Import: `import { ProgressIndicator, ProgressStep } from "carbon-components-svelte"`

**ProgressIndicator props:** `currentIndex` (Reactive, 0), `vertical` (false), `spaceEqually` (false), `preventChangeOnClick` (false)

**ProgressStep props:**

| Prop                 | Type      | Default        |
| -------------------- | --------- | -------------- |
| `current` (Reactive) | `boolean` | `false`        |
| `complete`           | `boolean` | `false`        |
| `disabled`           | `boolean` | `false`        |
| `invalid`            | `boolean` | `false`        |
| `description`        | `string`  | `""`           |
| `label`              | `string`  | `""`           |
| `secondaryLabel`     | `string`  | `""`           |
| `id`                 | `string`  | auto-generated |

```svelte
<ProgressIndicator currentIndex={1}>
  <ProgressStep complete label="Setup" description="Configure project" />
  <ProgressStep current label="Build" description="Build the app" />
  <ProgressStep label="Deploy" description="Deploy to production" />
</ProgressIndicator>
```

## ProgressBar

Import: `import { ProgressBar } from "carbon-components-svelte"`

| Prop         | Type                                  | Default     |
| ------------ | ------------------------------------- | ----------- |
| `value`      | `number`                              | _undefined_ |
| `max`        | `number`                              | `100`       |
| `kind`       | `"default" \| "inline" \| "indented"` | `"default"` |
| `status`     | `"active" \| "finished" \| "error"`   | `"active"`  |
| `size`       | `"sm" \| "md"`                        | `"md"`      |
| `labelText`  | `string`                              | `""`        |
| `hideLabel`  | `boolean`                             | `false`     |
| `helperText` | `string`                              | `""`        |

```svelte
<ProgressBar value={65} labelText="Upload progress" helperText="65%" />
```

## Tooltip

Import: `import { Tooltip, TooltipFooter } from "carbon-components-svelte"`

| Prop                                        | Type                                     | Default       |
| ------------------------------------------- | ---------------------------------------- | ------------- |
| `open` (Reactive)                           | `boolean`                                | `false`       |
| `ref` / `refTooltip` / `refIcon` (Reactive) | `null \| HTMLDivElement`                 | `null`        |
| `align`                                     | `"start" \| "center" \| "end"`           | `"center"`    |
| `direction`                                 | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"`    |
| `hideIcon`                                  | `boolean`                                | `false`       |
| `icon`                                      | `Icon`                                   | `Information` |
| `iconDescription`                           | `string`                                 | `""`          |
| `tabindex`                                  | `string`                                 | `"0"`         |
| `triggerText`                               | `string`                                 | `""`          |
| `enterDelayMs`                              | `number`                                 | `100`         |
| `leaveDelayMs`                              | `number`                                 | `300`         |
| `portalTooltip`                             | `boolean \| undefined`                   | _undefined_   |

**Slots:** `default`, `icon`, `triggerText`
**Dispatched events:** `on:close`, `on:open`

```svelte
<Tooltip triggerText="Hover me" direction="top">
  <p>This is a rich tooltip with any content.</p>
</Tooltip>
```

## TooltipDefinition

Import: `import { TooltipDefinition } from "carbon-components-svelte"`

| Prop              | Type                           | Default    |
| ----------------- | ------------------------------ | ---------- |
| `open` (Reactive) | `boolean`                      | `false`    |
| `ref` (Reactive)  | `null \| HTMLButtonElement`    | `null`     |
| `tooltipText`     | `string`                       | `""`       |
| `align`           | `"start" \| "center" \| "end"` | `"center"` |
| `direction`       | `"top" \| "bottom"`            | `"bottom"` |
| `clickToOpen`     | `boolean`                      | `false`    |
| `enterDelayMs`    | `number`                       | `100`      |
| `leaveDelayMs`    | `number`                       | `300`      |

```svelte
<TooltipDefinition tooltipText="Brief explanation">
  Technical term
</TooltipDefinition>
```

## TooltipIcon

Import: `import { TooltipIcon } from "carbon-components-svelte"`

| Prop              | Type                                     | Default     |
| ----------------- | ---------------------------------------- | ----------- |
| `open` (Reactive) | `boolean`                                | `false`     |
| `ref` (Reactive)  | `null \| HTMLButtonElement`              | `null`      |
| `tooltipText`     | `string`                                 | `""`        |
| `icon`            | `Icon`                                   | _undefined_ |
| `size`            | `16 \| 20 \| 24 \| 32 \| number`         | `16`        |
| `disabled`        | `boolean`                                | `false`     |
| `align`           | `"start" \| "center" \| "end"`           | `"center"`  |
| `direction`       | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"`  |
| `enterDelayMs`    | `number`                                 | `100`       |
| `leaveDelayMs`    | `number`                                 | `300`       |

## Popover

Import: `import { Popover } from "carbon-components-svelte"`

| Prop                  | Type                                                                                                                                                                     | Default |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| `open` (Reactive)     | `boolean`                                                                                                                                                                | `false` |
| `closeOnOutsideClick` | `boolean`                                                                                                                                                                | `false` |
| `caret`               | `boolean`                                                                                                                                                                | `false` |
| `align`               | `"top" \| "top-left" \| "top-right" \| "bottom" \| "bottom-left" \| "bottom-right" \| "left" \| "left-bottom" \| "left-top" \| "right" \| "right-bottom" \| "right-top"` | `"top"` |
| `light`               | `boolean`                                                                                                                                                                | `false` |
| `highContrast`        | `boolean`                                                                                                                                                                | `false` |
| `relative`            | `boolean`                                                                                                                                                                | `false` |

**Dispatched events:** `on:click:outside` -> `{ target: HTMLElement }`

```svelte
<script>
  import { Popover, Button } from "carbon-components-svelte";
  let open = false;
</script>

<Popover bind:open caret align="bottom" closeOnOutsideClick>
  <Button on:click={() => (open = !open)}>Toggle popover</Button>
  <div style="padding: 1rem;">Popover content</div>
</Popover>
```

## FloatingPortal

Import: `import { FloatingPortal } from "carbon-components-svelte"`

| Prop                                                   | Type                                     | Default     |
| ------------------------------------------------------ | ---------------------------------------- | ----------- |
| `anchor` (Required)                                    | `null \| HTMLElement`                    | _undefined_ |
| `ref` (Reactive)                                       | `null \| HTMLElement`                    | `null`      |
| `direction`                                            | `"bottom" \| "top" \| "left" \| "right"` | `"bottom"`  |
| `open`                                                 | `boolean`                                | `false`     |
| `gapTop` / `gapBottom`                                 | `number`                                 | `0`         |
| `horizontalGapLeft` / `horizontalGapRight`             | `number`                                 | `0`         |
| `verticalAlignOffsetLeft` / `verticalAlignOffsetRight` | `number`                                 | `0`         |
| `zIndex`                                               | `number`                                 | `9200`      |
| `intrinsicWidth`                                       | `boolean`                                | `false`     |
| `intrinsicAlign`                                       | `"start" \| "center" \| "end"`           | `"center"`  |

Used internally by components with `portalMenu`/`portalTooltip` props for rendering menus outside overflow containers.
