# Skeleton

One part, `Skeleton`, on `@base-ui/react`'s `useRender`, and one stylesheet, `skeleton.css`. While `loading`, the part marks its region `data-loading`, and the stylesheet paints every element inside it marked `data-skeleton` as a skeleton, leaving the rest as it is. Nothing is measured and no script draws: the server (or the build) renders the component with its placeholder data, the browser lays it out, and the rules paint it. So the skeletons are there in the first frame, before any JavaScript, and right at every width. Only paint changes.

## Setup

- **Needs:** React 19, Tailwind CSS v4, `@base-ui/react`.
- **Copy:** `components/skeleton.tsx` and `components/skeleton.css`, into the project's UI folder. `'use client';` first in the `.tsx` in a server-components project (it's still rendered on the server, so the skeletons are in the HTML).
- **Read for the look:** the project's muted fill and surface colors (for the variable), and any loading state it already has.
- **The CSS, once per project,** in the main CSS file after `@import "tailwindcss"`: the stylesheet, the color pointed at the project's tokens (the values below are for a project with none), and the lines that keep Tailwind out of the skill's files:

```css
@import "tailwindcss";
@import "./components/ui/skeleton.css"; /* where you copied it */
@source not "../.claude";   /* the skill's own files */
@source not "../CLAUDE.md";

:root {
  --skeleton: var(--color-neutral-200); /* bars, edges, stripes, circles */
}
```

Use the `@source not` paths the project has (`.agents`, `AGENTS.md`), relative to the CSS file, and skip what's gitignored. In dark mode, point it at a token that flips, or set it again the way the project sets its dark theme. Nothing else is needed: the rules and the pulse live in `skeleton.css`, and the HTML carries only the region's state (`data-slot`, `data-loading`), never long class lists.

## Look values the behavior depends on

- **The variable** is the only color. `--skeleton` is visible on the surfaces it's drawn over (a step from the surface). Keep it opaque.
- **The look values in `skeleton.css`:** a text bar is a `line-through` `0.6em` thick (keep it under `0.7em` or the bars of neighbouring lines touch); a plate's stripes are 1px every 6px at 45°; the pulse is 2s, to half opacity.
- **Fixed, not look:** lines are 1px; corners are the element's own (a skeleton has the shape of what it stands for: an avatar's `rounded-full` makes a round plate); text has no edge, pictures always have one.

## Rebuilding one

Look for the project's loading states: `isLoading` / `isPending` branches, Suspense `fallback`s, spinners, `animate-pulse`, a `Skeleton` from shadcn/ui, `react-loading-skeleton` or MUI, and components named `*Skeleton` or `*Placeholder`. Each becomes the real component, rendered with placeholder data, its data marked, inside `Skeleton`. The hand-drawn version is deleted, with every import of it.

| The project has | Here |
| --- | --- |
| shadcn/ui `<Skeleton className="h-4 w-[250px]" />` blocks | Delete them; `<Skeleton loading>` around the real component, its data marked, with placeholder data. shadcn's `components/ui/skeleton.tsx` is replaced by this file (same name, same export) |
| `react-loading-skeleton` `<Skeleton count={3} />` | Three rows of placeholder data. Uninstall the package once nothing imports it (ask first) |
| MUI `<Skeleton variant="text|rectangular|circular" />` | Marked text, pictures and icons paint themselves; an avatar's circle comes from its own `rounded-full` |
| `isLoading ? <Spinner /> : <List items={data} />` | `<Skeleton loading={isLoading}><List items={data ?? placeholder} /></Skeleton>` |
| `<Suspense fallback={<ListSkeleton />}>` | `fallback={<Skeleton loading><List items={placeholder} /></Skeleton>}`: streamed as HTML, painted at once. The fallback and the content are two renders, so the data doesn't fade in (a swap): fine |
| A `min-h-[480px]` or fixed height holding the space | Remove it: the placeholder holds the space |
| `animate-pulse` or a shimmer on the content | Remove it: the skeletons pulse |

- **Try by hand:** reload each screen with the network throttled ("Slow 4G") and with JavaScript off: the skeletons are there either way. Every data element is a skeleton (text a borderless bar, a picture a striped plate with an edge), every static element shows as itself, the skeletons pulse; when the data lands it fades in. With reduced motion on: no pulse, a swap. Tab while it loads: nothing in it takes focus.

## Parts

