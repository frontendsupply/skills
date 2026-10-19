# Input

A text field built on `@base-ui/react/input`, with a frame (`InputGroup`) for what sits beside it, Base UI's `Field` for its label, description and error, and Base UI's `Autocomplete` for suggestions. 

## Setup

- **Needs:** `@base-ui/react`, `lucide-react` (the default icons of the clear, show-password, copy and Caps Lock parts), `cn`.
- **Copy:** `components/input.tsx`, into the project's UI folder.
- **Read for the look:** an input or text field, a button (the input should be as tall as it), a popover or menu (for the suggestions), and how it shows errors.

## Look values the behavior depends on

The standalone `Input` and `InputGroup` are the same frame: style them alike.

Change these together:

- **Height.** Set it once, through `--input-height` (on `Input` and on `InputGroup`; a caller can override it with a class, `[--input-height:2.5rem]`). Match the project's button height, so an input and a button sit in a row. The buttons inside derive from it.
- **One inset.** The frame's padding (`px-2.5`) is the inset on both sides: whatever comes first starts on it, whatever comes last ends on it, an icon, an addon, the text or a button's icon. Keep the standalone `Input`'s padding equal to it, so text lines up in a form that mixes the two.
- **Buttons.** An `InputButton` is `--input-height − 8px` tall, so it sits 3px inside a 1px border. Its negative inline margin equals its padding, and both equal the space around its 16px icon (`(height − 8px − 16px) / 2`, 4px at 32px), so its icon or text lands on the frame's inset like any other icon and only the hover fill reaches past it. The same margins cancel the gap (`gap-2`) between two buttons, so they touch; change the gap with them.
- **Group labels** are pinned at `-top-1`, which cancels the panel's `p-1`; change them together. Their fill (`bg-base`) must match the panel's.
- **Suggestion rows.** One line is 32px: a 20px line height (`leading-5`) plus `py-1.5`. The icon's `mt-0.5` centers a 16px icon on that first line; change them together.
- The inset's size, the gap after an icon, radius, colors and type are free.

## Rebuilding one

Look for an existing input in the project: an `input.tsx`, `text-field.tsx` or `input-group.tsx` (or similarly named) file in its UI folder, or an `Input`/`TextField` imported from a component library. Also look for existing Field parts (`Field`, `FormItem`, `FormLabel`, `FormMessage`): if the project already has them, keep using those, and leave this file's `Field…` parts out.

- **Aliases:** keep `InputGroupInput`, `InputGroupAddon` or `InputGroupButton` when call sites import them.
- **No equivalent here:** a `size` prop, a textarea. Keep them working as they did and say so, or ask before removing them.
- **Try by hand:** type, clear, reveal a password, submit a form if a screen has one, and one field on a phone.

