---
name: skeleton
description: Loading skeletons painted by CSS on the component's own markup, only for the parts that wait on data - no measuring, no client-side script, there from the first server-rendered frame. The real component renders (on the server or at build) with placeholder data while loading; every element marked data-skeleton (the ones that show data) is painted as a skeleton - text as borderless bars, one per line; pictures and videos as striped plates with a 1px edge; data icons as 1px circles; a chart as a drawing of itself that scales to its box (axes, gridlines, its count of bars or points or slices, label bars) - any chart, one-shot - a preset from the @frontendsupply/chart-skeletons package for common ones, any other (sankey, Gantt, box plot, treemap, waterfall) drawn with its kit from the chart's name, code or a screenshot; anything else as a 1px outline - while labels, dividers, buttons and static icons show as themselves. The skeletons pulse, and the data fades in when it arrives. One CSS variable for the color, reduced motion respected, and scripts that check the installed copy and every chart drawing. Use whenever someone adds or needs a loading state, skeleton, shimmer, pulse, placeholder or "Loading…" for a list, table, card, profile, feed, chart, dashboard or page; asks for a chart's skeleton from its name or a screenshot; wants spinners or hand-drawn skeletons (shadcn/ui Skeleton, react-loading-skeleton, MUI Skeleton, animate-pulse blocks) replaced; or edits a file with `data-slot="skeleton"` or `data-skeleton`, even without saying skeleton.
license: MIT
compatibility: Agent Skills format (Claude Code, Codex, Cursor, OpenCode and others). Projects - React 19 and Tailwind CSS v4. Built on @base-ui/react, installed if missing; its rules are a stylesheet the project imports. scripts/check.mjs needs Node 18+.
---

# Skeleton

A loading state that is the component itself. The agent wraps the real component in `Skeleton`, renders it with placeholder data while the data loads, and marks the elements that show data with `data-skeleton`. Only those are drawn as skeletons; everything that's part of the design shows as it is.

## The rules

Ten hard rules: when a skeleton is used, what it looks like, and why. They're the system, so a screen full of skeletons reads as one; the component applies rules 2, 3, 5, 6 and 8 by itself, from each marked element's type, and rules 1, 4, 7, 9 and 10 are yours to apply when you mark, draw the charts, write the placeholder and wrap. The skill's page shows each one live, loading beside loaded.

