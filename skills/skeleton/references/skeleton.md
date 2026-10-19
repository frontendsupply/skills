# Skeleton

One part, `Skeleton`, on `@base-ui/react`'s `useRender`. While `loading`, it draws a skeleton over every element inside it marked `data-skeleton`, measured from that element, and leaves the rest as it is. Only paint changes.

## Setup

- **Needs:** React 19, Tailwind CSS v4, `@base-ui/react`, `cn`.
- **Copy:** `components/skeleton.tsx`, into the project's UI folder. `'use client';` first in a server-components project.
- **Read for the look:** the project's muted fill and surface colors (for the variable), and any loading state it already has.
- **The CSS, once per project,** in the main CSS file after `@import "tailwindcss"`: the color, pointed at the project's tokens (the values below are for a project with none), and the lines that keep Tailwind out of the skill's files:

```css
@import "tailwindcss";
@source not "../.claude";   /* the skill's own files */
@source not "../CLAUDE.md";

:root {
  --skeleton: var(--color-neutral-200); /* bars, borders, stripes, circles */
}
```

Use the `@source not` paths the project has (`.agents`, `AGENTS.md`), relative to the CSS file, and skip what's gitignored. In dark mode, point it at a token that flips, or set it again the way the project sets its dark theme. Nothing else is needed: the drawing and the trace live in the component.

## Look values the behavior depends on

- **The variable** is the only color. `--skeleton` is visible on the surfaces it's drawn over (a step from the surface). Keep it opaque.
- **The look constants** at the top of the file: `TEXT_TOP` and `TEXT_HEIGHT` (0.2 and 0.6: a text bar from 20% to 80% of the text's height; keep `TEXT_HEIGHT` under 0.7 or the bars of neighbouring lines touch), `STRIPES` (6px between a plate's stripes), `ICON_MAX` (32px: where an `svg` stops being an icon, a circle, and becomes a picture, a plate), `DASH` (`'2 3'`: a chart drawing's guides; the same as `@frontendsupply/chart-skeletons`' own, or the guides change when the `Skeleton` takes over).
- **Fixed, not look:** lines are 1px, snapped to whole pixels and drawn at the wrapper's exact size so the drawing is never scaled; corners are square unless the element is fully round; text has no border, pictures always have one.

## Rebuilding one

Look for the project's loading states: `isLoading` / `isPending` branches, Suspense `fallback`s, spinners, `animate-pulse`, a `Skeleton` from shadcn/ui, `react-loading-skeleton` or MUI, and components named `*Skeleton` or `*Placeholder`. Each becomes the real component, rendered with placeholder data, its data marked, inside `Skeleton`. The hand-drawn version is deleted, with every import of it.

| The project has | Here |
| --- | --- |
| shadcn/ui `<Skeleton className="h-4 w-[250px]" />` blocks | Delete them; `<Skeleton loading>` around the real component, its data marked, with placeholder data. shadcn's `components/ui/skeleton.tsx` is replaced by this file (same name, same export) |
| `react-loading-skeleton` `<Skeleton count={3} />` | Three rows of placeholder data. Uninstall the package once nothing imports it (ask first) |
| MUI `<Skeleton variant="text|rectangular|circular" />` | Marked text, pictures and icons draw themselves; an avatar's circle comes from its own `rounded-full` |
| `isLoading ? <Spinner /> : <List items={data} />` | `<Skeleton loading={isLoading}><List items={data ?? placeholder} /></Skeleton>` |
| `<Suspense fallback={<ListSkeleton />}>` | `fallback={<Skeleton loading><List items={placeholder} /></Skeleton>}`. The fallback and the content are two renders, so the data doesn't fade in (a swap): fine |
| A `min-h-[480px]` or fixed height holding the space | Remove it: the placeholder holds the space |
| `animate-pulse` or a shimmer on the content | Remove it: the outlines trace in, and that's the motion |

- **Try by hand:** reload each screen with the network throttled ("Slow 4G"): every data element is a skeleton (text a borderless bar, a picture a bordered striped plate), every static element shows as itself, outlines trace in; when the data lands it fades in. With reduced motion on: no trace, a swap. Tab while it loads: nothing in it takes focus.

## Parts

| Export | Notes |
| --- | --- |
| `Skeleton` | Renders a `<div>` (`render` for another element that can hold an `<svg>`: `<Skeleton render={<section />}>`). `loading` draws the marked elements inside as skeletons: while it does, the element has `data-loading`, `aria-busy` and `inert`, and its last child is the drawing, `<svg data-slot="skeleton-drawing" aria-hidden>`, once it's measured. On `loading={false}` the drawing goes and the data fades in (`data-revealing`, 0.2s). `data-slot="skeleton"`, `className` merged last, every other prop passed on. |
| `data-skeleton` | Not an export: the attribute that marks an element as data (`references/marking.md`). Only marked elements, inside a `Skeleton`, get skeletons. |

## Usage

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { placeholderOrder } from './order-card.placeholder';

