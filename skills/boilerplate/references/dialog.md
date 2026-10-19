# Dialog

A modal window over the page, built on `@base-ui/react/dialog` and `@base-ui/react/drawer`. On desktop it's a centered dialog; below 768px the same parts render a bottom drawer you can swipe down. Base UI handles focus trapping, scroll lock, Escape and outside press, and returning focus to the trigger. 

## Setup

- **Needs:** `@base-ui/react`, `cn`.
- **Copy:** `components/dialog.tsx`, into the project's UI folder.
- **Read for the look:** an existing modal, popover or card, plus a button.
- **Once per app:** `isolation: isolate` on the element the app renders into (`#root` in Vite, the wrapper just inside `<body>` in a Next.js root layout), never on `<body>` itself: Base UI portals into `<body>`, so the app's own layers stay below the dialog without a z-index arms race (Base UI's own setup step).

## Look values the behavior depends on

Change these together:

- **Radius.** Set it once, through `--dialog-radius` on the popup. Cards behind are trimmed with a `clip-path` rounded to it, and the popup's corners use it (`rounded-(--dialog-radius)`, `rounded-t-(--dialog-radius)` on the drawer).
- **Shadow** must fit inside 48px: the clip-path's negative insets keep it visible, and anything past them is cut off.
- **Gutter.** The viewport's `py-12` (3rem above and below) is what nested cards' `max-h-[calc(100dvh-6rem)]` leaves room for. Change both together.
- **Scrim.** Keep the backdrop dark in both themes, like a shadow. Don't use a color token that flips in dark mode.
- The stack's geometry (12px step, 16px depth, 64px rise) and every duration are behavior. Popup width, padding and type are free.

## Rebuilding one

Look for an existing dialog or modal in the project: a `dialog.tsx` (or similarly named) file in its UI folder, or a `Dialog` or `Modal` imported from Radix or a component library.

- **Aliases:** keep `DialogHeader`, `DialogFooter`, `DialogOverlay` or `DialogPortal` as thin parts when call sites import them.
- **No equivalent here:** a built-in close icon, size variants, a separate `Sheet`. Keep them working as they did and say so, or ask before removing them.
- **Try by hand:** open, Tab to the end and back, Escape, a nested dialog if a screen has one, and one dialog on a phone (swipe it down).

| The project has (shadcn/ui, Radix) | Here |
| --- | --- |
| `DialogHeader` / `DialogFooter` | no parts here: keep them as plain layout `div`s with `data-slot` |
| A prop-driven `Modal` or `Dialog` (`open`, `onClose`, `title`, `description`, children) | keep that API as a thin wrapper in the same file, built from the parts (`Dialog` > `DialogContent` > `DialogTitle`, `DialogDescription`, children), so no call site changes; `onClose` becomes `onOpenChange={(open) => !open && onClose()}`. Export the parts too, for new code. Move the old wrapper's own markup (a header row, spacing around the children) into the wrapper, so nothing shifts |
| A built-in close (×) button | a `DialogClose` placed last inside the popup, `absolute` in its top corner (the popup is `relative` on desktop and in the drawer), with end padding on the title so it clears; last in the DOM, so initial focus still goes to the first action |
| `DialogOverlay`, `DialogPortal` | built into `DialogContent`; keep the exports as no-ops only if call sites use them |
| `onOpenChange(open)` | the same; a second argument, `eventDetails`, is always passed |
| `onPointerDownOutside={e => e.preventDefault()}` | `disablePointerDismissal` |
| A separate mobile `Sheet` or `Drawer` | `DialogContent` already becomes a bottom drawer below 768px; keep the separate component if it's used elsewhere |
| `asChild` | `render={<… />}` |
| `data-[state=open]:` / `data-[state=closed]:` | `data-open:` / `data-closed:`, and `data-nested:` on nested popups |
| `data-[state=open]:animate-in` and friends (tailwindcss-animate) | Transitions on `data-starting-style:` / `data-ending-style:` |

## Parts