1. **Only data gets a skeleton.** What comes from the data (a title, a price, a name, a photo) is marked `data-skeleton`; labels, dividers, card borders, buttons and icons that are part of the design show as they are from the first frame. In mixed text only the data part is marked. *Why:* a skeleton says "data goes here"; on a button or a label it says something false and hides what's already known. *Example:* an order card: `Order <span data-skeleton>{id}</span>`, `Total <span data-skeleton>{total}</span>`, and the Track order button unmarked (`references/marking.md`).
2. **Text is a bar per line, with no border.** One filled bar per line of the text, as long as that line: the browser's own line breaks, so it's right at every width. *Why:* text is most of what loads; quiet bars read as lines of text at any size and keep the real text's line count and rhythm. *Example:* a title and a two-line description: three bars, the last one shorter.
3. **Pictures are striped plates, with a border.** `img`, `video`, `canvas`, and anything marked `data-skeleton="picture"` (an illustration's `svg`, a map): a 1px edge and diagonal stripes, in the element's own corners, so an avatar stays round. *Why:* a picture must never be mistaken for text, and stripes say "picture" at a glance, as on a layout sketch. *Example:* an album cover (square plate), a video (plate), an avatar (striped circle).
4. **Charts are drawings of themselves.** A chart that loads is drawn as its own structure, filling the chart's box: its axes and gridlines, as many bars, points, slices or series as it will have, a bar where each label goes, its legend where it puts it. Any chart, in one go: a preset from `@frontendsupply/chart-skeletons` for the common ones, any other (a sankey, a Gantt timeline, a box plot, a treemap) composed with the kit the presets are drawn with, from the chart's name, its code or a screenshot, after a written spec (`references/charts.md`). It's drawn at the chart's design size and scales to its box, its lines kept 1px, so it's server-rendered with no measuring. *Why:* a chart's shape is known before its numbers: a plate would only say "picture", while the drawing says which chart is coming and where each part of it lands, so the handover doesn't jump. *Example:* a week of orders: `<BarChartSkeleton width={320} height={180} bars={7} />`, seven outlined bars over dashed gridlines, a bar under each for the day.
5. **Icons are circles, if the data picks them.** An `svg` that the data chooses (a status, a file type, a flag), marked or inside a mark, is a 1px circle; an icon that's always the same is design and isn't marked. *Why:* a circle says "a mark goes here" without guessing which. *Example:* the check icon of a "Delivered" status is a circle; the clock beside "Updated" shows as itself.
6. **Everything else is an outline.** A marked element with nothing inside to read or show (a color swatch, a status dot) is a 1px outline of its own box. Every line is 1px, whatever the content's border widths, and every skeleton has its element's own corners. *Why:* one line weight keeps a screen of skeletons calm, and a skeleton should have the shape of what it stands for. *Example:* four color swatches become four outlined squares; a status dot, an outlined circle.
7. **Estimate low.** The placeholder data is invented and sits at the short end of usual: short names, one-line titles, the fewest rows a list usually has (often 3). *Why:* real data can make the layout grow when it arrives, which is expected; it must never make it shrink, which reads as a glitch. *Example:* a customer list with three placeholder rows; five arrive, and the list grows (`references/placeholder.md`).
8. **A pulse, and nothing moves.** The skeletons pulse gently; when the data arrives the bars fade out as it fades in (0.2s). They're painted by CSS on the placeholder's own layout, so they're there in the first frame (no script, no measuring) and never jump: no rough first version, nothing redrawn as the data lands. Reduced motion: no pulse, an instant swap. *Why:* motion says "loading" without taking attention, a skeleton that moves is a glitch, and a skeleton that waits for JavaScript misses the moment it's for. *Example:* a card loads: its cover is a striped plate and its title and artist bars from the first frame, pulsing; the data fades in.
9. **Wrap what loads, nothing more.** Each part that loads on its own gets its own `Skeleton`, true until its own data arrives. While it loads it's `inert` and `aria-busy` (its values aren't real); everything outside it works. *Why:* the screen should be usable for everything that's ready, and nothing should act on placeholder data. *Example:* an artist's page: the stats and the covers load separately, and the Follow button works from the start.
10. **Only for data that isn't there yet.** Never over content already in the page: server-rendered text, a static page, data the app already has while it refreshes. A saving button uses its own loading state; an upload, a progress bar. *Why:* a skeleton over what's ready only delays it. *Example:* a blog post from a static build shows at once; its comments, fetched on the client, get skeletons.

## Built on Base UI, painted by a stylesheet

- **[Base UI](https://base-ui.com) (`@base-ui/react`):** `Skeleton` takes `render` through its `useRender`, like every part from frontend.supply. Install it if it's missing; other primitives libraries stay for the project's own code. It carries no classes of its own (it only says the region's state), so there's nothing to merge and no `cn`.
- **`skeleton.css`** holds every rule: attribute selectors on `[data-slot='skeleton'][data-loading]`, in Tailwind's utilities layer. It's imported once from the project's main CSS, so the markup stays as it was: no long class lists in the HTML.
- **Tailwind CSS v4.** On v3, stop before writing anything: say the skeleton needs v4 and offer Tailwind's official upgrade (`@tailwindcss/upgrade`, with the project's package runner). Without Tailwind, offer to add v4 first. Never port it to another styling system.
- **React 19** (`inert` as a boolean, `ref` as a prop). On 18, say so and offer the upgrade before writing it.

## The color

One variable, set once in the project's CSS and pointed at its own tokens (`references/skeleton.md`, **Setup**): `--skeleton` paints the bars, borders, stripes and circles. Usually the project's muted fill, one step darker than the surface (`--muted`, `neutral-200`). Dark mode the project's way: if its tokens flip, it follows, live (the drawing is in `currentColor`; the color is the variable). Never a second, never a color written into the component.

## Commands

