# Marking the data

Only elements marked `data-skeleton` get a skeleton. The component can't tell data from design on its own: in the page, `{order.total}` and a hard-coded "Total" are both just text. So you decide, from the component's source, and mark.

## The test

An element gets `data-skeleton` when **what it shows comes from the data being loaded**: its text, its image source, the icon it picks. If it would look the same whatever the data is, it isn't marked.

| Marked (comes from the data) | Not marked (part of the design) |
| --- | --- |
| `{order.title}`, `{user.name}`, `{formatPrice(item.price)}`, `{post.createdAt}` | "Total", "Orders", a heading written in the code |
| `<img src={user.avatar}>`, `<video src={clip.url}>` | A logo, an illustration, a decorative picture |
| An icon chosen by the data: `{statusIcon[order.status]}`, a file-type icon, a flag | An icon that's always the same: a chevron, a search icon, the icon in a button |
| A badge whose text or color comes from the data | A divider, a card's border, a background |
| A count: `{unread}` in a badge | A button, a link, a static menu |

A translated string (`t('orders.total')`) is design, not data. A string built from data (`t('orders.count', { count })`) is data.

## Where the mark goes

- **The smallest element that holds only data.** `<h3 data-skeleton>{post.title}</h3>`, not the `<article>` around it: marking the article would turn its labels and buttons into skeletons too.
- **Mixed text gets a span.** "By {author}" becomes `By <span data-skeleton>{author}</span>`: "By" stays, the name is a bar. Add the `<span>` if it isn't there; it's inline and changes nothing in the layout.
- **One mark per piece of data.** A marked element inside another marked element is drawn with it; don't mark both.
- **Pictures are marked on themselves:** `<img data-skeleton>`, `<video data-skeleton>`, `<canvas data-skeleton>` (or on a wrapper that holds only the picture: an `img` inside a mark is a plate too). A picture that isn't one of those, an illustration's `<svg>` or a `<div>` with a background image, is marked `data-skeleton="picture"`; an unmarked-kind `svg` is taken for an icon.
- **Through components.** When the data element is inside a child component, pass the mark down: the child spreads `...props` onto its element, or takes the attribute explicitly. Don't mark a component's wrapper to reach one value inside it.

## Cases

- **Lists.** Each row's data elements are marked, in the row component, once; the placeholder decides how many rows show (`references/placeholder.md`). Row dividers, row borders and static labels inside a row stay unmarked: they show while loading, on the placeholder rows.
- **Optional elements** (a "Sale" badge only some items have, an empty state, an error line): the placeholder decides whether they render. Give the placeholder the common case; when the real data differs, the layout adjusts.
- **Form fields filled from data** (an edit form loading its record): mark the field (`<input data-skeleton defaultValue={user.email}>`): its value hides and the field shows as a 1px outline. A label is design: unmarked.
- **Charts** aren't marked: while loading, the chart's drawing takes its place (`references/charts.md`), and the drawing carries its own mark (`data-skeleton="drawing"`). A marked chart `svg` with no drawing would be an icon's circle, a `canvas` a picture's plate: neither says chart.
- **A colored element whose color is the data** (a color swatch, a status dot): mark it; with nothing inside, it's drawn as its outline. Its color goes through a class (`className="bg-(--swatch)" style={{ '--swatch': color }}`), never an inline `background`, which would show through the skeleton.
- **Numbers that change in place** (a live counter after the first load): marking is for the first load only; `loading` is false afterwards.

## Checking the marks

- Read each marked element's JSX: does it render a value from the data? Read each unmarked element that renders text or a picture: is it fixed? Fix the ones that fail.
- In the browser, while loading: every value from the data is a skeleton, and nothing else is.
- The console warns `Skeleton: nothing inside is marked data-skeleton` when a `Skeleton` has no marks at all: a wrapper with nothing to draw.
