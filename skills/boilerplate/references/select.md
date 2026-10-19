# Select

One value out of a list, built on `@base-ui/react/select`. With a mouse or a trackpad it's Base UI's Select; on phones and tablets the same parts render a native `<select>` under the trigger, so the platform's own picker opens. 

## Setup

- **Needs:** `@base-ui/react`, `lucide-react` (the chevrons and the check), `cn`. Its label, description and error come from a `Field`: Input's `Field` parts, or the project's own.
- **Copy:** `components/select.tsx`, into the project's UI folder.
- **Read for the look:** an input or text field (the trigger is drawn like it), a button (as tall), a menu or popover (the list), and how it shows errors.

## Look values the behavior depends on

Make it look like the project's input with a chevron.

Change these together:

- **Height.** Set it once, through `--select-height` on the trigger (a caller can override it with a class, `[--select-height:2.5rem]`). Match the project's input and button, so a select, an input and a button sit in a row. A row in the list is the same height (`h-8`), so the chosen row covers the trigger exactly when the list opens over it: change it with the trigger.
- **One inset, shared with the list.** The trigger's padding (`px-2.5`) plus its border is where the value starts and the chevron ends. The list's border + padding (`p-1`) + a row's padding (`px-1.5`) add up to the same (1 + 10 = 1 + 4 + 6), so the panel opens exactly on the trigger: the chosen row's text on the value, its check on the chevron, the panel's edges on the trigger's. A row's start padding adds `--select-indent`, the measured width of whatever precedes the value in the trigger (0 without an icon); keep the `calc()` in step with `px-1.5`. Keep the trigger's inset equal to the input's, so text lines up in a form. `SelectGroupLabel` sits on the rows' inset (`px-1.5`); `SelectSeparator`'s `-mx-1` cancels the list's padding.
- **One font.** The value and the rows share a font and size, so the chosen row's text lands on the value's when the list opens over it.
- **Check and chevron.** Both are 16px; the check sits in a 16px slot at the row's end, whatever its state.
- **Scroll arrows.** Their height (`h-5`) equals the list's scroll padding (`scroll-py-5`), so a row the keyboard moves into view is never under one. Their corners are `--select-radius` less the 1px border; the panel's radius is set once through `--select-radius`.
- **The 1px nudge.** Over the trigger (`data-side=none`) the panel is moved down 1px (`translate-y-px`), as in Base UI's own example, so the chosen row covers the trigger to the pixel. Keep it with a 1px border.
- **16px on touch screens** (`any-pointer-coarse:text-base` on the trigger, `text-base` on the native `<select>`): iOS zooms into smaller text on focus.
- The gap after an icon, radius, colors and type are otherwise free.

## Rebuilding one

Look for an existing select in the project: a `select.tsx`, `native-select.tsx` or `combobox.tsx` (or similarly named) file in its UI folder, or a `Select` imported from Radix or a component library. Also look for existing Field parts (`Field`, `FormItem`, `FormLabel`, `FormMessage`): keep using those around the select.

