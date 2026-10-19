# Button

A button built on `@base-ui/react/button`, with its classes in a `tailwind-variants` recipe. 

## Setup

- **Needs:** `@base-ui/react`, `tailwind-variants` (it merges classes itself, so this file needs no `cn`).
- **Copy:** `components/button.tsx`, into the project's UI folder.
- **Read for the look:** an existing button, an input and a badge or alert (for its status colors).

## Look values the behavior depends on

Each status only sets four variables, so restyling a status means pointing them at the project's colors: `--button` (the solid fill), `--button-on` (text on that fill), `--button-ink` (text and icons in outline and ghost), `--button-tint` (ghost hover). Keep every solid fill at 4.5:1 or better against its text. `tailwind-variants` stays: it is the recipe format. The file uses no icon library itself; icons come from the caller.

Change these together:

- **Icon padding.** The icon side uses `ps-2.5` / `pe-2.5` (logical: start and end, so right-to-left pages tighten the right side for a leading icon) against the text side's `px-3`. Keep the icon side 2px tighter, whatever the base padding is.
- **Spinner size** (`data-loading:after:size-4`) matches the icon size (`[&>svg]:size-4`), so a loading icon-only button doesn't change shape.
- **Height** is free: the icon-only button stays square through `aspect-square`.

## Rebuilding one

Look for an existing button in the project: a `button.tsx` (or similarly named) file in its UI folder, or a `Button` imported from a component library.

- **No equivalent here:** a `link` variant, a second size (`sm`, `lg`). Keep them working as they did (an extra variant, a size the project already uses) and say so, or ask before removing them.
- **Try by hand:** a leading, a trailing and an icon-only button; press a loading button twice; Tab through a disabled one.

| The project has (shadcn/ui, Radix) | Here |
| --- | --- |
| `variant="default"` | `variant="solid"` |
| `variant="destructive"` | `variant="solid" status="danger"` |
| `variant="outline"` / `"secondary"` | `variant="outline"` (secondary keeps its own look if it differs: add it as a variant) |
| `variant="ghost"` | `variant="ghost"` |
| `variant="link"` | no equivalent: keep it as an extra variant, or use `buttonVariants` on an `<a>` |
| `size="icon"` | nothing: an icon alone already makes the button square |
| `size="sm"` / `"lg"` | no equivalent (one size): keep them working, or ask |
| `<Button asChild><a href>` | `<a className={buttonVariants()}>` (links don't render through Button) |
| A spinner component inside the button | `loading` |
| `asChild` | `render={<… />}` |
| `data-[state=open]:` / `data-[state=closed]:` | `data-disabled:`, and `data-loading:` while loading |
| `data-[state=open]:animate-in` and friends (tailwindcss-animate) | Transitions on `data-starting-style:` / `data-ending-style:` |

## Parts

| Export | Notes |
| --- | --- |
| `Button` | Renders a `<button>` (`type="button"` unless you pass `type="submit"`). `status`: `neutral` (default) · `information` · `success` · `warning` · `danger`. `variant`: `outline` (default) · `solid` · `ghost`. `loading`, `disabled`, plus Base UI Button's props (`render`, `nativeButton`, `focusableWhenDisabled`; `className` is a string here, not a function of state). `data-slot="button"`. |
| `ButtonLabel` | `<span data-slot="button-label">`. Wrap label content that isn't a plain string in it (see **Icons**). Works inside a link styled with `buttonVariants` too. |
| `buttonVariants` | The recipe: `buttonVariants({ status, variant, className })` returns the class string. For links and anything else that looks like a button but isn't one. |

## Usage
```tsx
<Button>Cancel</Button>
<Button variant="solid">Save</Button>
<Button variant="solid" status="danger">Delete</Button>
<Button variant="ghost" status="information">Learn more</Button>
```

### Icons

Icons are children, never props. Put them before or after the text; the button works out the rest:

```tsx
<Button><Plus /> New project</Button>        {/* leading: that side gets less padding */}
<Button>Continue <ArrowRight /></Button>     {/* trailing: same, on the right */}
<Button aria-label="Add"><Plus /></Button>   {/* icon only: square; aria-label is required */}
```

How: `Button` wraps each run of text in `<span data-slot="button-label">`, so every icon is a direct `svg` child at the start or the end. CSS can't see bare text nodes, so without the wrapper a leading icon and an icon alone would look the same. The rules key off `has-[>svg:first-child]`, `has-[>svg:last-child]` and `has-[>svg:only-child]`.

- Strings and numbers count as text, also inside Fragments (`{saving ? <>Saving</> : 'Save'}`).
- Anything else that renders text, like an i18n component, must come in a `ButtonLabel`, or the button would take its icon for an icon alone and turn square:

  ```tsx
  <Button><Plus /> <ButtonLabel><Trans>New project</Trans></ButtonLabel></Button>
  ```
- An icon must be a direct `svg` child. One wrapped in another element, or an icon font, doesn't count.

### Loading

```tsx
<Button variant="solid" loading={saving} onClick={save}>
  <Check /> {saving ? 'Saving' : 'Save changes'}
</Button>
```

Pass `loading` (true or false) to every button that can load; it's what opts a button into the rest:

- The content stays in place but turns invisible, and a spinner (a `::after` pseudo-element, so it never counts as a child) takes its place. Under reduced motion it spins slower.
- The button holds the width it had before loading started, shrinking or growing, even when the label changes, so nothing around it shifts. Only buttons with a `loading` prop measure themselves.
- It is disabled but stays focusable (Base UI's `focusableWhenDisabled`): focus doesn't jump away mid-action, and clicks (and Enter in a form field) are ignored.
- It's named by its label (`aria-labelledby`, wired when there's one label and no `aria-label`), because some screen readers don't announce a focused button's changing text otherwise. So keep the label the only content besides icons, and change it while loading ("Saving"): that's how screen readers hear that something is happening. A button without a `loading` prop keeps the browser's own name, built from all its content.

### Disabled

`disabled` disables the native button (out of the tab order) and dims it. To keep a disabled button focusable, so it can explain itself in a tooltip, add `focusableWhenDisabled`.

### Composition

Render other components' triggers as a Button; Base UI merges the props:

```tsx
<DialogClose render={<Button variant="solid" />}>Done</DialogClose>
<MenuTrigger render={<Button />}>Options <ChevronDown /></MenuTrigger>
```

Links keep link semantics, so they never render through `Button` (Base UI's rule). Style the `<a>` (or the router's `Link`) with the recipe, and wrap its text in a `ButtonLabel` when it has an icon:

```tsx
<a href="/docs" className={buttonVariants({ variant: 'ghost' })}>
  <BookOpen /> <ButtonLabel>Docs</ButtonLabel>
</a>
```

## Rules
- **One size.** No `size` prop. If a dense toolbar needs smaller buttons, that's a different component.
- **Status is meaning, variant is emphasis.** A dialog gets one `solid` button: the action it's for. `danger` is for what can't be undone, not for emphasis.
- **Never nest interactive elements** in a Button; use `render` to compose instead.
- An icon-only button needs an `aria-label`.
- Plain text needs no wrapper; `Button` adds it. Text that isn't a plain string goes in a `ButtonLabel`, never a bare `<span>`, which the icon rules don't recognise.
- The label truncates only when the button is given a width (`max-w-*`); otherwise the button grows with it.
