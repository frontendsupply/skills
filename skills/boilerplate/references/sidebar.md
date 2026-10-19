# Sidebar

An app sidebar built from small composable parts. On desktop it sits beside the page, on the left or the right, and collapses to a rail of icons (that can peek open on hover) or away entirely, with a trigger or a shortcut; its edge drags to resize it, and a sub panel can open next to it for one section's own pages. Below 768px it becomes a drawer that slides in from its edge. It scrolls with Base UI's ScrollArea, and composes with Menu and Base UI's Collapsible through the `render` prop. 

## Setup

- **Needs:** React 19 (for `inert` and `ref` as a prop), `@base-ui/react`, `lucide-react`, `cn`. For collapsible sections or rows, Base UI's [Collapsible](https://base-ui.com/react/components/collapsible.md) directly (see **Usage**); for dropdowns, Menu; for a search field, Input.
- **Copy:** `components/sidebar.tsx`, into the project's UI folder.
- **Read for the look:** an existing navigation or list, a button and an icon button.

## Look values the behavior depends on

Change these together:

- **Trailing inset.** Badges and actions sit `top-1 right-1`: (row height − icon button size) / 2, with a 32px row and a 24px button. `SidebarGroupAction` sits `top-3 right-3`: the group's padding plus that inset.
- **Reserved space.** A row with an action pads its end by `pr-8`; keep it at least the icon button's width plus the inset. A row with a badge pads it by the badge's measured width plus 8px (the 4px inset and a 4px gap), never less than `pr-8`. A group label followed by a group action pads by `pr-8` too.
- **Breakpoint.** The desktop box hides below Tailwind's `md` (`max-md:hidden`) so a server-rendered page never flashes it on a phone; `MOBILE_QUERY` (767px) must match. Change both together.
- **Nesting.** `SidebarMenuSub`'s `ml-4` puts its guide line under the parent's icon (row padding + half the icon), and its 1px line plus `pl-1.75` equal the row's gap (`gap-2`), so nested icons start where the parent's label does. Change them with the row padding, the icon size and the gap.
- **Vertical rhythm.** Rows are 32px with 1px between them everywhere: `SidebarMenu` and `SidebarMenuSub` have `gap-px`, a group puts the same `gap-px` between its label and its rows, and a nested list adds only `pt-px` (the list after it adds the rest). Sections are 16px apart (two group paddings). Change them together.
- **Row spacing.** A row's gap (`gap-2`) equals its padding (`px-2`), so the icon sits in the middle of the row's first square, the square the row becomes in the rail, and the label starts where that square ends. Change them together.
- **Leading slot.** Every row's first child sits on one axis: the icon's center, 24px in (group padding + row padding + half the icon). Something wider than the icon placed first (a 20px logo or avatar) takes a negative inline margin of half the difference (`-mx-0.5`), so it stays centered on that axis and its label lines up with the others.
- **Rail width.** `--sidebar-width-icon` (3rem) is a rail row (`size-8`, square) plus the group padding (`p-2`) on both sides, so icons sit in the middle. Change it with the row height and the group padding.
- **Width.** `--sidebar-width` (16rem, on `SidebarProvider`, or `width` in px) sizes both the sliding outer box and the fixed inner box, so rows never reflow while it animates. The inner box is capped at the screen only in the drawer.
- **Rail dot.** A badge's dot is centered on its row icon's top-right corner: the icon spans 8–24px of the 32px row (row padding, 16px icon), so the 6px dot sits at `top-1.25 left-5.25`. Change it with the row padding and the icon size.
- **Peek.** The peeking panel repeats the sidebar's surface and border (`bg-weak`, the border on the page side), since the outer box is only as wide as the rail; restyle them together.
- **Hairlines.** The header's and footer's scroll hairlines are a 1px shadow, so they never move a row; keep them a shadow.
- **Resize handle.** 8px wide over the inner border (`-right-px` / `-left-px`); its line shows on hover, drag and keyboard focus.

## Rebuilding one

Look for an existing app sidebar in the project: a `sidebar.tsx` (or similarly named) file in its UI folder, or a sidebar imported from a component library.

