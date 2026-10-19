# Placeholder data

While loading, the component renders with placeholder data: invented values of a typical shape, the same type as the real data. Its marked elements are drawn as skeletons, so the values are never seen, but their lengths and counts set the size of every skeleton.

The real data will be different: more rows, a longer name, a missing photo. The layout adjusts when it arrives, the way every feed does. The placeholder only has to be a good guess.

## What it looks like

- **The same type** as the real data: the same fields, so the component renders without a special case. `placeholderOrder: Order`.
- **Estimate low.** The real data may make the layout grow when it arrives (a longer title wrapping onto a second line, more rows): that's expected. It must not make it shrink, which reads as a glitch. So every value sits at the short end of usual: a short name (`'Name'`), a one-line title, a price like `'$00.00'`, a date like `'Jan 01'`; from the API's types and, when there's one, a sample response.
- **A few rows for a list:** 3, or the fewest a list usually has if that's fewer. Never the real count: it isn't known yet.
- **Pictures:** a source that's empty but valid (a 1×1 transparent GIF: `data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==`), on an element sized by CSS (`size-16`, or `w-full aspect-square`): the pixel's own square ratio would win over `width` and `height` attributes.
- **Optional fields:** the common case. If most items have a photo, the placeholder has one.
- **Invented, always.** Never a real user, order or record, and nothing personal: the placeholder ships in the bundle.

Keep it next to the component (`order-card.placeholder.ts`) or in the component file, typed, exported.

## Where it plugs in

Use the project's data layer:

| Data layer | Placeholder | `loading` |
| --- | --- | --- |
| TanStack Query | `placeholderData: placeholderOrder` | `isPlaceholderData` |
| SWR | `fallbackData: placeholderOrder` | `data === placeholderOrder` (SWR returns the fallback until the first fetch resolves) |
| `fetch` in an effect, `useState` | `useState(placeholderOrder)` and a `loaded` flag | `!loaded` |
| `<Suspense fallback>` | `fallback={<Skeleton loading><OrderCard order={placeholderOrder} /></Skeleton>}` | always `true` in the fallback |
| Server components streaming to the client | The server sends what it has; the parts the client fetches render with the placeholder | while the client's fetch is pending |
| A store (Zustand, Redux) | The store's initial state is the placeholder, marked as such | the store's own flag |
| Already-loaded data being refreshed | Nothing: the real data is on screen; no skeleton | — |

## When the data is already there

Server-rendered content, data from a cache, a static page: it isn't loading, so it gets no skeleton. A skeleton over data that's already there only delays it. Skeletons are for the first load of data the page doesn't have yet.
