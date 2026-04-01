# Form Components

## Form / FluidForm / FormGroup

Import: `import { Form, FluidForm, FormGroup } from "carbon-components-svelte"`

**Form props:** `ref` (Reactive, `null | HTMLFormElement`)
**FormGroup props:**

| Prop          | Type      | Default |
| ------------- | --------- | ------- |
| `noMargin`    | `boolean` | `false` |
| `invalid`     | `boolean` | `false` |
| `message`     | `boolean` | `false` |
| `messageText` | `string`  | `""`    |
| `legendText`  | `string`  | `""`    |
| `legendId`    | `string`  | `""`    |

```svelte
<script>
  import { Form, FormGroup, TextInput, Button } from "carbon-components-svelte";
</script>

<Form on:submit={(e) => { e.preventDefault(); }}>
  <FormGroup legendText="Personal Info">
    <TextInput labelText="First name" />
    <TextInput labelText="Last name" />
  </FormGroup>
  <Button type="submit">Submit</Button>
</Form>
```

## TextInput

Import: `import { TextInput } from "carbon-components-svelte"`

| Prop               | Type                       | Default        |
| ------------------ | -------------------------- | -------------- |
| `value` (Reactive) | `null \| number \| string` | `""`           |
| `ref` (Reactive)   | `null \| HTMLInputElement` | `null`         |
| `type`             | `string`                   | `""`           |
| `size`             | `"sm" \| "xl"`             | _undefined_    |
| `placeholder`      | `string`                   | `""`           |
| `light`            | `boolean`                  | `false`        |
| `disabled`         | `boolean`                  | `false`        |
| `helperText`       | `string`                   | `""`           |
| `id`               | `string`                   | auto-generated |
| `name`             | `string`                   | _undefined_    |
| `labelText`        | `string`                   | `""`           |
| `hideLabel`        | `boolean`                  | `false`        |
| `invalid`          | `boolean`                  | `false`        |
| `invalidText`      | `string`                   | `""`           |
| `warn`             | `boolean`                  | `false`        |
| `warnText`         | `string`                   | `""`           |
| `required`         | `boolean`                  | `false`        |
| `inline`           | `boolean`                  | `false`        |
| `readonly`         | `boolean`                  | `false`        |

**Slots:** `labelChildren`
**Forwarded events:** `on:blur`, `on:click`, `on:focus`, `on:keydown`, `on:keyup`, `on:mouseenter`, `on:mouseleave`, `on:mouseover`, `on:paste`
**Dispatched events:** `on:change` -> `null | number | string`, `on:input` -> `null | number | string`

```svelte
<TextInput
  bind:value={name}
  labelText="Full Name"
  placeholder="John Doe"
  required
  invalid={!name}
  invalidText="Name is required"
/>
```

## PasswordInput

Import: `import { PasswordInput } from "carbon-components-svelte"`

Same as TextInput plus:

| Prop                | Type                                     | Default           |
| ------------------- | ---------------------------------------- | ----------------- |
| `type` (Reactive)   | `"text" \| "password"`                   | `"password"`      |
| `hidePasswordLabel` | `string`                                 | `"Hide password"` |
| `showPasswordLabel` | `string`                                 | `"Show password"` |
| `tooltipAlignment`  | `"start" \| "center" \| "end"`           | `"center"`        |
| `tooltipPosition`   | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"`        |

```svelte
<PasswordInput labelText="Password" placeholder="Enter password" />
```

## TextArea

Import: `import { TextArea } from "carbon-components-svelte"`

| Prop                      | Type                          | Default        |
| ------------------------- | ----------------------------- | -------------- |
| `value` (Reactive)        | `null \| string`              | `""`           |
| `ref` (Reactive)          | `null \| HTMLTextAreaElement` | `null`         |
| `placeholder`             | `string`                      | `""`           |
| `cols`                    | `number`                      | _undefined_    |
| `rows`                    | `number`                      | `4`            |
| `maxCount`                | `number`                      | _undefined_    |
| `light`                   | `boolean`                     | `false`        |
| `disabled`                | `boolean`                     | `false`        |
| `readonly`                | `boolean`                     | `false`        |
| `helperText`              | `string`                      | `""`           |
| `labelText`               | `string`                      | `""`           |
| `hideLabel`               | `boolean`                     | `false`        |
| `invalid` / `invalidText` | `boolean` / `string`          | `false` / `""` |
| `warn` / `warnText`       | `boolean` / `string`          | `false` / `""` |
| `id`                      | `string`                      | auto-generated |
| `name`                    | `string`                      | _undefined_    |