- **Aliases:** keep `SidebarGroupContent`, `SidebarMenuSubItem`, `SidebarMenuSubButton`, `SidebarInput` and the like when call sites import them (see the table).
- **No equivalent here:** `variant="floating"` or `"inset"`, `SidebarMenuSkeleton`. Keep them working as they did and say so, or ask before removing them.
- **Try by hand:** collapse to the rail and back, hover a rail row (tooltip), resize, the shortcut, and the drawer on a phone (open, follow a link, it closes).

| The project has (shadcn/ui, Radix) | Here |
| --- | --- |
| `useSidebar()` → `{ state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar }` | the same names, except `toggleSidebar` = `toggle` and `state` = `open ? 'expanded' : 'collapsed'`: keep those two as aliases if call sites read them |
| `SidebarMenuButton isActive` | the same |
| `collapsible="icon"` / `"offcanvas"` / `side="right"` | the same, on `Sidebar` (`icon` and `left` are the defaults) |
| `SidebarMenuButton tooltip` | the same; shown only while collapsed to the rail |
| `SidebarRail` (a strip on the edge that toggles) | `SidebarResizer`: dragging resizes, and collapses and expands |
| The `ctrl+b` / `⌘B` keyboard shortcut (`SIDEBAR_KEYBOARD_SHORTCUT`) | `SidebarProvider keys="ctrl+b"` |
| Cookie persistence (`sidebar_state`) | `defaultOpen` from the cookie, `onOpenChange` writes it (see **Keep it collapsed across reloads**) |
| `SidebarInput` | Input's `InputGroup` (see **Search**); keep `SidebarInput` as a thin alias if call sites import it |
| A mobile `Sheet` with its close button | the drawer is built in; add `SidebarClose` to the header |
| `SidebarGroupContent`, `SidebarMenuSubItem`, `SidebarMenuSubButton` | `SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton` reused inside `SidebarMenuSub` (keep the old names as aliases) |
| `asChild` | `render={<… />}` |
| `data-[state=open]:` / `data-[state=closed]:` | `data-state="expanded"` / `"collapsed"` on `Sidebar` (and `group/sidebar` for its children), `"open"` / `"closed"` on `SidebarPanel`; `data-active:` on rows |
| `data-[state=open]:animate-in` and friends (tailwindcss-animate) | Transitions on `data-starting-style:` / `data-ending-style:` |

## Parts