| Part | Renders | Notes |
| --- | --- | --- |
| `Dialog` | — | The root. `open`, `defaultOpen`, `onOpenChange(open, eventDetails)`, plus Base UI's `disablePointerDismissal`, `onOpenChangeComplete`, `actionsRef`, `triggerId`, `defaultTriggerId` and `handle`. Always modal. |
| `DialogTrigger` | `button` | Unstyled. Render it into the button that opens the dialog. `data-slot="dialog-trigger"`. |
| `DialogContent` | Portal + Backdrop + stack wrapper + Viewport + Popup | Desktop: centered; taller content scrolls the viewport. Mobile: bottom sheet up to `100dvh - 3rem`; taller content scrolls inside it. `className` styles the popup, a flex column on both (layout classes like `gap-4` behave the same in the drawer). `container` sets where the root's portal renders. |
| `DialogTitle` | `h2` | Labels the dialog for screen readers. Always include one. |
| `DialogDescription` | `p` | Optional supporting text, also announced. |
| `DialogClose` | `button` | Unstyled. Closes the dialog. `closeAll` closes every dialog in the stack at once. |
| `useDialog()` | — | `{ close, closeAll }` for closing from code, e.g. after an async action succeeds. Call it inside `DialogContent`: it acts on the dialog it's rendered in. |
| `createDialogHandle()` | — | For triggers outside the dialog (see **One dialog, many triggers**). |

## Usage
```tsx
<Dialog>
  <DialogTrigger render={<Button />}>Archive project</DialogTrigger>
  <DialogContent>
    <DialogTitle>Archive this project?</DialogTitle>
    <DialogDescription>You can restore it from Settings at any time.</DialogDescription>
    <div className="mt-4 flex justify-end gap-2">
      <DialogClose render={<Button />}>Cancel</DialogClose>
      <DialogClose render={<Button />}>Archive</DialogClose>
    </div>
  </DialogContent>
</Dialog>
```

To open a dialog from a menu item, control it: `open` + `onOpenChange` on `Dialog`, and `onClick={() => setOpen(true)}` on the `MenuItem`.

`onOpenChange` passes Base UI's `eventDetails` (`reason`, `cancel()`, …) on every change, including closes from code (`useDialog`, `closeAll`), whose reason is `'imperative-action'`. Calling `eventDetails.cancel()` keeps the dialog open, so Base UI's close-confirmation pattern works however the close started:

```tsx
<Dialog onOpenChange={(open, details) => {
  if (!open && hasUnsavedChanges && !confirm('Discard changes?')) details.cancel();
}}>
```

### One dialog, many triggers

A table with an action on every row needs one dialog, not one per row. Give the triggers and the dialog the same handle; each trigger passes a `payload`, and the dialog's children can be a function of it:

```tsx
const deleteDialog = createDialogHandle<{ id: string; name: string }>();

<DialogTrigger handle={deleteDialog} payload={{ id: row.id, name: row.name }} render={<Button />}>Delete</DialogTrigger>

<Dialog handle={deleteDialog}>
  {({ payload }) => (
    <DialogContent>
      <DialogTitle>Delete {payload?.name}?</DialogTitle>
      …
    </DialogContent>
  )}
</Dialog>
```

For destructive confirmations, use `disablePointerDismissal` so a stray backdrop tap can't dismiss the dialog.

## Nesting
Put another `Dialog` inside `DialogContent`; no extra props. It must be inside: a nested `Dialog` placed next to its parent's `DialogContent` still portals into the stack, but the cards behind it don't step back. The dialogs behave like a stack of cards:

- **The new card rises from below** (64px) into place **12px under the top edge** of the card behind, so every level peeks out like a staircase. The root dialog rises 16px.
- A nested card never outgrows the screen (`max-h: 100dvh − 6rem`); it scrolls inside, so the stack always fits.
- **The card behind** recedes slightly (16px back per level, around its top edge), hides its content, and is trimmed with `clip-path: inset()` where the stack ends. It slides only as far as needed to keep the whole visible stack centered on screen.
- Closing drops the front card back down; the cards behind un-trim and re-center.
- Mobile: the sheets slide up from the bottom edge; the sheet behind moves down so its top peeks 12px above the front sheet, and comes back with the finger as the front sheet is swiped away (`--drawer-swipe-progress`).