```svelte
<TextArea
  bind:value={description}
  labelText="Description"
  placeholder="Enter description..."
  rows={6}
  maxCount={500}
/>
```

## NumberInput

Import: `import { NumberInput } from "carbon-components-svelte"`

| Prop                      | Type                                                                   | Default        |
| ------------------------- | ---------------------------------------------------------------------- | -------------- |
| `value` (Reactive)        | `null \| number`                                                       | `null`         |
| `ref` (Reactive)          | `null \| HTMLInputElement`                                             | `null`         |
| `size`                    | `"sm" \| "xl"`                                                         | _undefined_    |
| `step`                    | `number`                                                               | `1`            |
| `max`                     | `number`                                                               | _undefined_    |
| `min`                     | `number`                                                               | _undefined_    |
| `stepStartValue`          | `number`                                                               | _undefined_    |
| `light`                   | `boolean`                                                              | `false`        |
| `readonly`                | `boolean`                                                              | `false`        |
| `allowEmpty`              | `boolean`                                                              | `false`        |
| `allowDecimal`            | `boolean`                                                              | `false`        |
| `locale`                  | `string`                                                               | _undefined_    |
| `formatOptions`           | `Intl.NumberFormatOptions`                                             | _undefined_    |
| `disabled`                | `boolean`                                                              | `false`        |
| `hideSteppers`            | `boolean`                                                              | `false`        |
| `disableWheel`            | `boolean`                                                              | `false`        |
| `validate`                | `(value: string, locale: string \| undefined) => boolean \| undefined` | _undefined_    |
| `invalid` / `invalidText` | `boolean` / `string`                                                   | `false` / `""` |
| `warn` / `warnText`       | `boolean` / `string`                                                   | `false` / `""` |
| `helperText`              | `string`                                                               | `""`           |
| `labelText`               | `string`                                                               | `""`           |
| `hideLabel`               | `boolean`                                                              | `false`        |

**Dispatched events:** `on:blur` -> `{ event, value }`, `on:change` -> `null | number`, `on:input` -> `null | number`, `on:click:stepper` -> `{ value, direction }`, `on:blur:stepper` -> `{ event, value, direction }`

```svelte
<NumberInput
  bind:value={quantity}
  labelText="Quantity"
  min={0}
  max={100}
  step={1}
/>
```

## Select / SelectItem / SelectItemGroup

Import: `import { Select, SelectItem, SelectItemGroup } from "carbon-components-svelte"`

### Select Props

| Prop                      | Type                        | Default                      |
| ------------------------- | --------------------------- | ---------------------------- |
| `selected` (Reactive)     | `Value \| undefined`        | _undefined_                  |
| `ref` (Reactive)          | `null \| HTMLSelectElement` | `null`                       |
| `size`                    | `"sm" \| "xl"`              | _undefined_                  |
| `inline`                  | `boolean`                   | `false`                      |
| `light`                   | `boolean`                   | `false`                      |
| `disabled`                | `boolean`                   | `false`                      |
| `id` / `name`             | `string`                    | auto-generated / _undefined_ |
| `invalid` / `invalidText` | `boolean` / `string`        | `false` / `""`               |
| `warn` / `warnText`       | `boolean` / `string`        | `false` / `""`               |
| `helperText`              | `string`                    | `""`                         |
| `noLabel`                 | `boolean`                   | `false`                      |
| `labelText`               | `string`                    | `""`                         |
| `hideLabel`               | `boolean`                   | `false`                      |
| `required`                | `boolean`                   | `false`                      |

**Dispatched events:** `on:update` -> `Value`

**SelectItem props:** `value` (Value, `""`), `text` (string), `hidden` (boolean, `false`), `disabled` (boolean, `false`)
**SelectItemGroup props:** `disabled` (boolean, `false`), `label` (string, `"Provide label"`)