| Part | Renders | Notes |
| --- | --- | --- |
| `SidebarProvider` | `div` | Holds the state. `open` (expanded), `defaultOpen`, `onOpenChange` are the desktop sidebar's; the mobile drawer always starts closed, and forgets it was open when the window widens past the breakpoint. `width`, `defaultWidth`, `onWidthChange`: the expanded width in px (see **Resize**); leave them out for `--sidebar-width`. `keys`: a shortcut that toggles it (see **Shortcut**). Sets `--sidebar-width` (16rem), `--sidebar-width-icon` (3rem, the rail), `--sidebar-panel-width` (15rem) and `--sidebar-top` (0px, see **Below an app bar**). Shares one tooltip provider across the rail. |
| `Sidebar` | `div` + `nav` | Desktop: sticky, full height (below `--sidebar-top`). Collapsed, `collapsible="icon"` (default) narrows it to the rail (see **The rail**), `"peek"` does too and opens it over the page on hover (see **Peek**), and `"offcanvas"` slides it away to width 0, `inert`. `side`: `"left"` (default) or `"right"` (see **Right side**). `data-state="expanded"` / `"collapsed"` (how its rows show: expanded while peeking), `data-collapsed` (its layout), `data-side`, `data-peek`. If collapsing hides what has focus, focus moves to the trigger. Below 768px: a Base UI Drawer from its edge, always expanded (focus trapped; Escape, a swipe and `SidebarClose` close it, and so does a row that goes somewhere, see **On phones**), portaled into the provider. The `nav` inside is the landmark; `label` names it (default "Sidebar"). |
| `SidebarPanel` | `div` + `nav` | The sub panel: a second column next to the sidebar for one section's pages (see **Sub panel**). `open` (the app decides), `label`. Slides open and closed, `inert` when closed; if focus was inside, it moves to the sidebar's current row. On phones it opens inside the drawer, over the sidebar (see **Sub panel**). |
| `SidebarTrigger` | `button` | Toggles whichever applies: the sidebar or the drawer. Sets `aria-expanded`, `aria-controls` and the shortcut's `aria-keyshortcuts`. Its default icon faces the sidebar's side; children replace it; `render` makes it another component (e.g. `Button`). A caller's `event.preventDefault()` cancels the toggle. Place it in `SidebarInset`. |
| `SidebarClose` | `button` | Closes the drawer on phones; renders nothing on desktop. Every drawer needs one: screen reader and switch users can't swipe or tap the scrim. Put it in `SidebarHeader`. |
| `SidebarResizer` | `div` | The resize handle on the inner edge (see **Resize**). `min` (192), `max` (480), `step` (16). Renders nothing on phones. Put it inside `Sidebar`. |
| `SidebarInset` | `div` | The page next to the sidebar. A `div`, because most layouts already have a `<main>`: `render={<main />}` if yours doesn't. |
| `SidebarHeader` / `SidebarFooter` | `div` | Fixed top and bottom areas. A hairline shows under the header while rows scroll under it, and over the footer while more rows are below. |
| `SidebarContent` | ScrollArea | The scrolling middle. Follows its content's size, so the scrollbar is right when a section expands. Never scrolls sideways: its content is held to its width, so long labels truncate. Keeps the current row (`data-active`) in view: on load, whenever another row becomes current, and whenever the sidebar turns into the rail or back (which hides and shows labels and nested rows); it scrolls just enough, never the page. |
| `SidebarGroup` | `div` | A section. |
| `SidebarGroupLabel` | `div` | Section label. Render it into `Collapsible.Trigger` to make the section collapsible. Long labels truncate, short of a `SidebarGroupAction` after it. |
| `SidebarGroupAction` | `button` | Icon button on the label row. |
| `SidebarMenu` / `SidebarMenuItem` | `ul` / `li` | The list and its rows. |
| `SidebarMenuButton` | `button` | The row. `isActive` sets `data-active` and `aria-current`. `tooltip` names it in the rail, beside it, while collapsed (give one to every top-level row). |
| `SidebarMenuBadge` | `span` | Trailing count. Its row's label stops short of it however wide it gets ("999+"): it reports its width to its item (`--sidebar-menu-badge-width`). In the rail it becomes a dot on its row's icon; its text stays for screen readers. |
| `SidebarMenuAction` | `button` | Trailing icon button. `showOnHover` hides it until its own row is hovered or focused; on touch screens, which can't hover, it always shows. |
| `SidebarMenuSub` | `ul` | A nested `SidebarMenu`, indented with a guide line. Reuse `SidebarMenuItem` and `SidebarMenuButton` inside it. |
| `useSidebar()` | — | `{ open, setOpen, openMobile, setOpenMobile, isMobile, toggle, width, setWidth, side }`. |

## Usage
```tsx
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <Menu>
            <SidebarMenuButton render={<MenuTrigger />}>
              <span>Acme Inc</span>
              <ChevronDown className="ml-auto" />
            </SidebarMenuButton>
            <MenuContent className="w-(--anchor-width) data-[side=bottom]:origin-top data-[side=top]:origin-bottom">…</MenuContent>
          </Menu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Workspace</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive tooltip="Inbox" render={<a href="/inbox" />}>
              <Inbox /> <span>Inbox</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>12</SidebarMenuBadge>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      {/* Collapsible section: Base UI's Collapsible (import { Collapsible } from '@base-ui/react/collapsible') */}
      <Collapsible.Root defaultOpen render={<SidebarGroup />}>
        <SidebarGroupLabel render={<Collapsible.Trigger />}>Projects</SidebarGroupLabel>
        <SidebarGroupAction aria-label="New project"><Plus /></SidebarGroupAction>
        <Collapsible.Panel className={panel}>
          <SidebarMenu>
            {/* Collapsible row with a hover action and nested rows */}
            <Collapsible.Root render={<SidebarMenuItem />}>
              <SidebarMenuButton render={<Collapsible.Trigger />}>
                <Folder /> <span>acme-website</span>
              </SidebarMenuButton>
              <Menu>
                <SidebarMenuAction showOnHover aria-label="Options" render={<MenuTrigger />}>
                  <MoreHorizontal />
                </SidebarMenuAction>
                <MenuContent side="right">…</MenuContent>
              </Menu>
              <Collapsible.Panel className={panel}>
                <SidebarMenuSub>
                  <SidebarMenuItem>
                    <SidebarMenuButton render={<a href="#" />}><span>Thread</span></SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenuSub>
              </Collapsible.Panel>
            </Collapsible.Root>
          </SidebarMenu>
        </Collapsible.Panel>
      </Collapsible.Root>
    </SidebarContent>

    <SidebarFooter>…</SidebarFooter>
  </Sidebar>

  <SidebarInset>
    <SidebarTrigger />
    …
  </SidebarInset>
</SidebarProvider>
```