```tsx
<Dialog>
  <DialogTrigger>Workspace settings</DialogTrigger>
  <DialogContent>
    …
    <Dialog>
      <DialogTrigger>Delete workspace</DialogTrigger>
      <DialogContent>…</DialogContent>
    </Dialog>
  </DialogContent>
</Dialog>
```

How the stack is wired:

- **One wrapper.** The root `DialogContent` renders a `dialog-stack` wrapper (inside its portal, above the backdrop); every nested dialog portals into it through Base UI Portal's `container`. Anything that should move the whole stack at once animates this one element.
- **Our own stack state, not Base UI's.** Each card measures itself (`ResizeObserver`, first reading during commit) and reports up through context: the front card's height and how many cards sit on top (`--own-height`, `--front-height`, `--stack-m`, `--level`). Base UI's `--nested-*` variables reset the moment dialogs close, so they can't be held still; ours can.
- **One transform per card.** `perspective() translateY(stack position + --shift-y) translateZ(depth + --shift-z)`. Enter and exit only set the `--shift-*` offsets; nothing else changes between states.
- **Placement (desktop):** every card is centered by its viewport, then shifted so the visible stack (`front height + 12px per level`) is centered. For card *k* with *m* cards on top: `y = (own − (k + m)·12 − front) / 2 + k·12 − layoutFix`, multiplied by `(1 + m/75)` to undo the shrink `perspective(1200px)` applies at 16·m px depth. The front card reduces to `k·6px`, so its first frame is already in place. `layoutFix` corrects a card taller than the screen, which is top-aligned and maybe scrolled instead of centered; it's measured once, when the first card opens on top (the card is at rest then, and covered, so it can't scroll after).
- **Trim:** the card behind clips its bottom to `front height + 12px per level`.
- **Mobile:** the sheet behind moves down by the height difference so its top peeks 12px above the front sheet, also corrected for perspective (`1 + depth·0.024`).
- A dialog stops reporting the moment it starts closing, so every card behind re-centers and un-trims together — except during closeAll (below).
- Write the formulas out in full in each Tailwind class; Tailwind only generates classes it can read literally, so interpolating a shared string silently drops the class.

Base UI skips the nested dialog's backdrop, so the scrim doesn't darken per level.

### Closing the whole stack

The last step of a nested flow often finishes the job (“Delete” in a confirmation). Going back through every level would be wrong, so close them all:

```tsx
<DialogClose>Back</DialogClose>            {/* this level only */}
<DialogClose closeAll>Delete</DialogClose> {/* the whole stack, in one step */}
```

From code, after async work:

```tsx
function DeleteButton() {
  const { closeAll } = useDialog();
  return <Button onClick={async () => { await deleteWorkspace(); closeAll(); }}>Delete</Button>;
}
```

- **The stack leaves as one piece.** closeAll sets `data-closing-all` on the stack wrapper; only the wrapper animates (desktop: down 24px and fade, 200ms; mobile: slides off the bottom, 320ms). Every card inside freezes: cards stop reporting, so nothing un-stacks; the exit offsets are multiplied by `--exit-k: 0`; and each card holds `opacity: 0.9999` for as long as the wrapper moves, so Base UI keeps it mounted until then.
- Each `Dialog` holds its open state and passes `closeAll` down through context. `DialogClose closeAll` lets Base UI close its own level as usual (so `onOpenChange` fires once, with real event details); only once that level has actually closed do the levels behind it close, nearest first, in the same batched render. Focus returns to the root trigger.
- **Every level can refuse.** Each one closes through its own `onOpenChange` with cancelable details, so an unsaved-changes guard on the root still holds. `closeAll` stops at the first level that cancels: the ones in front of it close normally, one by one, and the stack isn't frozen.
- `event.preventDefault()` in a `DialogClose`'s `onClick` cancels the close, with or without `closeAll` (e.g. when validation fails).
- Escape and outside press still close one level at a time.