```svelte
<Select bind:selected={country} labelText="Country">
  <SelectItem value="" text="Choose a country" />
  <SelectItemGroup label="Americas">
    <SelectItem value="us" text="United States" />
    <SelectItem value="ca" text="Canada" />
  </SelectItemGroup>
  <SelectItemGroup label="Europe">
    <SelectItem value="de" text="Germany" />
    <SelectItem value="fr" text="France" />
  </SelectItemGroup>
</Select>
```

## Checkbox

Import: `import { Checkbox } from "carbon-components-svelte"`

| Prop                       | Type                            | Default        |
| -------------------------- | ------------------------------- | -------------- |
| `checked` (Reactive)       | `boolean`                       | `false`        |
| `group` (Reactive)         | `ReadonlyArray<T> \| undefined` | _undefined_    |
| `indeterminate` (Reactive) | `boolean`                       | `false`        |
| `title` (Reactive)         | `string`                        | _undefined_    |
| `ref` (Reactive)           | `null \| HTMLInputElement`      | `null`         |
| `value`                    | `T`                             | `""`           |
| `skeleton`                 | `boolean`                       | `false`        |
| `required`                 | `boolean`                       | `false`        |
| `readonly`                 | `boolean`                       | `false`        |
| `disabled`                 | `boolean`                       | `false`        |
| `labelText`                | `string`                        | `""`           |
| `hideLabel`                | `boolean`                       | `false`        |
| `helperText`               | `string`                        | `""`           |
| `name`                     | `string`                        | `""`           |
| `id`                       | `string`                        | auto-generated |

**Dispatched events:** `on:check` -> `boolean`

```svelte
<!-- Single checkbox -->
<Checkbox bind:checked={agree} labelText="I agree to the terms" />

<!-- Checkbox group -->
<script>
  let selectedFruits = [];
</script>
<Checkbox bind:group={selectedFruits} value="apple" labelText="Apple" />
<Checkbox bind:group={selectedFruits} value="banana" labelText="Banana" />
<Checkbox bind:group={selectedFruits} value="cherry" labelText="Cherry" />
```

## RadioButton / RadioButtonGroup

Import: `import { RadioButton, RadioButtonGroup } from "carbon-components-svelte"`

### RadioButtonGroup Props

| Prop                  | Type                         | Default        |
| --------------------- | ---------------------------- | -------------- |
| `selected` (Reactive) | `Value \| undefined`         | _undefined_    |
| `disabled`            | `boolean`                    | `false`        |
| `required`            | `boolean`                    | _undefined_    |
| `name`                | `string`                     | _undefined_    |
| `legendText`          | `string`                     | `""`           |
| `hideLegend`          | `boolean`                    | `false`        |
| `helperText`          | `string`                     | `""`           |
| `labelPosition`       | `"right" \| "left"`          | `"right"`      |
| `orientation`         | `"horizontal" \| "vertical"` | `"horizontal"` |

### RadioButton Props

| Prop                 | Type                       | Default        |
| -------------------- | -------------------------- | -------------- |
| `checked` (Reactive) | `boolean`                  | `false`        |
| `ref` (Reactive)     | `null \| HTMLInputElement` | `null`         |
| `value`              | `Value`                    | `""`           |
| `disabled`           | `boolean`                  | `false`        |
| `required`           | `boolean`                  | `false`        |
| `labelPosition`      | `"right" \| "left"`        | `"right"`      |
| `labelText`          | `string`                   | `""`           |
| `hideLabel`          | `boolean`                  | `false`        |
| `id`                 | `string`                   | auto-generated |
| `name`               | `string`                   | _undefined_    |

```svelte
<RadioButtonGroup bind:selected={size} legendText="Size">
  <RadioButton value="sm" labelText="Small" />
  <RadioButton value="md" labelText="Medium" />
  <RadioButton value="lg" labelText="Large" />
</RadioButtonGroup>
```

## Toggle

Import: `import { Toggle } from "carbon-components-svelte"`

| Prop                 | Type                       | Default        |
| -------------------- | -------------------------- | -------------- |
| `toggled` (Reactive) | `boolean`                  | `false`        |
| `ref` (Reactive)     | `null \| HTMLInputElement` | `null`         |
| `size`               | `"default" \| "sm"`        | `"default"`    |
| `disabled`           | `boolean`                  | `false`        |
| `labelA`             | `string`                   | `"Off"`        |
| `labelB`             | `string`                   | `"On"`         |
| `labelText`          | `string`                   | `""`           |
| `hideLabel`          | `boolean`                  | `false`        |
| `id`                 | `string`                   | auto-generated |
| `name`               | `string`                   | _undefined_    |