### The rail

Collapsed, a row shows only its first child, centered in a square: its icon, or a logo or avatar placed first. The rest stays in the DOM, visually hidden, so the row keeps its accessible name; its `tooltip` shows the name on hover. Actions, group labels, group actions and nested rows (`SidebarMenuSub`) are hidden; a badge becomes a dot on its row's icon, so a count isn't lost. Nothing reflows: the inner box keeps the full width and the outer box clips it.

A row that opens nested rows (rendered into `Collapsible.Trigger`) has nowhere to show them in the rail, so clicking it there expands the sidebar with its section open; if the section was already open, it stays open. `SidebarMenuButton` recognises such a row by `aria-expanded` without `aria-haspopup`, so menu triggers still open their menus from the rail. Only rows inside the rail behave this way (and show their tooltips): rows in a `SidebarPanel` beside it, or in the drawer, stay ordinary rows while the sidebar is collapsed.

So every top-level row needs an icon first and a `tooltip`, and a row that opens nested rows needs a trailing chevron that turns when it opens. A row without nested rows gets no chevron: it would read as one that opens. A row that opens a sub panel gets a chevron that points right and never turns (see **Sub panel**). A collapsible section whose label is its only trigger can't be opened from the rail (labels are hidden there): keep the rows people need most outside it.

### Peek

```tsx
<SidebarProvider defaultOpen={false}>
  <Sidebar collapsible="peek">…</Sidebar>
  <SidebarInset>…</SidebarInset>
</SidebarProvider>
```

- Collapsed, it's the rail. The pointer reaching it opens the whole sidebar over the page at once, and the page doesn't move; it starts closing 150ms after the pointer leaves, so overshooting the edge by a few pixels doesn't. Tabbing into the rail opens it at once (`:focus-visible` only, so a tap or click on a row doesn't), and it stays open while keyboard focus is inside. A menu opened from it (a `MenuTrigger` row, `data-popup-open`) holds it open until the menu closes. Escape closes it. The trigger pins it open.
- How: the outer box keeps the rail's width; `data-peek` (`"open"` or `"closing"`) makes it `overflow-visible` (clipped on the screen's side only) and its `nav` absolute at full width, with the sidebar's surface and border; `data-state` turns `expanded`, so rows show labels.
- The motion: the `nav` (which clips) slides out from under the rail while its contents slide the opposite way by the same distance, on the same timing, so the panel's edge sweeps across the page and every row stays exactly where it is. Two `transform` animations (Web Animations), so they run on the compositor: no frame waits for layout or paint. Opening takes 240ms and closing 180ms, each its own animation on an ease-out cubic (`cubic-bezier(0.33, 1, 0.68, 1)`): it moves from the first frame and spreads the distance evenly, with no leap at the start and no crawl at the end. Closing isn't the opening played backwards: reversed, an ease-out becomes an ease-in, which stalls first and snaps at the end. Each change of direction starts a new animation from where the panel is at that moment, so hovering again mid-way turns it around without a jump. Closing, everything the rail doesn't show (labels, badges, actions, section labels, nested rows) fades out in 100ms, before the panel's edge gets to it, so the edge never slices through text; icons and the current row's fill stay solid (the fill shrinks with the edge, as it grew with it on opening), and the badge's dot fades in as it lands (`fadeOnPeekClose`, opacity only). Custom content inside the sidebar should take the same class to close as cleanly. Under reduced motion it opens and closes at once. Animate nothing else here (no `clip-path`, `width` or `left`: they repaint or relayout every frame).
- Rows don't show tooltips in peek mode: hovering shows the whole sidebar instead. On touch screens, which don't hover, the rail behaves as in `icon` mode.