| Command | What it does | Writes? |
| --- | --- | --- |
| `/skeleton` | Status: the stack, what loads in the project (queries, effects, Suspense boundaries), how each shows its loading state now, and which already use the skeleton. | no |
| `/skeleton add <component or screen…>` | Gives each skeletons: marks its data, writes its placeholder data, wraps it. Sets the project up first if needed. | yes |
| `/skeleton refactor [component…]` | Replaces spinners, "Loading…" text and hand-drawn skeletons with skeletons drawn from the component, and removes what they needed (`*Skeleton` components, fixed heights). No names: every one `/skeleton` found. | yes |
| `/skeleton chart <name, screenshot or chart…>` | Draws any chart's skeleton in one go: reads the chart (by name, from its code, or measured from a screenshot), writes its spec, renders the preset that matches or composes it with the kit, checks it with `scripts/check-drawing.mjs`, and puts it in the chart's place while it loads. | yes |
| `/skeleton check [path]` | Runs `scripts/check.mjs` on the project's skeleton and, with a browser, opens a screen that loads; explains the result. | no |

Plain requests map onto these: "add a loading state to the orders table" is `add`; "make a skeleton for this chart" (with a screenshot) is `chart`; "our skeletons look nothing like the cards" is `refactor`; "is our loading state set up right?" is `check`.

## Workflow

For `add`, `refactor` and `chart` (`chart` is steps 1, 2, 5 and 8 to 10 for one chart). Don't call it done until step 8 passes.

1. **Read the project.** React version, Tailwind version, package manager (from the lockfile), TypeScript, server components, the UI folder, the main CSS file and its theme tokens, and how data loads: TanStack Query, SWR, server components, `fetch` in an effect, Suspense. Find the loading states the request is about: `isLoading`, `isPending`, Suspense `fallback`s, spinners, `animate-pulse`, components named `*Skeleton`.
2. **Set up, once per project.** Install `@base-ui/react` with the project's package manager if missing. Copy `components/skeleton.tsx` and `components/skeleton.css` into the UI folder, named like its neighbours (`'use client';` first in the `.tsx` for server components), and `@import` the CSS from the main CSS file, after Tailwind. Set `--skeleton` in the main CSS file, pointed at the project's tokens, with the `@source not` lines that keep Tailwind out of the skill's files (`references/skeleton.md`, **Setup**).
3. **Mark the data,** per component, as `references/marking.md` says: `data-skeleton` on every element that shows data, on the smallest element that holds only data; the data part of mixed text in its own `<span data-skeleton>`. Nothing static gets a mark.
4. **Write the placeholder data** as rule 7 and `references/placeholder.md` say: invented values at the short end of usual, the fewest usual rows, the same type as the real data, plugged into the project's data layer (`placeholderData`, `fallbackData`, a Suspense fallback, the initial state).
5. **Draw the charts** (rule 4). For each chart in a part that loads, follow `references/charts.md`: read it (its name, its code's props, or a screenshot, measured), write its spec (type, size, frame, marks, labels, legend, grid), then render the preset that matches it or compose it with the kit (there's no chart the kit can't draw: a type the presets don't have is no reason to fall back to a plate), at the chart's design size, in the chart's box while loading (the box has the chart's size from CSS: the drawing fills it). Install `@frontendsupply/chart-skeletons` with the project's package manager. Never a striped plate over a chart, never a chart drawn by eye.
6. **Wrap what loads** (rule 9): a `<Skeleton loading={…}>` around each part that loads on its own, true while that part shows its placeholder (`references/skeleton.md`, **Usage**). Fixed parts of the screen stay outside, usable. Delete what the old loading state needed: the spinner or hand-drawn blocks, the loading branch, a `*Skeleton` component and its imports.
7. **Restyle only the look.** The color is the variable. A text bar's thickness and the stripes' spacing are the look values in the classes. The rules (2, 3, 5, 6 and 8 are in the component; a chart drawing's look is its package's), the `// behavior` groups and the motion stay as shipped.
8. **Prove it.**
   - The server's (or the build's) HTML of each loading screen has `data-loading` on its `Skeleton`s: the skeletons paint before any JavaScript.
   - `node <this skill's folder>/scripts/check.mjs <the skeleton's file>` reports `check passed`: every rule of `skeleton.css` kept in the project's CSS and paint only, the slot and its states kept, Base UI imported, `--skeleton` set.
   - Every chart drawing: `node <this skill's folder>/scripts/check-drawing.mjs <drawing.svg>` reports `check passed` (`references/charts.md`, **Check it**).
   - The project's type check, lint, tests and build pass.
   - In the running app, with a browser tool: open each screen while it loads (reload with the network throttled), at desktop width and at 375px, in light and dark. Every data element has its skeleton (text a bar, a picture a striped plate, a chart its drawing, lined up with the chart) and nothing static has one; nothing shows through (an inline color is the usual cause); the data fades in when it lands. Without a browser tool, write in the report what to look at.