**Slots:** `labelA`, `labelB`, `labelChildren`
**Dispatched events:** `on:toggle` -> `{ toggled: boolean }`

```svelte
<Toggle bind:toggled={darkMode} labelText="Dark mode" labelA="Off" labelB="On" />
```

## Slider

Import: `import { Slider } from "carbon-components-svelte"`

| Prop                      | Type                     | Default        |
| ------------------------- | ------------------------ | -------------- |
| `value` (Reactive)        | `number`                 | `0`            |
| `ref` (Reactive)          | `null \| HTMLDivElement` | `null`         |
| `max`                     | `number`                 | `100`          |
| `maxLabel`                | `string`                 | `""`           |
| `min`                     | `number`                 | `0`            |
| `minLabel`                | `string`                 | `""`           |
| `step`                    | `number`                 | `1`            |
| `stepMultiplier`          | `number`                 | `4`            |
| `required`                | `boolean`                | `false`        |
| `disabled`                | `boolean`                | `false`        |
| `readonly`                | `boolean`                | `false`        |
| `light`                   | `boolean`                | `false`        |
| `hideTextInput`           | `boolean`                | `false`        |
| `fullWidth`               | `boolean`                | `false`        |
| `invalid` / `invalidText` | `boolean` / `string`     | `false` / `""` |
| `warn` / `warnText`       | `boolean` / `string`     | `false` / `""` |
| `labelText`               | `string`                 | `""`           |
| `hideLabel`               | `boolean`                | `false`        |
| `name`                    | `string`                 | `""`           |

**Dispatched events:** `on:change` -> `number`, `on:input` -> `number`

```svelte
<Slider bind:value={opacity} labelText="Opacity" min={0} max={100} step={5} />
```

## DatePicker / DatePickerInput

Import: `import { DatePicker, DatePickerInput } from "carbon-components-svelte"`

### DatePicker Props

| Prop                   | Type                              | Default            |
| ---------------------- | --------------------------------- | ------------------ |
| `value` (Reactive)     | `number \| string`                | `""`               |
| `valueFrom` (Reactive) | `string`                          | `""`               |
| `valueTo` (Reactive)   | `string`                          | `""`               |
| `datePickerType`       | `"simple" \| "single" \| "range"` | `"simple"`         |
| `dateFormat`           | `string`                          | `"m/d/Y"`          |
| `maxDate`              | `null \| string \| Date`          | `null`             |
| `minDate`              | `null \| string \| Date`          | `null`             |
| `locale`               | flatpickr locale                  | `"en"`             |
| `short`                | `boolean`                         | `false`            |
| `light`                | `boolean`                         | `false`            |
| `portalMenu`           | `boolean \| undefined`            | _undefined_        |
| `flatpickrProps`       | flatpickr Options                 | `{ static: true }` |

### DatePickerInput Props

| Prop                      | Type                       | Default                 |
| ------------------------- | -------------------------- | ----------------------- |
| `ref` (Reactive)          | `null \| HTMLInputElement` | `null`                  |
| `size`                    | `"sm" \| "xl"`             | _undefined_             |
| `type`                    | `string`                   | `"text"`                |
| `placeholder`             | `string`                   | `""`                    |
| `pattern`                 | `string`                   | derived from dateFormat |
| `disabled`                | `boolean`                  | `false`                 |
| `helperText`              | `string`                   | `""`                    |
| `iconDescription`         | `string`                   | `""`                    |
| `labelText`               | `string`                   | `""`                    |
| `hideLabel`               | `boolean`                  | `false`                 |
| `invalid` / `invalidText` | `boolean` / `string`       | `false` / `""`          |
| `warn` / `warnText`       | `boolean` / `string`       | `false` / `""`          |
| `name`                    | `string`                   | _undefined_             |