### Right side

```tsx
<SidebarProvider>
  <SidebarInset>…<SidebarTrigger /></SidebarInset>
  <Sidebar side="right" label="Inspector">…</Sidebar>
</SidebarProvider>
```

- Place it after `SidebarInset`. Its border, rail tooltips, resize handle, peek and the trigger's icon mirror; on phones its drawer slides in from the right.
- A navigation sidebar and an inspector on one page: each needs its own state, so nest a second `SidebarProvider` (with `className="min-h-0"`) inside the first one's `SidebarInset`. `useSidebar()` reads the nearest.
- For a right-to-left app, the navigation sidebar is `side="right"`.

### Resize

```tsx
const [width, setWidth] = useState<number | undefined>(saved);
<SidebarProvider width={width} onWidthChange={(next) => { setWidth(next); save(next); }}>
  <Sidebar>
    …
    <SidebarResizer min={200} max={420} />
  </Sidebar>
</SidebarProvider>
```

- Drag the edge: the rows follow, live (the width transition is off while dragging, through `data-resizing` on the provider). Dragging past half of `min` collapses the sidebar; dragging out from the rail expands it again. Double-click resets to the default width (`undefined`).
- Keyboard: a focusable `role="separator"` with `aria-valuenow`/`min`/`max` (collapsed, it reports `min` with `aria-valuetext="Collapsed"`, since a value must stay in range). ← and → resize by `step` (toward the page is wider, on either side), Home and End go to `min` and `max`, Enter collapses and expands.
- The width is a number in px, handed to `onWidthChange` to keep (local storage, a cookie, the user's settings); without `width`/`defaultWidth` the sidebar uses `--sidebar-width`.

### Shortcut

`<SidebarProvider keys="ctrl+b">` toggles the sidebar (the drawer on phones) with ⌘B on a Mac and Ctrl+B elsewhere. Keys are in `aria-keyshortcuts` order, like Menu's and Input's: modifiers first (`meta+ctrl+alt+shift+`), then the key; `ctrl` is ⌘ on a Mac. It's ignored while a text field or editor has focus (⌘B is bold there) and when the sidebar is inside `inert` or `aria-hidden` content (behind a modal). The trigger gets `aria-keyshortcuts`.

### Search

A search field at the top is Input's field, set on the rows' lines. It isn't a row: put it in `SidebarHeader` itself, after the `SidebarMenu`, not in a `SidebarMenuItem`, and keep it at least 8px below the row above (`SidebarHeader className="gap-2"`). A menu opening from that row (4px below it) would otherwise line up with the field's edges and look like a second card stacked under it. Its padding plus border must equal a row's padding, so its icon sits on the rows' icon axis and its text where their labels start: `<InputGroup className="px-1.75">` with 32px rows (`px-2`, 1px border). In the rail there's no room for a field: render a row with a search icon and a `tooltip` instead, which expands the sidebar and focuses the field:

```tsx
const { open, isMobile, setOpen } = useSidebar();
return !isMobile && !open ? (
  <SidebarMenuButton tooltip="Search" onClick={() => { focusNext.current = true; setOpen(true); }}>
    <Search /> <span>Search</span>
  </SidebarMenuButton>
) : (
  <InputGroup className="px-1.75">
    <Search />
    <Input ref={input} type="search" aria-label="Search" placeholder="Search" />
    <InputKbd keys="ctrl+k" className="-mr-1 min-w-6 text-center" />
  </InputGroup>
);
```

(`focusNext` is a ref read in an effect on the rail state, which focuses the field once it's back. The kbd's `-mr-1 min-w-6 text-center` centers it on the rows' trailing axis.)

### Below an app bar

With a bar across the top of the app, the sidebar sticks below it and fills the rest: set `--sidebar-top` to the bar's height on the provider (`className="[--sidebar-top:3.5rem]"`). The sidebar and the sub panel use `top-(--sidebar-top)` and `h-[calc(100svh-var(--sidebar-top))]`.

### Keep it collapsed across reloads

The provider is controlled, so the app keeps `open` where it likes. To render it right on the first paint with server rendering, read it on the server (a cookie) and pass it as `defaultOpen`; keeping it in local storage alone would flash expanded, then collapse.

```tsx
<SidebarProvider defaultOpen={cookies.get('sidebar') !== 'collapsed'}
  onOpenChange={(open) => (document.cookie = `sidebar=${open ? 'expanded' : 'collapsed'}; path=/; max-age=31536000`)}>
```

### Sub panel

```tsx
<SidebarProvider open={open} onOpenChange={setOpen}>
  <Sidebar>…</Sidebar>
  <SidebarPanel open={section === 'reports'} label="Reports">
    <SidebarHeader><h2>Reports</h2></SidebarHeader>
    <SidebarContent>
      <SidebarGroup><SidebarMenu>…</SidebarMenu></SidebarGroup>
    </SidebarContent>
  </SidebarPanel>
  <SidebarInset>…</SidebarInset>
</SidebarProvider>
```

- **The row that opens it says so.** Nothing about a plain row predicts a second column, so give it `aria-expanded={panelOpen}` and `aria-controls={panelId}` (the panel's `id`), and a trailing chevron pointing where the panel opens (`ChevronRight`). Unlike a nested section's chevron, it doesn't turn: it says "more this way", not "opens here". Its `aria-controls` is how the rail tells it from a row with nested rows: a panel opener opens its panel beside the rail instead of expanding the sidebar. On phones, `aria-expanded` keeps the drawer open, so the panel can slide in over it.

  ```tsx
  <SidebarMenuButton isActive={section === 'reports'} tooltip="Reports" aria-expanded={panelOpen} aria-controls={panelId} onClick={openReports}>
    <LineChart /> <span>Reports</span>
    <ChevronRight className="ml-auto" />
  </SidebarMenuButton>
  …
  <SidebarPanel id={panelId} open={panelOpen} label="Reports">…</SidebarPanel>
  ```
- For a section with many pages of its own (Reports, Settings). The app opens it, usually while that section is current, and can collapse the sidebar to its rail at the same time (`setOpen(false)` when the section opens), so the two take about the room of one.
- It takes the same parts as the sidebar: groups, rows, nested rows, Base UI's Collapsible.
- Below 768px it opens inside the drawer instead: it slides in over the sidebar from the right, focus follows into it (to its current row), and the sidebar under it is inert. It covers the sidebar there, so give its header a way back, shown only on phones: a button that closes it (`md:hidden`), which the app handles the same way it decides `open`.

### On phones

Below 768px the sidebar is a drawer from its edge: always expanded, focus trapped. It closes with a swipe, Escape, a tap on the page beside it, and `SidebarClose`. It also closes when a row that goes somewhere is pressed: a link, or a `SidebarMenuButton` that navigates on click (a router's `push`). Rows that open something in place leave it open: a disclosure (`aria-expanded`) or a menu trigger (`aria-haspopup`). A handler that calls `event.preventDefault()` keeps it open too.

## Rules
- **Collapsible panels** animate their height with `const panel = 'h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-150 ease-out motion-reduce:transition-none data-starting-style:h-0 data-ending-style:h-0'`. The panel clips, so rows inside keep their inset focus ring, and the panel itself takes no padding: it would keep it from closing to 0.

- **Row content:** an icon, then a `<span>` label. Rows keep direct `svg` children from shrinking and truncate direct `span` children.
- **One trailing slot.** A row gets either a `SidebarMenuBadge` or a `SidebarMenuAction`, not both. The button reserves the space automatically.
- **Never nest buttons.** Group actions are siblings of the label, not children, so a label can become a trigger.
- **Links** render through `SidebarMenuButton render={<a href="…" />}` (or the router's Link). Mark the current one with `isActive`.

## Deliberately left out
Add these only when the user asks:
- Floating and inset variants (they're a look: a margin, a radius and a shadow on `Sidebar`).
- Flyout menus for nested rows in the rail (peek covers the need: hovering shows them).
- Loading skeleton rows.
