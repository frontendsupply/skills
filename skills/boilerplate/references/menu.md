# Menu

A dropdown menu of actions, built on `@base-ui/react/menu`, plus a context menu and a menubar made from the same rows. 

## Setup

- **Needs:** `@base-ui/react`, `keyux` (for shortcuts), `lucide-react`, `cn`.
- **Copy:** `components/menu.tsx`, into the project's UI folder.
- **Read for the look:** a popover, select or other dropdown, plus a button.
- **Once per app:** Start KeyUX once, in the app's entry, unless the project already does (then add `hotkeyMacCompat()` to its transforms). Starting it twice would run every shortcut twice:

```ts
import { hotkeyKeyUX, hotkeyMacCompat, startKeyUX } from 'keyux';
startKeyUX(window, [hotkeyKeyUX([hotkeyMacCompat()])]);
```

## Look values the behavior depends on

Change these together:

- **Row spacing.** A row's gap (`gap-2`) equals its padding (`px-2`), so an icon sits in the middle of the row's first square (a row's height wide) and the label starts where that square ends. Change them together.
- **Panel inset.** `PANEL_INSET` (5) is the panel's padding plus its border (`p-1` + 1px). A submenu opens that far above and left of its trigger row so its header lands exactly on the row, and is `2 × PANEL_INSET` wider than the row (`+10px`); its open animation also uses it (`- 5px`). `MenuSeparator`'s negative margin cancels the same padding.
- **Pinned header.** `MenuSubmenuHeader`'s `-top-1 -mx-1 -mt-1 px-1 pt-1` cancel the panel's padding (`p-1`), so it sits flush and lands on its trigger row. Change them with the padding.
- **Radius.** Set it once, through `--menu-radius` on the panel: the submenu's open animation clips to it. Rows keep their own radius.
- **Row height** is free: submenus read the trigger row's height (`anchor.height`, `--anchor-height`).

## Rebuilding one

Look for an existing dropdown menu in the project: a `menu.tsx` or `dropdown-menu.tsx` (or similarly named) file in its UI folder, or a `DropdownMenu` imported from Radix or a component library.

- **Aliases:** keep `DropdownMenu`, `DropdownMenuItem` and the rest when call sites import them.
- **No equivalent here:** `variant="destructive"` on an item (keep it as the project's danger text, a class at the call site) and `inset` (a class too). Say so in the report.
- **Try by hand:** open with the keyboard, drill into a submenu and back (← and Esc), toggle a checkbox item, press a shortcut with the menu closed.

| The project has (shadcn/ui, Radix) | Here |
| --- | --- |
| `DropdownMenu`, `…Trigger`, `…Content`, `…Item`, `…Separator`, `…Shortcut` | `Menu`, `MenuTrigger`, `MenuContent`, `MenuItem`, `MenuSeparator`, `MenuShortcut` |
| `DropdownMenuLabel` | `MenuGroupLabel`, which must sit inside a `MenuGroup` |
| `ContextMenu`, `…Trigger`, `…Content` and its `ContextMenuItem`, `…Separator`, … | `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`; the rows are the `Menu…` parts (keep `ContextMenuItem` and the rest as aliases if call sites import them) |
| `Menubar`, `MenubarMenu`, `MenubarTrigger`, `MenubarContent`, `MenubarItem`, … | `Menubar`, then a `Menu` per entry with `MenubarTrigger` and `MenuContent`; the rows are the `Menu…` parts (keep the old names as aliases) |
| `DropdownMenuSub`, `…SubTrigger`, `…SubContent` | `MenuSubmenu`, `MenuSubmenuTrigger`, `MenuSubmenuContent` plus a `MenuSubmenuHeader` (submenus stack in place instead of flying out) |
| `onSelect` on an item | `onClick`; `closeOnClick={false}` instead of `e.preventDefault()` to keep the menu open |
| `DropdownMenuCheckboxItem`, `…RadioGroup`, `…RadioItem` | `MenuCheckboxItem`, `MenuRadioGroup`, `MenuRadioItem`; `checked`/`onCheckedChange` and `value`/`onValueChange` keep their names |
| `inset` on an item | no equivalent: keep it as a class on the call site |
| `asChild` | `render={<… />}` |
| `data-[state=open]:` / `data-[state=closed]:` | `data-popup-open:` on the trigger; `data-open:` / `data-closed:` on the popup; `data-highlighted:` on items |
| `data-[state=open]:animate-in` and friends (tailwindcss-animate) | Transitions on `data-starting-style:` / `data-ending-style:` |

## Parts

| Part | Renders | Notes |
| --- | --- | --- |
| `Menu` | — | Base UI Root. `open`, `defaultOpen`, `onOpenChange`. |
| `MenuTrigger` | `button` | Unstyled. Usually rendered into another button via `render`. |
| `MenuContent` | Portal + Positioner + Popup | `side`, `align`, `sideOffset`, `alignOffset` go to the positioner; everything else to the popup. `keepMounted` (on by default) keeps the closed menu in the DOM, hidden, so its shortcuts work; turn it off for a menu repeated many times, like one per table row. `container` sets where its portal renders. |
| `MenuItem` | `div` | A row. Icons are children. Rows never wrap: a long label widens the panel. |
| `MenuCheckboxItem` | `div` | A row that toggles (`checked`, `defaultChecked`, `onCheckedChange`); a check shows at its end when on. Checkable rows take no shortcut: the check is their end. `aria-checked` comes from Base UI. |
| `MenuRadioGroup` / `MenuRadioItem` | `div` | One of several (`value`, `onValueChange` on the group; `value` on each item); the chosen one shows the check. |
| `MenuLinkItem` | `a` | Same row, for navigation. |
| `MenuGroup` / `MenuGroupLabel` | `div` | A label must sit inside a group. |
| `MenuSeparator` | `div` | Full-bleed hairline. |
| `MenuShortcut` | `kbd` | `keys` binds a shortcut to its row (see **Shortcuts**) and renders the hint for the platform. Without `keys`, its children are a plain hint. Pushed to the row's end. |
| `MenuItemEnd` | `span` | A row's end, when it holds more than one thing (a badge and a shortcut): wrap them all in it and they sit together at the trailing edge, a small gap apart. One thing at the end needs no wrapper. |
| `MenuSubmenu` | — | Base UI SubmenuRoot. Nest freely; there is no depth limit. |
| `MenuSubmenuTrigger` | `div` | A row that drills in. Adds the trailing chevron. Click, → or Enter opens. |
| `MenuSubmenuContent` | Portal + Positioner + Popup | Opens over the parent with its header on the trigger row; at least the parent's width, wider for long labels. Near the bottom of the screen it shifts up rather than flipping, so it still covers its parent. |
| `MenuSubmenuHeader` | `div` | The panel's title row, pinned while the panel scrolls. Click goes back one level. Pointer only and hidden from screen readers: keyboard users have ← and Esc, and the panel is already named after its trigger. Must sit inside a `MenuSubmenuContent`. |
| `ContextMenu` | — | Base UI Context Menu Root. See **Context menu and menubar**. |
| `ContextMenuTrigger` | `div` | The area a right click or a long press opens it from. Unstyled; turns off text selection and the touch callout so a long press doesn't select. |
| `ContextMenuContent` | Portal + Positioner + Popup | Opens at the pointer. Same panel as `MenuContent`. |
| `Menubar` | `div` | Base UI Menubar: a row of `Menu`s. |
| `MenubarTrigger` | `button` | An entry on the bar, opening its `Menu`. Unlike `MenuTrigger` it has a look of its own. |

## Usage
```tsx
<Menu>
  <MenuTrigger>Account</MenuTrigger>
  <MenuContent>
    <MenuGroup>
      <MenuGroupLabel>Signed in</MenuGroupLabel>
      <MenuItem><User /> Profile <MenuShortcut>⇧⌘P</MenuShortcut></MenuItem>
    </MenuGroup>
    <MenuSeparator />
    <MenuItem><LogOut /> Log out</MenuItem>
  </MenuContent>
</Menu>
```

Open a menu from another component's button with `render`, and match its width with `w-(--anchor-width)`. A menu as wide as its trigger grows from the trigger's middle edge, not a corner, so set its origin too: `data-[side=bottom]:origin-top data-[side=top]:origin-bottom` (Base UI's `--transform-origin` follows `align`, which puts it at a corner):

```tsx
<Menu>
  <SidebarMenuButton render={<MenuTrigger />}>Acme Inc</SidebarMenuButton>
  <MenuContent className="w-(--anchor-width) data-[side=bottom]:origin-top data-[side=top]:origin-bottom">…</MenuContent>
</Menu>
```

### Shortcuts

```tsx
<MenuItem onClick={openProfile}>
  <User /> Profile <MenuShortcut keys="alt+p" />
</MenuItem>
```

- The keys are handled by [KeyUX](https://github.com/ai/keyux); see its README for transforms like user-defined overrides.
- `keys` uses the `aria-keyshortcuts` order: modifiers first, `meta+ctrl+alt+shift+`, then the key (`space`, `plus`, a letter, a digit). Write `ctrl+…` for the usual ⌘-on-Mac shortcut; `hotkeyMacCompat` turns it into ⌘ there, in the hint and the key.
- The row gets `aria-keyshortcuts`; KeyUX clicks it when the keys are pressed, so the row's own `onClick` (or link, or checkbox toggle) runs, with the menu open or closed.
- The hint shows ⌥ P on a Mac and Alt + P elsewhere, and is hidden on touch screens. It's `aria-hidden`: the row's `aria-keyshortcuts` already tells screen readers.
- Rows inside `inert` or `aria-hidden` areas don't answer, so while a modal dialog is open the page's shortcuts stay quiet.
- Shortcuts in a submenu work only once it's been opened: submenus mount when they open. Put shortcuts on the first level.
- Prefer a modifier (`alt+`, `ctrl+`). KeyUX ignores one-letter shortcuts while a text field or menu has focus, and the browser keeps some combinations for itself (⌘L, ⌘T, ⌘W).

### Context menu and menubar

Both come in this file, built from the same rows as `Menu`. How they behave (pointer placement, long press, arrow keys across the bar, hover takeover) is Base UI's: see its [Context Menu](https://base-ui.com/react/components/context-menu.md) and [Menubar](https://base-ui.com/react/components/menubar.md) docs. What this file adds:

```tsx
<ContextMenu>
  <ContextMenuTrigger>{/* the card, row or canvas */}</ContextMenuTrigger>
  <ContextMenuContent>{/* MenuItem, MenuSubmenu, … */}</ContextMenuContent>
</ContextMenu>

<Menubar>
  <Menu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenuContent>{/* MenuItem, MenuSubmenu, … */}</MenuContent>
  </Menu>
</Menubar>
```

- The rows are this file's parts, unchanged: shortcuts, checkbox and radio items and stacked submenus all work inside both.
- Menubar menus stay mounted, so their shortcuts work with the bar closed. `ContextMenuContent` isn't, so its shortcuts work only while it's open.
- A context menu must never be the only way to an action: put the same rows behind a visible control too (write them once, render them in both).

### Nested menus

Submenus stack in place instead of flying out. Each one opens over its parent with its header sitting exactly on the row that opened it; parents stay behind, dimmed. Click the header, ← or Esc to go back one level, or click a dimmed parent to go back to that level. While a child panel is open, its parents don't scroll.

```tsx
<MenuSubmenu>
  <MenuSubmenuTrigger><Folder /> Move to</MenuSubmenuTrigger>
  <MenuSubmenuContent>
    <MenuSubmenuHeader><Folder /> Move to</MenuSubmenuHeader>
    <MenuSubmenu>…</MenuSubmenu>  {/* nest as deep as needed */}
    <MenuItem>Personal</MenuItem>
  </MenuSubmenuContent>
</MenuSubmenu>
```

For data-driven trees, write a small recursive component at the usage site that maps nodes to these parts. Don't add an `items` prop to the menu.

## Rules
- Highlight comes from Base UI's `data-highlighted`, never `:hover`, so keyboard and pointer look the same.
- The header repeats the trigger's icon and label, so the row appears to turn into the header.
- Keep `MenuSubmenu` a pass-through to Base UI's SubmenuRoot. Don't control its `open` state inside the component: it breaks Base UI's keyboard focus hand-off into the new panel. The header closes the panel through Base UI's `actionsRef`.
- Use checkbox and radio items for state the menu shows (a status, a view option), never a plain item with a hand-drawn check: they carry `aria-checked`.