```svelte
<!-- Single date picker -->
<DatePicker bind:value={date} datePickerType="single" on:change>
  <DatePickerInput labelText="Start date" placeholder="mm/dd/yyyy" />
</DatePicker>

<!-- Range date picker -->
<DatePicker bind:valueFrom bind:valueTo datePickerType="range" on:change>
  <DatePickerInput labelText="Start date" placeholder="mm/dd/yyyy" />
  <DatePickerInput labelText="End date" placeholder="mm/dd/yyyy" />
</DatePicker>
```

## TimePicker / TimePickerSelect

Import: `import { TimePicker, TimePickerSelect } from "carbon-components-svelte"`

### TimePicker Props

| Prop                      | Type                       | Default                              |
| ------------------------- | -------------------------- | ------------------------------------ |
| `value` (Reactive)        | `string`                   | `""`                                 |
| `ref` (Reactive)          | `null \| HTMLInputElement` | `null`                               |
| `size`                    | `"sm" \| "xl"`             | _undefined_                          |
| `placeholder`             | `string`                   | `"hh:mm"`                            |
| `pattern`                 | `string`                   | `"(1[012]\|[1-9]):[0-5][0-9](\\s)?"` |
| `maxlength`               | `number`                   | `5`                                  |
| `light`                   | `boolean`                  | `false`                              |
| `disabled`                | `boolean`                  | `false`                              |
| `labelText`               | `string`                   | `""`                                 |
| `hideLabel`               | `boolean`                  | `false`                              |
| `invalid` / `invalidText` | `boolean` / `string`       | `false` / `""`                       |

**TimePickerSelect props:** `value` (Reactive, `""`), `ref` (Reactive), `disabled`, `iconDescription` (`"Open list of options"`), `labelText`, `id`, `name`

```svelte
<TimePicker bind:value={time} labelText="Meeting time">
  <TimePickerSelect bind:value={period}>
    <SelectItem value="am" text="AM" />
    <SelectItem value="pm" text="PM" />
  </TimePickerSelect>
  <TimePickerSelect bind:value={timezone}>
    <SelectItem value="et" text="Eastern" />
    <SelectItem value="ct" text="Central" />
  </TimePickerSelect>
</TimePicker>
```

## ComboBox

Import: `import { ComboBox } from "carbon-components-svelte"`

| Prop                      | Type                                                                                          | Default        |
| ------------------------- | --------------------------------------------------------------------------------------------- | -------------- |
| `selectedId` (Reactive)   | `Item["id"]`                                                                                  | _undefined_    |
| `value` (Reactive)        | `string`                                                                                      | `""`           |
| `open` (Reactive)         | `boolean`                                                                                     | `false`        |
| `ref` (Reactive)          | `null \| HTMLInputElement`                                                                    | `null`         |
| `listRef` (Reactive)      | `null \| HTMLDivElement`                                                                      | `null`         |
| `items`                   | `ReadonlyArray<Item>`                                                                         | `[]`           |
| `itemToString`            | `(item: Item) => string`                                                                      | _undefined_    |
| `direction`               | `"bottom" \| "top"`                                                                           | `"bottom"`     |
| `size`                    | `"sm" \| "xl"`                                                                                | _undefined_    |
| `disabled`                | `boolean`                                                                                     | `false`        |
| `labelText`               | `string`                                                                                      | `""`           |
| `hideLabel`               | `boolean`                                                                                     | `false`        |
| `placeholder`             | `string`                                                                                      | `""`           |
| `helperText`              | `string`                                                                                      | `""`           |
| `invalid` / `invalidText` | `boolean` / `string`                                                                          | `false` / `""` |
| `warn` / `warnText`       | `boolean` / `string`                                                                          | `false` / `""` |
| `light`                   | `boolean`                                                                                     | `false`        |
| `allowCustomValue`        | `boolean`                                                                                     | `false`        |
| `clearFilterOnOpen`       | `boolean`                                                                                     | `false`        |
| `selectTextOnFocus`       | `boolean`                                                                                     | `false`        |
| `typeahead`               | `boolean`                                                                                     | `false`        |
| `shouldFilterItem`        | `(item: Item, value: string) => boolean`                                                      | _undefined_    |
| `virtualize`              | `undefined \| boolean \| { itemHeight?, containerHeight?, overscan?, threshold?, maxItems? }` | _undefined_    |
| `portalMenu`              | `boolean \| undefined`                                                                        | _undefined_    |
| `clear`                   | `(options?: { focus?: boolean }) => Promise<void>`                                            | _undefined_    |