| The project has (shadcn/ui, Radix) | Here |
| --- | --- |
| `<Input />` | `<Input />`; `onChange` still works, `onValueChange(value)` is added |
| `InputGroup` + `InputGroupInput` | `InputGroup` + `Input` (the input knows when it's in a group) |
| `InputGroupAddon` holding an icon | the icon as a direct child of `InputGroup` |
| `InputGroupAddon` / `InputGroupText` holding text | `InputAddon` |
| `InputGroupAddon align="inline-end"` | write it after the input |
| `InputGroupButton` | `InputButton`, or `InputClear` / `InputPasswordToggle` / `InputCopy` when that's what it does |
| An icon absolutely positioned over the input with `pl-9` | the icon inside an `InputGroup`, no padding hacks |
| A hand-written show/hide password button (`useState` + `type`) | `InputPasswordToggle` |
| A hand-written clear button (`setValue('')`) | `InputClear` |
| A `⌘K` badge plus a `keydown` listener that focuses the search | `InputKbd keys="ctrl+k"` |
| `{value.length}/{max}` under or beside the field | `InputCount` |
| `FormItem`, `FormLabel`, `FormDescription`, `FormMessage` (react-hook-form `Form`) | keep them if they're used across the project; otherwise `Field`, `FieldLabel`, `FieldDescription`, `FieldError match` with `Field invalid` |
| `Label htmlFor` + `Input id` | `FieldLabel` inside a `Field` (ids are automatic), or keep the pair |
| `Command` / `Popover` + `Input` used for suggestions | `Autocomplete` parts, if the value is free text; a combobox if it must come from the list |
| `aria-invalid:` / `data-[invalid]:` classes | the same: `aria-invalid:` on `Input`, `has-[…[aria-invalid=true]]:` on `InputGroup` |
| `asChild` | `render={<… />}` |
| `data-[state=open]:` on the suggestions | `data-open:` / `data-closed:` on the popup, `data-highlighted:` on items |

## Parts

| Part | Renders | Notes |
| --- | --- | --- |
| `Input` | `input` | Base UI Input: every native attribute, plus `onValueChange(value, details)`. Alone, it is its own frame; inside an `InputGroup`, the group is the frame and the input fills what's left. `data-slot="input"`. |
| `InputGroup` | `div` | The frame. Children in order: icons (direct `svg` children), `InputAddon`s, one `Input` (or `AutocompleteInput`), then hints and buttons. Clicking anything in it that isn't a control focuses the input, with the caret where a click there would put it. Sets `data-filled`, `data-disabled` and `data-readonly` from the input. Takes `render`. |
| `InputAddon` | `span` | Text inside the frame, before or after the input: `$`, `USD`, `kg`, `https://`. Added to the input's `aria-describedby`. In a frame too narrow for everything, one before the input truncates (a long domain); one after it keeps its width (a unit only means something whole). Takes `render`. |
| `InputButton` | `button` | A plain button inside the frame: a search's submit, a menu trigger, a text action. Icon alone: square, and needs an `aria-label`. Disabled with the input. Base UI Button props. |
| `InputClear` | `button` | Empties the input as if typed, and puts the caret back in it. Shown only while there's a value and the input is neither disabled nor read-only; hidden, it keeps its place. Default icon `X`, default name "Clear". |
| `InputPasswordToggle` | `button` | Shows a `type="password"` input as text and back (`aria-pressed`), keeping the caret and selection. Hides it again when the form is submitted. Default icons `Eye` / `EyeOff`, default name "Show password". |
| `InputCopy` | `button` | Copies the input's value; disabled while it's empty. `data-copied` for two seconds after each copy (the default icon becomes a check), and screen readers hear `copiedLabel` ("Copied"). If the clipboard is missing or blocked it selects the text instead. Default icon `Copy`, default name "Copy". |
| `InputKbd` | `kbd` | `keys` (`ctrl+k`, `/`): pressing them anywhere focuses the input and selects its text. Shows the hint for the platform (⌘K on a Mac, Ctrl K elsewhere) unless it has children; hidden while the input has focus and on touch screens. Gives the input `aria-keyshortcuts`. |
| `InputCount` | `span` | "12/80". `max` defaults to the input's `maxLength`; pass it for a soft limit (`data-over` past it). Screen readers hear the limit with the description, and what's left once typing pauses near it. `limitLabel`, `remainingLabel` for other languages. |
| `InputCapsLock` | `svg` | A sign while Caps Lock is on and the input has focus (a password field); announced. Nothing otherwise. `label` for other languages. |
| `Field` | `div` | Base UI Field Root: wires the label, description and error to the control, and validates. `name`, `disabled`, `invalid`, `validate`, `validationMode` (`onSubmit` default, `onBlur`, `onChange`). |
| `FieldLabel` | `label` | Labels the control (`htmlFor` is automatic). |
| `FieldDescription` | `p` | Help text, read after the label. |
| `FieldError` | `div` | Shown when the field is invalid. `match` picks the case: `valueMissing`, `typeMismatch`, `patternMismatch`, `tooShort`, `customError`…, or `true` to always show it (a form library's message). |
| `Autocomplete` | — | Base UI Autocomplete Root: `items`, `value`/`defaultValue`/`onValueChange`, `mode`, `autoHighlight`, `limit`, `filter`, `openOnInputClick`, `submitOnItemClick`. |
| `AutocompleteInput` | `input` | The input, alone or in an `InputGroup`. In a group, the list opens under the whole frame, as wide as it. |
| `AutocompleteContent` | Portal + Positioner + Popup | The list's panel. `side`, `align`, `sideOffset`, `alignOffset`, `container`. Scrolls past 20rem or the room it has. Stays hidden while it has nothing to show. |
| `AutocompleteList` | `div` | Takes the items as a function: `{(item) => <AutocompleteItem …/>}`. |
| `AutocompleteItem` | `div` | A suggestion (`value`). Long text wraps; the row grows a line at a time. Icons are children. |
| `AutocompleteGroup` / `AutocompleteGroupLabel` | `div` | A section of suggestions and its label (`items` on the group). The label stays pinned while its section scrolls. |
| `AutocompleteCollection` | — | Renders a group's items: `{(item) => <AutocompleteItem …/>}`. |
| `AutocompleteEmpty` | `div` | Text shown when nothing matches (needs `items` on `Autocomplete`). |
| `AutocompleteStatus` | `div` | Text for suggestions that load: "Searching…", "3 results", an error. Announced politely. |

## Usage
```tsx
<Input aria-label="Name" placeholder="Ada Lovelace" />

<InputGroup>
  <Search />
  <Input type="search" aria-label="Search" enterKeyHint="search" />
  <InputClear />
</InputGroup>
```

With a label, help and an error:

```tsx
<Field validationMode="onBlur">
  <FieldLabel>Email</FieldLabel>
  <Input type="email" required autoComplete="email" />
  <FieldError match="valueMissing">Enter your email.</FieldError>
  <FieldError match="typeMismatch">That doesn't look like an email address.</FieldError>
  <FieldDescription>Receipts go here.</FieldDescription>
</Field>
```

- Every input needs a name: a `FieldLabel`, a `<label>`, or `aria-label`. A placeholder is not a name.
- An input in an `InputGroup` inside a `Field` is wired the same way; put the group where the input would be.
- Invalid styles key off `aria-invalid="true"`, which Field sets. With a form library (react-hook-form, Conform, TanStack Form), pass its error state as `invalid` to `Field` and show its message in a `FieldError match`, or set `aria-invalid` on the input yourself.

### The frame

`InputGroup` lays out icons, addons, the input and buttons in a row, in the order you write them:

```tsx
<InputGroup>
  <InputAddon>$</InputAddon>
  <Input aria-label="Amount" inputMode="decimal" />
  <InputAddon>USD</InputAddon>
</InputGroup>

<InputGroup>
  <Lock />
  <Input type="password" aria-label="Password" autoComplete="current-password" />
  <InputPasswordToggle />
</InputGroup>

<InputGroup>
  <Input aria-label="API key" readOnly value={key} />
  <InputCopy />
</InputGroup>

<form action={search}>
  <InputGroup>
    <Search />
    <Input name="q" type="search" aria-label="Search" />
    <InputClear />
    <InputButton type="submit" aria-label="Search"><ArrowRight /></InputButton>
  </InputGroup>
</form>
```

How it works:

- **One state, read from the input.** The group reads the input's value, `maxLength`, `disabled` and `readOnly` from the DOM after every render of the input, on every `input` event (typing, paste, autofill, `InputClear`) and after a form reset. So it's right whether the input is controlled, uncontrolled, disabled by a `Field` or reset by its form, and the parts follow: `InputClear` hides, `InputCopy` waits for a value, `InputCount` counts, every button is disabled with the input. The group shows the same state as `data-filled`, `data-disabled` and `data-readonly` for the caller's own styles; its built-in styles use `:has()` on the input instead, so they're right before hydration.
- **Clear types an empty string.** It sets the value through the native setter and fires an `input` event, so React's `onChange`, Base UI's `onValueChange`, Field validation and form libraries all see it as typing. A controlled input clears through its own state.
- **The caret stays in the input.** Clicking the frame's padding, an icon or an addon focuses the input, and puts the caret at the end of the text when the click was past it, at the start when it was before it, as in a field in one piece (right-to-left too). Clear and show-password don't take focus on press (`preventDefault` on `mousedown`), so a phone's keyboard stays up; Copy does, so its focus ring shows.
- **The frame shows the input's state**, through `:has()`: focus ring while the input has focus (a focused button shows its own), `aria-invalid`, `disabled`, `readonly`.
- **Inside the frame, the browser's extras go:** the search field's own clear button, Edge's password reveal, and the autofill fill (which would paint a box inside the frame). Alone, an `Input` keeps them.
- **The input always keeps room to type**: at least 64px (`min-w-16`) however much else is in the frame. A leading addon gives way first and truncates; trailing addons, hints and buttons keep their width, so keep them few in a narrow field.
- **Icons are direct `svg` children**, like Button's: the group sets their size, and they sit on the frame's inset like the text. An icon wrapped in another element isn't seen as one.
- **Addons are part of the description.** Each `InputAddon` (and `InputCount`) registers its id and the input adds it to `aria-describedby` (merged with the Field's ids), so "Website, https://" is what a screen reader says.
- **Announcements without a visible message** ("Copied", "Caps Lock is on", "3 characters left") go to one polite live region, created on first use. Inside a modal dialog it's created in the dialog, because a modal makes everything outside it inert, a region on the body included.
- **Hiding a password on submit** (GOV.UK's pattern): a revealed password turns back into a password field when its form submits, before the browser reads it, so password managers save it and a page that stays on screen doesn't keep showing it. While revealed, the input is told not to capitalize, autocorrect or spellcheck (spellcheck can send text to a server).

### Hints: a shortcut, a count, Caps Lock

```tsx
<InputGroup>
  <Search />
  <Input type="search" aria-label="Search" />
  <InputKbd keys="ctrl+k" />
</InputGroup>

<InputGroup>
  <Input aria-label="Headline" maxLength={80} />
  <InputCount />
</InputGroup>

<InputGroup>
  <Input type="password" aria-label="Password" autoComplete="current-password" />
  <InputCapsLock />
  <InputPasswordToggle />
</InputGroup>
```

- **`InputKbd`** listens on the document. It ignores the keys when the input is disabled, hidden (`display: none`, a closed drawer) or inside `inert` / `aria-hidden` (behind a modal, in a preview), and a shortcut without a modifier (`/`) while another field has focus, so it can still be typed there. `keys` are in `aria-keyshortcuts` order, like Menu's: modifiers first (`meta+ctrl+alt+shift+`), then the key; `ctrl` is ⌘ on a Mac. Letters and digits match by position, so ⌥ shortcuts work on a Mac too. Don't take a key the browser keeps (⌘L, ⌘T, ⌘W). When the field isn't mounted (a collapsed sidebar), handle the keys at the call site.
- **`InputCount`** counts what `maxLength` counts (UTF-16 code units). With `maxLength` the browser stops typing at the limit; for a soft limit (people paste and trim), leave `maxLength` off, pass `max`, and validate with `Field`'s `validate`. Screen readers hear "Up to 80 characters" with the field, then, a second after typing pauses in the last fifth of the limit, "12 characters left" (GOV.UK's pattern): never on every key.
- **`InputCapsLock`** can only know about Caps Lock from key and pointer events, so it shows from the first key or click in the field, and hides when the field loses focus. Safari's own sign in password fields is hidden while it shows, so there's one.

### Suggestions

For free text where a few values are likely: tags, cities, search terms, names. For a value that must come from the list, use a select or combobox instead.

```tsx
<Field>
  <FieldLabel>Typeface</FieldLabel>
  <Autocomplete items={typefaces}>
    <InputGroup>
      <Type />
      <AutocompleteInput placeholder="Start typing" />
      <InputClear />
    </InputGroup>
    <AutocompleteContent>
      <AutocompleteEmpty>No typeface by that name.</AutocompleteEmpty>
      <AutocompleteList>
        {(name: string) => <AutocompleteItem key={name} value={name}>{name}</AutocompleteItem>}
      </AutocompleteList>
    </AutocompleteContent>
  </Autocomplete>
</Field>
```

- Filtering, keyboard (↑ ↓ Enter Escape), `aria-activedescendant` and announcements are Base UI's. See its [Autocomplete docs](https://base-ui.com/react/components/autocomplete.md) for objects as items (`itemToStringValue`), groups, async search, inline completion (`mode="both"`) and virtualized lists.
- Async: pass `filter={null}` and the loaded `items`, and show progress in `AutocompleteStatus`.
- `AutocompleteInput` finds its `InputGroup` and anchors the list to it, so the panel lines up with the frame, not the text inside it. Picking a suggestion updates the group too (the clear button appears).
- `InputClear` works inside it unchanged: clearing closes the list.
- Sections: pass `items` as groups (`{ value: 'Serif', items: [...] }[]`); Base UI filters inside each and drops empty ones.

  ```tsx
  <AutocompleteList>
    {(group: Group) => (
      <AutocompleteGroup key={group.value} items={group.items}>
        <AutocompleteGroupLabel>{group.value}</AutocompleteGroupLabel>
        <AutocompleteCollection>
          {(name: string) => <AutocompleteItem key={name} value={name}>{name}</AutocompleteItem>}
        </AutocompleteCollection>
      </AutocompleteGroup>
    )}
  </AutocompleteList>
  ```

### Mobile keyboards and autofill

These are native attributes; the platform does the rest. Pick them per field:

| Field | Attributes |
| --- | --- |
| Email | `type="email" autoComplete="email"` |
| Password (sign in / sign up) | `type="password" autoComplete="current-password"` / `"new-password"` |
| One-time code | `inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*"` |
| Phone | `type="tel" autoComplete="tel"` |
| URL | `type="url"`, or `inputMode="url"` when the scheme is an addon |
| Amount, weight | `inputMode="decimal"` (not `type="number"`: it drops leading zeros, scrolls with the wheel and can't be formatted) |
| Card, ZIP, ID numbers | `inputMode="numeric"` with `autoComplete="cc-number"` / `"postal-code"` |
| Search | `type="search" enterKeyHint="search"` |
| Handle, code, key | `autoCapitalize="none" autoCorrect="off" spellCheck={false}` |
| Name, address | `autoComplete="name"`, `"street-address"`, `"address-level2"`… |

`enterKeyHint` (`search`, `send`, `next`, `done`, `go`) labels the return key. Typed text is 16px on touch screens (`any-pointer-coarse:text-base`, a behavior class), because iOS zooms the page into any field smaller than that.

### Disabled and read-only

- `disabled` (on the `Input` or the `Field`): dimmed, out of the tab order, not submitted. Every button in the frame is disabled with it, and `InputClear` hides.
- `readOnly`: focusable, selectable, copyable, submitted. A quieter fill; `InputClear` hides, `InputCopy` stays.
- A button disabled on its own (an `InputCopy` with nothing to copy) dims; in a disabled field only the frame dims, once. Prefer it to `disabled` for values people need to read or copy.

## Rules
- **One height.** No `size` prop: the input matches the button. A denser or larger one sets `--input-height`, and everything inside follows.
- **A placeholder is not a label.** Every input gets a `FieldLabel`, `<label>` or `aria-label`; a placeholder is an example of the format at most.
- **Icons are children, never props.** An icon-only `InputButton` needs an `aria-label`. `InputClear`, `InputPasswordToggle` and `InputCopy` name themselves when they show an icon alone; with text children, the text is the name. Pass `aria-label` for another language.
- **One input per group.** Two values are two fields.
- **Don't nest interactive elements** inside an `InputAddon`; a control in the frame is an `InputButton`.
- **Never set an input's value by assigning `input.value`** from outside React; it bypasses `onChange` and the group. Change the state, or type it the way `InputClear` does.
- **Prefer `readOnly` to `disabled`** for values people need to read or copy: a disabled field can't be focused, selected or copied, and isn't submitted.
- Every part sets a `data-slot`: `field`, `field-label`, `field-description`, `field-error`, `input`, `input-group`, `input-addon`, `input-button`, `input-clear`, `input-password-toggle`, `input-copy`, `input-kbd`, `input-count`, `input-caps-lock`, `autocomplete-content`, `autocomplete-list`, `autocomplete-group`, `autocomplete-group-label`, `autocomplete-item`, `autocomplete-empty`, `autocomplete-status`.
- Kept basic on purpose. Not included: a textarea, a number field with steppers, an OTP field (Base UI has `NumberField` and `OTPField`), input masks, and chips for several values. Add them when a real use needs them.