## Motion rules
- **Animate only `transform`, `clip-path` and `opacity`.** Never animate `height`, `width`, padding or margins: they relayout and re-raster every frame, which is what makes stacks stutter. Popup sizes never change in this component.
- **Never fade in from 0.** Popups enter from `opacity-50`. Fading out to 0 on exit is fine.
- **Keep depth subtle.** 16px back per level. Large Z moves read as a scale jump.
- **The arriving card does the travelling.** It rises 64px; the cards behind only slide as much as centering the stack needs, on the same curve.
- **Same function list in every state.** One `perspective() translateY() translateZ()` transform per card, changed only through variables, and every clip is `inset(… round var(--dialog-radius))`, so the browser interpolates values instead of matrices.
- **To move several cards together, move their container.** Animating each card separately drifts apart; the stack wrapper moves them as one.
- **Opacity is faster than movement.** Per-property durations: transform and clip-path 250ms, opacity 120ms (exit: 180ms and 100ms). The card is solid well before it stops moving; a card that stays half-transparent while it travels reads as a smear. The content fade behind and the backdrop follow the same rule.
- Exits are faster than enters. Motion turns off under `prefers-reduced-motion`; durations are variables, so there is a single `transition` declaration per element for `motion-reduce:transition-none` to override.

## How the responsive switch works
The root is always Base UI's `Drawer.Root`: it's the Dialog root plus swipe support, and Drawer reuses Dialog's `Trigger`, `Close`, `Title` and `Description`. So only `DialogContent` switches between the dialog popup and the drawer popup, and crossing the breakpoint never remounts a trigger or loses its focus. A `matchMedia('(max-width: 767px)')` check through `useSyncExternalStore` decides. The server render assumes desktop; the first client render corrects it, so even a dialog that hydrates open (`defaultOpen`) shows the right mode.

**The mode is locked while the dialog is open.** Swapping the popup parts would remount the content: typed input, focus and nested dialogs would be lost. So the root picks dialog or drawer when it opens and keeps it until it closes; nested dialogs always follow their parent, so a stack never mixes modes.

## Rules
- `DialogContent` has no internal spacing between children beyond the title/description pair. Lay out the body and actions yourself (`mt-4` for the action row).
- **Initial focus** goes to the first focusable control, as WAI-ARIA recommends, so put the least destructive action first (Cancel before Delete), or pass `initialFocus` to point at an input. Two exceptions focus the popup itself: content taller than the screen (so it opens at the top instead of scrolling to that control) and touch (so the keyboard doesn't pop up). The popup shows a `focus-visible` ring when it has focus. A `ref` on `DialogContent` still reaches the popup.
- **Every dialog needs a visible `DialogClose`.** On mobile, swiping and tapping the scrim aren't reachable for screen-reader or switch users; a button is.
- **The stack corrects instantly while it stands still.** Cards arriving or leaving animate; when the stack is settled (320ms after the last change), a card behind follows content growing or the window resizing instantly, so it never drifts off its 12px step while the front card's own layout jumps. Desktop only: on mobile a cancelled swipe needs the sheet behind to spring back with the front sheet.
- Don't use Base UI's `unstable-use-media-query`; the few lines of `matchMedia` here are stable.
- Content hides through the children's opacity, not the popup's, so the card stays opaque and the page never shows through.
- Mobile: the drawer is wrapped in Base UI's `Drawer.VirtualKeyboardProvider`, so focused fields stay above the software keyboard. Give inputs 16px text on touch screens (`any-pointer-coarse:text-base`) so iOS doesn't zoom on focus.
- Every part sets a `data-slot`: `dialog-trigger`, `dialog-close`, `dialog-backdrop`, `dialog-stack`, `dialog-viewport`, `dialog-content`, `dialog-title`, `dialog-description`.
- Kept basic on purpose. Not included yet: a close icon button, header/footer parts, a sticky footer while scrolling, size variants, and an opt-out of the drawer. Add them when a real use needs them.