```ts
type ComboBoxItem<Id = any> = { id: Id; text: string; disabled?: boolean };
```

**Dispatched events:** `on:select` -> `{ selectedId, selectedItem }`
**Slots:** `default` (`{ item, index }`), `labelChildren`

```svelte
<ComboBox
  bind:selectedId={selectedCountry}
  items={[
    { id: "us", text: "United States" },
    { id: "ca", text: "Canada" },
    { id: "de", text: "Germany" },
  ]}
  labelText="Country"
  placeholder="Select a country"
/>
```

## MultiSelect

Import: `import { MultiSelect } from "carbon-components-svelte"`

| Prop                      | Type                                                    | Default              |
| ------------------------- | ------------------------------------------------------- | -------------------- |
| `selectedIds` (Reactive)  | `ReadonlyArray<Item["id"]>`                             | `[]`                 |
| `value` (Reactive)        | `string`                                                | `""`                 |
| `open` (Reactive)         | `boolean`                                               | `false`              |
| `inputRef` (Reactive)     | `null \| HTMLInputElement`                              | `null`               |
| `items`                   | `ReadonlyArray<Item>`                                   | `[]`                 |
| `itemToString`            | `(item: Item) => any`                                   | _undefined_          |
| `itemToInput`             | `(item: Item) => { name?, labelText?, title?, value? }` | _undefined_          |
| `size`                    | `"sm" \| "lg" \| "xl"`                                  | _undefined_          |
| `type`                    | `"default" \| "inline"`                                 | `"default"`          |
| `direction`               | `"bottom" \| "top"`                                     | `"bottom"`           |
| `selectionFeedback`       | `"top" \| "fixed" \| "top-after-reopen"`                | `"top-after-reopen"` |
| `disabled`                | `boolean`                                               | `false`              |
| `filterable`              | `boolean`                                               | `false`              |
| `filterItem`              | `(item: Item, value: string) => boolean`                | _undefined_          |
| `light`                   | `boolean`                                               | `false`              |
| `locale`                  | `string`                                                | `"en"`               |
| `placeholder`             | `string`                                                | `""`                 |
| `sortItem`                | `((a, b) => Item) \| (() => void)`                      | _undefined_          |
| `labelText`               | `string`                                                | `""`                 |
| `invalid` / `invalidText` | `boolean` / `string`                                    | `false` / `""`       |
| `warn` / `warnText`       | `boolean` / `string`                                    | `false` / `""`       |
| `helperText`              | `string`                                                | `""`                 |
| `label`                   | `string`                                                | `""`                 |
| `hideLabel`               | `boolean`                                               | `false`              |

```ts
type MultiSelectItem<Id = any> = {
  id: Id;
  text: string;
  disabled?: boolean;
  isSelectAll?: boolean;
};
```

**Dispatched events:** `on:select` -> `{ selectedIds, selected, unselected }`

```svelte
<MultiSelect
  bind:selectedIds={selectedTags}
  filterable
  items={[
    { id: "svelte", text: "Svelte" },
    { id: "react", text: "React" },
    { id: "vue", text: "Vue" },
  ]}
  labelText="Frameworks"
  label="Select frameworks"
/>
```

## Dropdown

Import: `import { Dropdown } from "carbon-components-svelte"`

| Prop                              | Type                        | Default        |
| --------------------------------- | --------------------------- | -------------- |
| `selectedId` (Reactive, Required) | `Item["id"]`                | _undefined_    |
| `open` (Reactive)                 | `boolean`                   | `false`        |
| `ref` (Reactive)                  | `null \| HTMLButtonElement` | `null`         |
| `items`                           | `ReadonlyArray<Item>`       | `[]`           |
| `itemToString`                    | `(item: Item) => string`    | _undefined_    |
| `type`                            | `"default" \| "inline"`     | `"default"`    |
| `direction`                       | `"bottom" \| "top"`         | `"bottom"`     |
| `size`                            | `"sm" \| "lg" \| "xl"`      | _undefined_    |
| `light`                           | `boolean`                   | `false`        |
| `disabled`                        | `boolean`                   | `false`        |
| `labelText`                       | `string`                    | `""`           |
| `invalid` / `invalidText`         | `boolean` / `string`        | `false` / `""` |
| `warn` / `warnText`               | `boolean` / `string`        | `false` / `""` |
| `helperText`                      | `string`                    | `""`           |
| `label`                           | `string`                    | _undefined_    |
| `hideLabel`                       | `boolean`                   | `false`        |