- **Aliases:** keep `SelectLabel` or `SelectScrollUpButton` when call sites import them.
- **No equivalent here:** a `size` prop, a searchable select. A searchable select is a combobox: leave it on its own component. Keep the rest working as it did and say so, or ask before removing it.
- **Try by hand:** open, pick, type a letter, submit a form if a screen has one, and one select on a phone (the platform's picker opens).

| The project has (shadcn/ui, Radix) | Here |
| --- | --- |
| `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` | the same names |
| `onValueChange(value)` / `value` / `defaultValue` | the same; `onValueChange` gets event details as a second argument |
| `SelectLabel` | `SelectGroupLabel`, inside a `SelectGroup` (keep `SelectLabel` as an alias if call sites import it) |
| `SelectGroup`, `SelectSeparator` | the same |
| `SelectScrollUpButton`, `SelectScrollDownButton` | built into `SelectContent` |
| `position="item-aligned"` / `position="popper"` | `alignItemWithTrigger` (on by default for a single select) / `alignItemWithTrigger={false}` |
| `SelectValue` showing the label through the mounted item | `items` on `Select` (Base UI shows labels from `items`) |
| An empty string meaning "no value" (Radix forbids `value=""` items) | `null` |
| `<SelectItem>` with `<SelectPrimitive.ItemText>` and an indicator written at the call site | `SelectItem` with its text as children |
| A separate `NativeSelect` used on mobile, or `useMediaQuery('(max-width: …)')` choosing between two selects | one `Select`: it switches by device itself |
| `disabled` on the root or an item | the same |
| `required`, `name` on the root | the same; submitted through Base UI's hidden input |
| `asChild` | `render={<… />}` |
| `data-[state=open]:` / `data-[placeholder]:` / `data-[state=checked]:` | `data-popup-open:` on the trigger, `data-open:` / `data-closed:` on the popup / `data-placeholder:` on the trigger and the value / `data-selected:` on items; `data-highlighted:` on items |
| `data-[state=open]:animate-in` and friends (tailwindcss-animate) | Transitions on `data-starting-style:` / `data-ending-style:` |

## Parts

| Part | Renders | Notes |
| --- | --- | --- |
| `Select` | — | Base UI Select Root: `items`, `value`/`defaultValue`/`onValueChange`, `multiple`, `name`, `required`, `disabled`, `readOnly`, `autoComplete`, `isItemEqualToValue`, `itemToStringValue`, `modal`. Holds the value for both modes. `native` forces a mode (see **Phones and tablets**); leave it out. |
| `SelectTrigger` | `button` (`div` + `select` in native mode) | The frame. Children: icons (direct `svg` children) and a `SelectValue`; the chevron is added at the end. As wide as its container; with `w-auto`, as wide as its longest option. `aria-label` when there's no label. `data-slot="select-trigger"`. |
| `SelectValue` | `span` | The chosen item's label (from `items`), or `placeholder`. A function child formats it: `{(value) => …}`. Stacks every label from `items` invisibly under the value, so the trigger's width never follows the value. |
| `SelectContent` | Portal + Positioner + Popup + List | The list. Opens over the trigger with the chosen item on the value (`alignItemWithTrigger`, on for a single select, off for `multiple`); otherwise `side`, `align`, `sideOffset`, `alignOffset`. Scroll arrows at both ends. `container` for the portal. In native mode it renders its items as `<option>`s into the trigger's `<select>`. |
| `SelectItem` | `div` (`option`) | `value`, `disabled`, `label` (the text for typeahead and for the native `<option>`; defaults to the item's text). Children are its text and optional icon. A check at the end marks the chosen one. |
| `SelectGroup` | `div` (`optgroup`) | A section. Its `SelectGroupLabel`'s text becomes the `<optgroup>` label in native mode. |
| `SelectGroupLabel` | `div` (nothing) | The section's label, in small caps. |
| `SelectSeparator` | `div` (nothing) | A rule between sections. |

Labels, descriptions and errors come from Base UI's `Field` (`Field.Root`, `Field.Label`, `Field.Description`, `Field.Error`): Input's `Field`, `FieldLabel`, `FieldDescription` and `FieldError` parts (`references/input.md`), or the project's own. This file doesn't ship them, so a project with both has one set.

## Usage
```tsx
const papers = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
  { value: 'legal', label: 'Legal' },
];

<Field>
  <FieldLabel>Paper</FieldLabel>
  <Select name="paper" items={papers} required>
    <SelectTrigger>
      <SelectValue placeholder="Choose a size" />
    </SelectTrigger>
    <SelectContent>
      {papers.map((paper) => (
        <SelectItem key={paper.value} value={paper.value} disabled={paper.value === 'legal'}>
          {paper.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <FieldError match="valueMissing">Choose a paper size.</FieldError>
</Field>
```

- **Pass `items`.** Without them the trigger shows the raw value (`a4`), because the list's items aren't mounted until it opens; `SelectValue`'s width-keeping needs them too. `items` is `{ value, label }[]`, a `{ value: label }` record, or groups: `{ value: 'Serif', items: [...] }[]`.
- Every select needs a name: a `FieldLabel` in a `Field`, or `aria-label` on `SelectTrigger`. A placeholder is not a name.
- Typeahead (type a few letters, open or closed), ↑ ↓ Home End, Enter, Escape and the ARIA are Base UI's.
- Invalid styles key off `data-invalid`, which Base UI sets inside an invalid `Field`, and which `SelectTrigger` also sets when you pass `aria-invalid` yourself. With a form library, pass its error state as `invalid` to `Field`.
- Clearing: a placeholder can't be chosen again once there's a value (as in Base UI). For a select that can go back to empty, add an item with `value={null}` ("None") and give `items` a `{ value: null, label: 'None' }`.
- Object values work: `isItemEqualToValue` compares them, `itemToStringValue` names them for the form (`{ value, label }` objects need neither).

### Sections and separators

```tsx
<SelectContent>
  <SelectGroup>
    <SelectGroupLabel>Serif</SelectGroupLabel>
    <SelectItem value="garamond">EB Garamond</SelectItem>
    <SelectItem value="caslon">Caslon</SelectItem>
  </SelectGroup>
  <SelectSeparator />
  <SelectGroup>
    <SelectGroupLabel>Sans serif</SelectGroupLabel>
    <SelectItem value="geist">Geist</SelectItem>
  </SelectGroup>
</SelectContent>
```

### Several at once

```tsx
<Select items={weights} multiple defaultValue={['regular', 'bold']}>
  <SelectTrigger>
    <SelectValue placeholder="Choose weights" />
  </SelectTrigger>
  …
</Select>
```

The value is an array. The list opens below the trigger instead of over it, so the choices so far stay in view, and stays open while picking. The trigger lists the labels (`Regular, Bold`) and truncates; format it with `SelectValue`'s function child (`{(value) => `${value.length} weights`}`). Each value is sent as its own form entry under the one `name`.

### In a toolbar

```tsx
<SelectTrigger aria-label="Size" className="w-auto">
  <SelectValue />
</SelectTrigger>
```

A trigger fills its container, like an input. With `w-auto` it's as wide as the longest label in `items` (and the placeholder), as a native select is, so a shorter or longer choice never moves what's beside it.

### How it works

- **The list lands on the trigger.** With a mouse, a single select opens over its trigger with the chosen item exactly on the value: the rows are the trigger's height and share its inset, so the text stays put and the check appears where the chevron was. Base UI lines up the chosen row's text with the value's, so with a leading icon in the trigger it would shift the whole panel by the icon and its gap. Instead `SelectTrigger` measures what comes before the value (an icon, an avatar, a flag: anything) and the rows indent their text by as much (`--select-indent` on the panel), so the panel's edges land on the trigger's too, and section labels line up with the icon. Base UI falls back to opening below the trigger when there's too little room or the trigger is within 20px of the viewport's edge, and when the list was opened by touch. Pass `alignItemWithTrigger={false}` to always open below.
- **Long lists** scroll inside the room they have, with an arrow at each end that scrolls while the pointer rests on it (Base UI hides the scrollbar then). Over the trigger, each arrow's hover area reaches past the panel. The page's scroll is locked while the list is open (`modal`, Base UI's default).
- **One width.** `SelectValue` puts the value and every label from `items` in one grid cell; the invisible labels set the width, the value truncates when the cell is narrower. Rows reserve the check's space whether checked or not, so the panel's width doesn't depend on the value either.
- **The value lives in `Select`.** It's passed to Base UI controlled, whether the caller controls it or not, so the native picker can set it too. `onValueChange` gets Base UI's event details in both modes; `details.cancel()` keeps the old value.

### Phones and tablets

On phones and tablets the parts render the platform's own picker. `SelectTrigger` becomes a `div` with the same classes and a native `<select>` laid over it, transparent and as large as the frame, so a tap anywhere opens the picker: the wheel or sheet on iPhone, a popover on iPad, a dialog on Android. `SelectContent` renders its items into that `<select>`: `SelectItem` as `<option>`, `SelectGroup` as `<optgroup>`, disabled items as disabled options, `multiple` as `<select multiple>`; group labels, separators and scroll arrows render nothing.

- **The device decides, never the width.** Native when the user agent names iPhone, iPod, iPad or Android; when it says Macintosh but has touch points (iPadOS asks for desktop sites and poses as a Mac; Macs report none, and an iPad with a trackpad can report a fine, hovering pointer); or when the primary pointer is coarse and can't hover (`(pointer: coarse) and (hover: none)`: an Android tablet asking for desktop sites, a Windows tablet in tablet mode). A touchscreen laptop's primary pointer is its trackpad, so it keeps the list. A narrow desktop window keeps the list.
- **No flash, no mismatch.** The mode is read with `useSyncExternalStore`, `false` on the server: server-rendered pages hydrate with the Base UI trigger and switch right after. Both modes draw the same frame from the same classes, so nothing on screen changes.
- **One value, one name, one Field.** The native `<select>` has no `name`: Base UI's hidden input submits in both modes. The `<select>` takes the Base UI trigger's id (so `FieldLabel` labels it), its `aria-labelledby`, `aria-describedby`, `aria-invalid` and its focus and blur (so Field's focused, touched and on-blur validation work), and is what a Form focuses on an invalid submit. `autoComplete` goes on it too, so iOS AutoFill can fill it.
- **Changes go through the value.** A pick in the picker is mapped back to the item's real value (objects included) and set through the same `onValueChange`. The options are put back at once and follow the value, so read-only, a canceled change or a controlled value that stays put all hold. Each option sets its own selectedness; a hidden, disabled empty option is selected while a single select has no value, so the picker doesn't show the first item as if it were chosen.
- **What an option can't hold.** An `<option>` is text only: an item's text is its `label`, or the text inside it (icons drop out). Rich items (an avatar, a second line, a color swatch) lose that on phones. When that matters more than the platform's picker, pass `native={false}` to that `Select` to keep the list everywhere; `native` forces the picker. Leave it out otherwise.
- **16px.** The trigger's text is 16px on touch screens (as Input's is), and the native `<select>` is always 16px, because iOS zooms the page into a smaller control on focus.
- **Same frame states.** In native mode the focus is on the `<select>` inside, so the frame shows its ring through `:has(> select:focus-visible)`; disabled, read-only, invalid and placeholder come from the same data attributes in both modes.

### Disabled and read-only

- `disabled` (on `Select` or `Field`): dimmed, out of the tab order, not submitted; the native `<select>` is disabled too.
- `readOnly`: focusable, can be opened to see the choices, submitted; the value can't change. A quieter fill. In native mode the picker opens and a pick is undone.

## Rules
- **Never choose the mode by width.** No `useMediaQuery('(max-width…)')`, no breakpoints: the device decides (see **Phones and tablets**). A caller never branches on the mode; `native` is for lists an `<option>` can't show, not for layouts.
- **Pass `items`**, so the trigger shows labels before the list has opened, and keeps its width.
- **Only items, groups, labels and separators inside `SelectContent`.** In native mode it becomes the inside of a `<select>`, where anything else is invalid. A searchable list, a footer or an action in the list is a combobox or a menu, not a select.
- **An item's text is its `label`.** Give `label` to any item whose children aren't plain text (an icon component that renders its own text, a formatted number), so typeahead and the native option read right.
- **A placeholder is not a label.** Every select gets a `FieldLabel` or an `aria-label`.
- **Highlight comes from `data-highlighted`**, never `:hover`, so keyboard and pointer look the same.
- **Don't nest interactive elements** in the trigger: in native mode a `<select>` covers it.
- Every part sets a `data-slot`: `select-trigger`, `select-value`, `select-icon`, `select-content`, `select-list`, `select-scroll-arrow`, `select-item`, `select-item-indicator`, `select-group`, `select-group-label`, `select-separator`.
- Kept basic on purpose. Not included: search inside the list (a combobox; Base UI has `Combobox`), virtualized lists, chips for several values, creating new options. Add them when a real use needs them.