| Export | Notes |
| --- | --- |
| `Skeleton` | Renders a `<div>` (`render` for another element: `<Skeleton render={<tbody />}>` keeps a table valid, `<Skeleton render={<ul />}>` a list). `loading` paints the marked elements inside as skeletons: while it does, the element has `data-loading`, `aria-busy` and `inert`. On `loading={false}` the data fades in (`data-revealing`, 0.2s). `data-slot="skeleton"`, `className` merged last, every other prop passed on. |
| `data-skeleton` | Not an export: the attribute that marks an element as data (`references/marking.md`). Only marked elements, inside a `Skeleton`, get skeletons. `data-skeleton="picture"` makes any element a plate (an illustration's `<svg>`, a `<div>` with a background image). |

## Usage

```tsx
import { Skeleton } from '@/components/ui/skeleton';
import { placeholderOrder } from './order-card.placeholder';

function OrderCard({ id }: { id: string }) {
  const { data, isPlaceholderData } = useQuery({ queryKey: ['order', id], queryFn, placeholderData: placeholderOrder });
  return (
    <Skeleton loading={isPlaceholderData}>
      <article className="rounded-lg border p-4">
        <img data-skeleton src={data.photo} alt={data.photo ? data.title : ''} className="size-16 shrink-0 rounded-full" />
        <h3 data-skeleton>{data.title}</h3>
        <p>Total <span data-skeleton>{data.total}</span></p>
        <hr />
        <Button>Track order</Button>
      </article>
    </Skeleton>
  );
}
```

Here the photo is a round striped plate (it's `rounded-full`), the title and the total are bars, and the card's border, "Total", the rule and the button show as themselves.

- **Wrap the component that renders the data,** not the page. Headings, filters and toolbars that don't load stay outside.
- **`render`** when the wrapper must be a specific element: a `<tbody>`, a `<ul>`, a `<section>`. Nothing is added inside it.
- **Several on one screen** each paint and hand over on their own.
- **Images** need their size from CSS: a size class (`size-16`) or a width with an aspect ratio (`w-full aspect-square`, `w-65 aspect-26/17`), and `shrink-0` in a flex row. A placeholder image has **no source** (`src={undefined}`; never a real image, never a data URI): nothing loads, and the stylesheet keeps the browser's broken-image icon from showing. With no source it has no size of its own, so without its CSS size, or squeezed in a flex row, its plate comes out the wrong shape. `width` and `height` attributes alone aren't enough: Tailwind sets `height: auto`.
- **Data colors through a class,** never an inline style: a swatch is `className="bg-(--swatch)" style={{ '--swatch': color }}`, not `style={{ background: color }}`. An inline style beats any rule, so it would show through the skeleton.

## Behavior

- **Painted by CSS, from the first frame.** Every rule is a selector in `skeleton.css` on the region while it's `data-loading` (`[data-slot='skeleton'][data-loading] [data-skeleton]` and the like), outside any layer: it outranks every Tailwind utility on a marked element, and a project's own unlayered CSS by specificity. The server renders it with the placeholder, so the HTML already paints the skeletons; the browser's layout puts them where the text and pictures are, at any width, font and zoom, and moves them with the layout. No measuring, no observers, no script beyond `loading` itself.
- **Text** in a marked element (and everything in it, but never inside an `svg`) turns transparent, and a bar in `--skeleton` runs through each line: a `line-through` `0.6em` thick, which every line of the text gets and which ends where the line does, truncated and clamped text included, and text in inline-blocks too. The element's own background, border color, shadow and text shadow go too, its `::before` and `::after`'s with them, so a badge becomes its text's bar and a dot drawn by a pseudo-element goes; a field's placeholder text goes with them.
- **Pictures** (an `img`, `video` or `canvas` that's marked or inside a mark, or anything marked `"picture"`) are plates: a 1px edge in `--skeleton` (an inset outline, so nothing moves) over 45° stripes, in the element's own corners. An image's content is replaced with an empty one while loading, so the browser never draws its broken-image icon, whatever its source: none yet, empty, or one that fails.
- **Icons** (an `svg` that's marked or inside a mark) are 1px circles; their shapes hide. A chart's drawing (`svg[data-skeleton="drawing"]`, `references/charts.md`) isn't an icon: it paints itself, in `--skeleton`.
- **Nothing inside** (an element with no children: a swatch, a status dot, a field): a 1px outline of its box, in its own corners.
- **The pulse.** Every skeleton pulses (`skeleton-pulse`: opacity, which the browser animates off the main thread), all of a region in step.
- **The handover.** The render that turns `loading` false is already the handover (`data-revealing`): for 0.2s the bars fade out as the text fades in, and the data's own colors, borders and shadows fade in with it.
- **Nothing marked.** Nothing is painted: the wrapper only makes the region inert while it loads.
- **The placeholder is never read or reached.** `inert` takes the whole region out of the tab order and the accessibility tree while loading; `aria-busy` tells assistive tech it's loading.
- **Reduced motion.** No pulse; the data appears at once.
- **No `!important`.** Each rule outranks any utility on a marked element and most project CSS. Only these show through, so keep them off data elements:
  - an inline style (`style={{ color }}`) or an `!important` class: put data paint in a class;
  - a native checkbox, radio or range, which the browser draws whatever its colors: mark its label, not the control;
  - text directly inside a `display: contents` mark, which hides but gets no bar (the element has no box to draw it on): mark the element inside it.
- **The cost.** Painting is a style change on the region when it starts and stops loading, and a pulse per mark (opacity, off the main thread). Measured: a few marks cost nothing; 100 rows of 4 marks hold 60fps; 1,000 rows (4,000 marks) take about 100ms to start loading and scroll at about 45fps; 5,000 rows don't keep up. A placeholder list has the fewest rows the list usually has (rule 7), never hundreds.

## Rules

- **Behavior as shipped.** Every rule of `skeleton.css` stays, with what it sets, and the motion stays as written; `scripts/check.mjs` reports a missing rule or property. Restyle only the look values and `--skeleton`.
- **Paint only.** Any rule you add to `skeleton.css`, and any class with `data-loading:` or `data-revealing:`, must change paint only: color, border color, background, outline, corners, shadow, decoration, opacity, visibility, animation. Never padding, size, display, gap, border width, font size or line height.
- **One part, no props for shape.** No `count`, `lines`, `width` or `variant`: the component and its placeholder data are the shape.