```ts
type DropdownItem<Id = any> = { id: Id; text: string; disabled?: boolean };
```

**Dispatched events:** `on:select` -> `{ selectedId, selectedItem }`

```svelte
<Dropdown
  bind:selectedId={selectedRole}
  items={[
    { id: "admin", text: "Admin" },
    { id: "editor", text: "Editor" },
    { id: "viewer", text: "Viewer" },
  ]}
  labelText="Role"
  label="Select a role"
/>
```

## Search

Import: `import { Search } from "carbon-components-svelte"`

| Prop                   | Type                       | Default                |
| ---------------------- | -------------------------- | ---------------------- |
| `value` (Reactive)     | `T`                        | `""`                   |
| `expanded` (Reactive)  | `boolean`                  | `false`                |
| `ref` (Reactive)       | `null \| HTMLInputElement` | `null`                 |
| `size`                 | `"sm" \| "lg" \| "xl"`     | `"xl"`                 |
| `skeleton`             | `boolean`                  | `false`                |
| `light`                | `boolean`                  | `false`                |
| `disabled`             | `boolean`                  | `false`                |
| `expandable`           | `boolean`                  | `false`                |
| `placeholder`          | `string`                   | `"Search..."`          |
| `autocomplete`         | `"on" \| "off"`            | `"off"`                |
| `autofocus`            | `boolean`                  | `false`                |
| `closeButtonLabelText` | `string`                   | `"Clear search input"` |
| `labelText`            | `string`                   | `""`                   |
| `icon`                 | `Icon`                     | `IconSearch`           |

**Dispatched events:** `on:clear`, `on:collapse`, `on:expand`

```svelte
<Search bind:value={searchQuery} placeholder="Search items..." size="lg" />

<!-- Expandable search (icon only until focused) -->
<Search bind:value={q} expandable size="sm" />
```

## FileUploader / FileUploaderButton / FileUploaderDropContainer

Import: `import { FileUploader, FileUploaderButton, FileUploaderDropContainer, FileUploaderItem } from "carbon-components-svelte"`

### FileUploader Props

| Prop               | Type                                  | Default       |
| ------------------ | ------------------------------------- | ------------- |
| `files` (Reactive) | `ReadonlyArray<File>`                 | `[]`          |
| `status`           | `"uploading" \| "edit" \| "complete"` | `"uploading"` |
| `disabled`         | `boolean`                             | `false`       |
| `accept`           | `ReadonlyArray<string>`               | `[]`          |
| `maxFileSize`      | `number \| undefined`                 | _undefined_   |
| `multiple`         | `boolean`                             | `false`       |
| `preventDuplicate` | `boolean`                             | `false`       |
| `orderFiles`       | `"append" \| "prepend" \| function`   | `"append"`    |
| `clearFiles`       | `() => void`                          | _undefined_   |
| `labelTitle`       | `string`                              | `""`          |
| `labelDescription` | `string`                              | `""`          |
| `kind`             | Button kind                           | `"primary"`   |
| `size`             | Button size                           | `"small"`     |
| `buttonLabel`      | `string`                              | `""`          |

**Dispatched events:** `on:add`, `on:change`, `on:clear`, `on:rejected` (`{ file, reason: "size" | "duplicate" }[]`), `on:remove`

```svelte
<FileUploader
  bind:files
  accept={[".jpg", ".png"]}
  multiple
  maxFileSize={5_000_000}
  labelTitle="Upload photos"
  labelDescription="Max 5MB per file"
  buttonLabel="Add files"
  status="edit"
  on:rejected={(e) => console.log("Rejected:", e.detail)}
/>

<!-- Drop container variant -->
<FileUploaderDropContainer
  accept={[".pdf"]}
  labelText="Drag and drop files here or click to upload"
  on:change={(e) => console.log(e.detail)}
/>
```