function OrderCard({ id }: { id: string }) {
  const { data, isPlaceholderData } = useQuery({ queryKey: ['order', id], queryFn, placeholderData: placeholderOrder });
  return (
    <Skeleton loading={isPlaceholderData}>
      <article className="rounded-lg border p-4">
        <img data-skeleton src={data.photo} width={64} height={64} alt="" className="size-16 rounded-full" />
        <h3 data-skeleton>{data.title}</h3>
        <p>Total <span data-skeleton>{data.total}</span></p>
        <hr />
        <Button>Track order</Button>
      </article>
    </Skeleton>
  );
}
```

Here the photo is a striped circle (it's fully round), the title and the total are bars, and the card's border, "Total", the rule and the button show as themselves.

- **Wrap the component that renders the data,** not the page. Headings, filters and toolbars that don't load stay outside.
- **`render`** when the wrapper must be a specific element (`<Skeleton render={<section />}>`). It holds the drawing, an `<svg>`, so it's never a `<ul>`, `<ol>`, `<table>`, `<tbody>` or `<tr>`, where an `<svg>` can't go: wrap the list (`<Skeleton><ul>…</ul></Skeleton>`) or the table (`<Skeleton><table>…</table></Skeleton>`; its headers show as themselves).
- **Several on one screen** each draw and hand over on their own.
- **The wrapper is `relative`,** always, so its drawing covers it. Content inside that is positioned against something outside the wrapper (an `absolute` badge placed against the page) now places against the wrapper: give that content its own `relative` parent, or put the wrapper around less.
- **Images** need their size from CSS: a size class (`size-16`) or a width with an aspect ratio (`w-full aspect-square`, `w-65 aspect-26/17`), and `shrink-0` in a flex row. A placeholder image has no source (`src={undefined}`; never a real image, never a data URI), so it has no size of its own: without its CSS size, or squeezed in a flex row, its skeleton comes out the wrong shape. `width` and `height` attributes alone aren't enough: Tailwind sets `height: auto`.

## Behavior

- **Only marked elements change.** While loading, a marked element turns invisible (`opacity: 0`), and everything inside it with it: its text, colors, borders, shadows, pictures and icons, inline styles included. The rest of the component paints as usual. The drawing is an `<svg>`, the wrapper's last child, laid over its padding box at its exact size (no viewBox, nothing scaled), in `--skeleton` (its size and color are inline styles, so a project's rules for svgs inside the wrapper can't reach them). It's absolutely positioned and catches no pointer: the placeholder's layout stays as it is under the skeletons.
- **Measured from the marked elements.** In a layout effect (before the first paint, when the component mounts loading), `Skeleton` takes every marked element in document order: a picture or icon is its box; a chart's drawing (`svg[data-skeleton="drawing"]`, `references/charts.md`) is its own parts, placed at its box; anything else is walked for its text (the boxes of its words, joined per line, so a bar ends where the line's last word does) and its pictures and icons; an element with neither is its own box. Every box is snapped to whole pixels.
- **Drawn once, never jumping.** The first drawing waits for the page's fonts if they're still loading, so it's measured from the text as it will stay (until then the marked elements are blank). After that, only a real change of layout while loading (the wrapper resized, content added) measures again; if a skeleton moved or the wrapper changed size, the drawing is redrawn: what was there moves, still, and only a new shape traces in. A resize redraws in the frame its layout does. Each loading traces in once.
- **The trace.** Every outline is one clockwise path from its top left (a pill's from the start of its top edge; `pathLength="1"`, so every outline takes the same time whatever its size), drawn in 0.6s with square caps so its corner closes; outlines start in document order across 0.4s, and a plate's stripes fade in once its outline is halfway. A chart's drawing starts as one outline: its lines trace together, its guides and labels fade in with them, its stripes once the lines are halfway. Text bars fade in over 0.3s. It's CSS, a transition from each shape's `@starting-style` (Tailwind's `starting:`), so a shape animates once, when it's first drawn.
- **The handover.** The render that turns `loading` false is already the handover (`data-revealing`): the drawing goes before that render is painted, the observers stop (so the new content is never measured into one last frame of skeletons), and for 0.2s the marked elements fade in (an opacity transition).
- **Before the drawing.** Server-rendered and not yet hydrated (or without JavaScript), marked elements are blank: invisible, keeping their boxes. A rough version drawn by CSS first and replaced by the measured drawing would jump, so there isn't one.
- **Nothing marked.** The component warns in the console (`Skeleton: nothing inside is marked data-skeleton`) and draws nothing.
- **The placeholder is never read or reached.** `inert` takes the whole region out of the tab order and the accessibility tree while loading; `aria-busy` tells assistive tech it's loading.
- **Reduced motion.** No trace and no fades; the data appears at once.
- **No `!important`.** The hiding rule's selector (the wrapper's class, its `data-loading`, the mark) outranks any one utility on a marked element, its hover and focus states included. Only an inline `opacity` on a marked element, or unlayered CSS that sets one, can show through: keep opacity off data elements, or put it on a wrapper inside them.

## Rules

- **Behavior as shipped.** Every `// behavior` class stays, and the measuring, the drawing rules and the motion stay as written; `scripts/check.mjs` reports a missing class.
- **Paint only in a state.** Any class you add with `data-loading:` or `data-revealing:` must change paint only: color, border color, background, shadow, decoration, opacity, visibility. Never padding, size, display, gap, border width, font size or line height.
- **One part, no props for shape.** No `count`, `lines`, `width` or `variant`: the component and its placeholder data are the shape.