9. **Write it down.** Add to the project's `CLAUDE.md` (or `AGENTS.md`): each skeleton, its component, where its placeholder data lives, and the rule: only elements that show data carry `data-skeleton`, so a new data field gets one and a static element never does.
10. **Report** in this shape, one block per component:

   ```
   Order card: skeletons from its markup (src/components/order-card.tsx)
   - Marked: title, total, date, customer name, product photo (5); static: labels, divider, Track button
   - Placeholder: placeholderOrder in order-card.placeholder.ts, passed as placeholderData; the list shows 3
   - Charts: revenue → AreaChartSkeleton points={30}, 640×280 measured; check-drawing passed
   - Removed: OrderCardSkeleton and its 2 imports
   - Color: --skeleton var(--muted)
   - Proved: check passed; tsc, build pass; looked at it loading at 1280px and 375px, light and dark
   - Left for you: nothing
   ```

## Never

- **Never `!important`.** The component's rules outrank any one utility on a marked element, so none is needed. If a data element's paint still shows through, it's an inline style: move that color to a class (`bg-(--swatch)` with `style={{ '--swatch': color }}`).
- **Never measure, never script a skeleton.** No `getBoundingClientRect`, no observers, no canvas or SVG drawn at runtime: the placeholder's layout is the measurement, and CSS paints it. A chart's box gets its size from CSS, and its drawing fills it.
- **Never draw a skeleton by hand.** No gray blocks, no `h-4 w-32` bars, no `*Skeleton` copy of the component, no `lines={3}` prop. The component and its placeholder data are the skeleton; a chart's is its drawing, from its spec (rule 4).
- **Never stripe a chart or draw it by eye.** A chart that loads gets its drawing, from a spec: its type, its size, its counts, its labels and legend where it has them. No plate, no generic chart, no text or colors in a drawing, never scaled to fit.
- **Never change the drawing rules per component.** Text has no border, pictures always have one; lines are 1px; corners are the element's own. A project may change the color (the variable) and the look values, for every skeleton at once.
- **Never change layout in a state.** No `data-loading:` or `data-revealing:` class may touch size, spacing, display, position, border width, font size or line height: the skeletons sit over the placeholder's own layout. `scripts/check.mjs` fails one that does.
- **Never copy real data into a placeholder.** It ships in the bundle: invented values only, of the same type as the real data.
- **Never add props for shape.** `Skeleton` is one part: no `count`, `variant` or `lines`. It keeps its `data-slot`, takes `className` merged last, and composes through `render` (`<Skeleton render={<tbody />}>`, `<Skeleton render={<ul />}>`).

## Files

| Path | What |
| --- | --- |
| `components/skeleton.tsx` | The component: the source to copy. It only sets the region's state. |
| `components/skeleton.css` | Its rules, every one: the stylesheet to copy and import from the main CSS file. |
| `components/manifest.json` | Its rules (selector and properties), data-slot, exports and packages, generated from the two files; what `check.mjs` proves. |
| `references/skeleton.md` | Setup (the color), parts, usage and behavior, rebuilding an existing loading state (with a translation table), and the look values. |
| `references/marking.md` | Which elements get `data-skeleton`, decided from the source: data or not, the smallest element, mixed text, lists, conditional parts, form fields. |
| `references/charts.md` | Chart drawings: the vocabulary and its rules, reading a chart from its name, code or a screenshot, the spec, the package's charts, the kit, a worked custom chart, sizing a drawing's box, the check. |
| `references/placeholder.md` | The placeholder data: what it looks like, where it comes from, and how each data layer takes it. |
| `scripts/check.mjs` | `node scripts/check.mjs <file or folder>`: checks the installed copy kept every rule of `skeleton.css`, paints only, and has its color set. |
| `scripts/check-drawing.mjs` | `node scripts/check-drawing.mjs <drawing.svg>`: checks a chart drawing's size and viewBox, vocabulary, colors, bounds and pixel grid, and prints every failure with its part. |
