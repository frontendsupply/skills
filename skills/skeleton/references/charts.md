# Charts

A chart that loads becomes a drawing of itself (rule 4): an `<svg data-skeleton="drawing">` made of the chart's own structure (its axes and gridlines, as many bars or points or slices as it will have, a bar where each label goes) and nothing else. It's drawn at the chart's design size and fills the chart's box, so it's rendered on the server with everything else and needs no measuring: give the box the chart's size with CSS. It paints itself in `--skeleton`, pulses with the other skeletons, and the chart takes its place when the data lands.

Any chart can be drawn, in one go. The package has presets for the common ones (line, area, bars, pie, donut, scatter, radar, heatmap, candlestick, gauge, funnel, sparkline); every other chart (a sankey, a Gantt timeline, a box plot, a treemap, a waterfall, a bullet chart, anything a library draws) is composed with the kit the presets are drawn with. Either way the drawing is decided before any SVG is written, the way a draughtsman works: read the chart, write its spec, then draw it from the spec. Most of the quality is in the spec.

## The vocabulary

Every drawing is made of four parts, every one a `<path>` marked with what it is. Nothing else goes in: no text, no colors, no transforms, no `rect` or `circle` (the kit's shapes are paths).

| Part | Marked | Draws | Use it for |
| --- | --- | --- | --- |
| `Line` | `data-line` | A 1px line, kept 1px when the drawing scales | Axes, the baseline, a series, a bar's or slice's outline, a point's circle, a legend key |
| `Guide` | `data-guide` | A 1px dashed line (2 on, 3 off), kept 1px | Gridlines, a gauge's track, a radar's rings and spokes, connectors |
| `Label` | `data-fill` | A filled bar, 6px tall | Any text the chart shows: axis labels, a legend's names, a value in a donut's hole |
| `Hatch` | `data-stripes` | Diagonal stripes | An area: under a line, one slice, the bottom of each stack, a heatmap's strong cells |

- **Lines for structure, stripes for one kind of area.** Stripe the area that says what the chart is (the fill under an area chart's line, a pie's first slice, the first stack), not everything: a drawing that's mostly stripes reads as a picture.
- **A label is short.** As tall as about half its text's size (11px text: 6px, the kit's `LABEL`; 14px: 8px; 16px: 10px) and as wide as its text would be: about 0.55 × the text size per character (11px: about 6px, so `Mon` 18 to 20px, `$40k` 24px, a legend name 30 to 40px). Vary neighbouring widths a little; real labels differ. A label never sits on stripes.
- **Stripes are optional.** A drawing without any is fine (a treemap, a Gantt timeline); stripe one area only where it's what the chart is about.
- **Reference lines** (today, a target, an average) are a `Line` when the grid is dashed and a `Guide` when it isn't, and run a little past the plot, so they don't read as one more gridline.
- **No text, ever.** A label is a bar: the real words aren't known yet, and a word in a skeleton reads as content.

## The rules of a drawing

1. **The chart's design size, filling its box.** `width` and `height` are the chart's usual size in CSS pixels (its height as the code sets it, a typical width), whole numbers, and the `viewBox` is `0 0 width height`. The `<svg>` is `width="100%" height="100%"`: it fills the box the chart fills, stretched to it (`preserveAspectRatio="none"`, for charts on axes) or whole and centered (`"xMidYMid meet"`, for round charts: pie, donut, radar, gauge), and every line and guide has `vector-effect="non-scaling-stroke"`, so it stays 1px. The box gets its size from CSS, as the chart's does (`h-70 w-full`); a box with no height takes the drawing's proportions. Never measure the box (see **Sizing the box**).
2. **The structure, never the data.** Draw what's known before the numbers: the chart type, its axes and grid, how many marks it has, where its labels and legend go. The marks' heights are a stand-in (the kit's `wave`, `noise`, `shares`): plausible, the same on every render, never real values.
3. **The real count.** As many bars, candles, slices, series, rows and columns as the chart will have, from what's already known: 7 for a week, 12 for a year, the series in the chart's config. When the count depends on the data, estimate low (rule 7): the fewest it usually has.
4. **Where the chart puts things.** Labels and legend on the side the chart draws them (Chart.js puts its legend on top by default, Recharts below), gridlines where it has them (horizontal only, or both), its plot inset by its own margins. A drawing that lines up with the chart hands over without a jump.
5. **Crisp at its design size.** A straight 1px line sits on the half pixel (`x.5`), a label's edges on whole pixels. The kit does it (`half`, `whole`, `outline`, `area`, `hLine`, `vLine`); hand-written coordinates must too. In a box of the design size it's pixel-exact; scaled, its lines stay 1px.
6. **Inside the box.** Every part inside `0 0 width height`, a line's whole stroke too (half a pixel in from the edge).

`scripts/check-drawing.mjs` checks rules 1, 5 and 6 and the vocabulary, and prints each failure with the part and its path. Rules 2 to 4 are yours: they're what the spec is for.

## Read the chart

Whatever you're given, find out the same things: **the type, the size, the frame, the marks, the labels, the legend, the grid.**

**From a name** ("a bar chart of orders per day", "a sankey of signups by source"): a preset has it, or the kit composes it (there's no chart it can't). The size comes from where the chart will sit (its container, or the size the code gives it); the count from the name ("per day this week": 7).

**From code,** read the chart's own props:

| Library | Size | Frame and legend | Marks |
| --- | --- | --- | --- |
| Recharts (and shadcn/ui charts, Tremor) | `<ResponsiveContainer width height>` or the chart's `width`/`height`; shadcn's `ChartContainer` is `aspect-video` unless its class says otherwise | `margin` → `pad` (5 on every side by default; per side as `{ top, right, bottom, left }`), `<YAxis width>` → `yAxis` (60 by default), `<XAxis height>` → `xAxis` (30), `<Legend verticalAlign>` (bottom), `<CartesianGrid vertical={false}>` | one `<Line>`/`<Area>`/`<Bar>` per series, `stackId` for stacks, `type="monotone"` for smooth curves, `data.length` points; x labels thinned so they don't touch (count the ones it shows, the last kept) |
| Recharts `<Treemap>`, `<Sankey>` | as above | no axes; a Sankey's nodes 10px wide, 10px apart (`nodeWidth`, `nodePadding`) | tiles from the kit's `squarify`; links from `band` |
| Chart.js (react-chartjs-2) | the canvas's container; `aspectRatio` (2 by default; 1 for pie, doughnut, radar) | `plugins.legend.position` (top by default), `scales.x.grid` / `scales.y.grid` | `data.datasets` (series), `data.labels` (points or bars) |
| ECharts | the container `div`'s size | `grid` (`left`, `right`, `top`, `bottom`; 10% / 60px by default), `legend` (top center) | `series[]`, `xAxis.data` |
| visx, D3 | the `width`/`height` passed in (often from `ParentSize`) | the `margin` object | the data's length |
| Nivo | the container (`Responsive*`) | `margin`, `legends[].anchor` | `keys` (series), `data` |

**From a screenshot,** measure:
- **The scale.** Screenshots are often 2× (a Retina screen). Measure a digit in an axis label: 11px text has digits about 8px tall at 1× and 16px at 2×. Halve every measurement at 2×. When the user names the size, use theirs.
- **The plot first:** where the gridlines and the baseline run, from the first to the last. That's what lines up; measure it to the pixel.
- **Then the box,** built out from the plot: the plot, plus `yAxis` (the y labels' width and their gap) and `pad` on the left, `pad` on the right and the top (plus a legend's band), `xAxis` (the x labels' height and gap) and `pad` below. Where an edge isn't visible, use the frame's defaults. A chart fills its card's width only when its gridlines run to the card's inner edge; when they stop short, it's a fixed-size chart, as wide as its box.
- **Count everything:** bars, candles, points per line, series (one per color), slices, rows and columns, gridlines, x labels (often every other category), legend entries.
- **Where the legend and labels are,** and how long the labels run.

**Overlay to check:** put the drawing over the screenshot at 1×, at the box's origin; the gridlines, baseline and marks should land on the chart's.

## Write the spec

Before any SVG, write the spec in this shape (in your notes or the report, never in the drawing):

```
Chart: revenue, Recharts AreaChart in a ResponsiveContainer (height 280; the card's width, about 640)
Size: 640×280, in the chart's box (h-70 w-full)
Frame: y labels left, 48px (YAxis width 40 + 8); x labels below, 24px; pad 8; legend none
Marks: 1 series, 30 points (30 days); stripes under the line
Grid: 4 dashed rows (CartesianGrid vertical={false}), solid baseline
Curve: monotone (type="monotone"), stacked: no
Labels: 5 y labels ($40k: 24px), 6 x labels under the points (Oct 1: 30px)
Reference lines: none
Phone: one drawing (the chart doesn't reflow) | or: a second drawing at 343×280 (its ticks thin to 4)
Drawing: AreaChartSkeleton points={30} curve="monotone" margins={{ pad: 5, yAxis: 48, xAxis: 24 }}
```

Then pick: **a preset** when one matches the spec's structure at its options (label widths are estimates either way: they're no reason to leave a preset; pass `widths` to `AxisLabels` in a kit drawing when they matter); **the kit** when the chart differs (another frame, another mark, a type the package hasn't). Never bend the spec to fit the package: a bar chart drawn as a line chart, or a legend on the wrong side, says the wrong thing.

## The presets

`@frontendsupply/chart-skeletons` (install it with the project's package manager): shortcuts for the common charts, not the limit of what's drawn. Each chart takes `width` and `height` (its design size in pixels: the chart's height and usual width) and its counts, and fills its box; every other prop goes to the `<svg>`. Round charts (pie, donut, radar, gauge) keep their shape, centered; the others stretch to the box.

| Component | Options (default) | Draws |
| --- | --- | --- |
| `LineChartSkeleton` | `series` (1), `points` (12), `labels` (6), `curve` (`'linear'` or `'monotone'`), `axes` (true), `legend` (none), `margins` | Gridlines, y labels, x labels under the points, one line per series |
| `AreaChartSkeleton` | as `LineChartSkeleton`, and `stacked` (false) | The same, with stripes under the first series (the bottom of the stack) |
| `BarChartSkeleton` | `bars` (8), `axes`, `legend` | Outlined bars on the baseline, a label under each |
| `StackedBarChartSkeleton` | `bars` (8), `stacks` (3), `axes`, `legend` | Bars of `stacks` parts, the bottom part striped |
| `HorizontalBarChartSkeleton` | `bars` (6), `labels` (true) | Bars from a left axis, longest first, category labels left, values right |
| `PieChartSkeleton` | `slices` (4), `legend` (right) | Slices, largest first, the first striped, a legend of boxes |
| `DonutChartSkeleton` | `slices` (4), `legend` (right) | A ring of slices, a value and a caption in the hole |
| `ScatterChartSkeleton` | `points` (24), `axes`, `legend` | Both axes, a rising cloud of circles |
| `RadarChartSkeleton` | `spokes` (6), `rings` (3) | Dashed rings and spokes, one striped shape, a label at each spoke |
| `HeatmapSkeleton` | `rows` (5), `columns` (12) | A grid of cells, the strong ones striped, row and column labels |
| `CandlestickChartSkeleton` | `candles` (16), `axes` | Wicks and bodies, the falling ones striped |
| `GaugeSkeleton` | `value` (0.62) | A half ring, filled to `value`, the reading and the ends labelled |
| `FunnelChartSkeleton` | `stages` (5) | Narrowing stages, the first striped, a label for each |
| `SparklineSkeleton` | `points` (16), `dot` (true), `curve` | A line and its last point, no axes: for a figure's card |

`legend` is `'top'`, `'right'`, `'bottom'` or `false`. Axes are y labels on the left and x labels below, in the frame described under **The kit**; `margins` (`{ pad, yAxis, xAxis }`, on every chart with `axes`; `pad` a number or `{ top, right, bottom, left }`) moves the plot to where the chart's own margins put it.

```tsx
import { BarChartSkeleton } from '@frontendsupply/chart-skeletons';

<Skeleton loading={isPending} className="h-45 w-full">
  {isPending ? <BarChartSkeleton width={320} height={180} bars={7} /> : <OrdersChart data={data} />}
</Skeleton>
```

The drawing is marked by the package (`data-skeleton="drawing"`), so the chart's own `svg` or `canvas` needs no mark: it replaces the drawing when the data arrives.

## The kit

Everything the presets are drawn with, exported from the same package, for every chart they don't cover: with it any chart is drawn in one go, from its spec.

- **`frame({ width, height }, { axes, legend, pad, yAxis, xAxis })`** lays a chart on axes out: `pad` around everything (8, or `{ top, right, bottom, left }`), y labels on the left (`yAxis`, 32 wide), x labels below (`xAxis`, 20 tall), a legend on top or below (a 24px band, centered across the chart) or on the right (96). It returns `{ plot, yLabels, xLabels, legend }`, each a box `{ x, y, w, h }`. Match `yAxis`, `xAxis` and `pad` to the chart's own margins. A chart laid out otherwise (a Gantt's task column and top axis, a sankey's columns) lays out its own boxes: `frame` is a helper, not a requirement.
- **Parts:** `Drawing` (the `<svg>`: `width` and `height`, its design size, and `fit`, `'stretch'` by default or `'contain'` for a round chart; an `id` when several drawings are rendered by separate React roots, so their stripes don't share one; it fills its box; then the parts as children), `Line`, `Guide` and `Hatch` (each a `d`), `Label` (`x`, `y`, `w`, and `h`, `LABEL` by default).
- **Pieces:** `Grid` (`plot`, `rows`: dashed rows and a solid baseline), `AxisLabels` (`frame`, `rows`, `columns`, `at` and `widths`: y labels at the gridlines; x labels centered in bands (`at="band"`, bars) or under points from the plot's left edge to its right (`at="point"`, lines and areas); `widths` `{ x, y }` as measured; `columns={0}` for none, when each bar labels itself), `Legend` (`box`, `count`, `side`, `mark`: `'line'` keys for lines, `'box'` for bars and slices; as many entries as fit).
- **Shapes,** path data on the pixel grid: `hLine(x1, x2, y)`, `vLine(x, y1, y2)`, `outline(box)` (a box's 1px outline, inside it, clockwise), `area(box)` (a box on whole pixels, for a hatch or a label), `polyline(points)`, `monotone(points)` (a smooth line that never overshoots its points: Recharts' and d3's `monotone`), `circle(cx, cy, r)`, `arc(cx, cy, r, a, b)` and `segment(cx, cy, outer, inner, a, b)` (angles in turns, 0 at the top, clockwise; `inner` 0 is a pie slice), `onCircle(cx, cy, r, turn)`, `band(x1, y1, y1end, x2, y2, y2end)` (a sankey link between two nodes' edges, its ends on their outlines), and `half(v)` / `whole(v)` to snap a coordinate of your own. A line centered in an outlined box (a median, a wick) needs an odd width and `vLine(whole(x) + Math.floor(w / 2), …)`.
- **Layout:** `squarify(values, box)`: a treemap's tiles, one box per value, as square as they can be.
- **Stand-in data:** `wave(count, seed)` (values 0.1 to 0.92, wandering and rising a little), `noise(count, seed)` (0 to 1, no pattern), `shares(count)` (parts of a whole, largest first).
- **`LABEL`** (6): a label's height at 11px text.

### A chart the presets don't have

From a screenshot of a cash-flow waterfall, 1120×480 (2×: its axis labels are 22px tall), in a Recharts `ResponsiveContainer`:

```
Chart: cash flow, a waterfall (Recharts BarChart, a transparent base stacked under each bar)
Size: 560×240
Frame: y labels left, 32px; x labels below, 20px; pad 8; legend none
Marks: 6 columns: the opening balance, 4 changes, the closing balance; the first and last stand on the
  baseline, the changes float from the running total; a dashed connector from each column's top to the next
Grid: 4 dashed rows, solid baseline
Labels: 5 y labels, 6 x labels (Opening, Sales, …: 20px)
Drawing: the kit (no waterfall in the package)
```

```tsx
import * as React from 'react';
import { AxisLabels, Drawing, Grid, Guide, Hatch, Line, area, frame, hLine, outline, type Size } from '@frontendsupply/chart-skeletons';

export function CashFlowSkeleton({ width, height }: Size) {
  const f = frame({ width, height });
  const { plot } = f;
  const totals = [0.5, 0.68, 0.6, 0.78, 0.7, 0.7]; // the running total after each column: a stand-in
  const step = plot.w / totals.length;
  const w = Math.round(step * 0.56);
  const y = (v: number) => plot.y + plot.h - Math.round(v * (plot.h - 2));
  return (
    <Drawing width={width} height={height}>
      <Grid plot={plot} />
      <AxisLabels frame={f} columns={totals.length} />
      {totals.map((v, i) => {
        const ends = i === 0 || i === totals.length - 1;
        const from = ends ? 0 : totals[i - 1];
        const top = y(Math.max(from, v));
        const box = { x: plot.x + step * i + (step - w) / 2, y: top, w, h: Math.max(y(Math.min(from, v)) - top, 3) };
        return (
          <React.Fragment key={i}>
            {ends && <Hatch d={area(box)} />}
            <Line d={outline(box)} />
            {i < totals.length - 1 && <Guide d={hLine(box.x + w, box.x + step, y(v))} />}
          </React.Fragment>
        );
      })}
    </Drawing>
  );
}
```

It checks clean at 560×240, 343×200 and 800×320. Write a custom drawing next to the chart it stands for (`cash-flow-chart.tsx`, `cash-flow-chart.skeleton.tsx`), never inside the package.

**Without React,** or for a one-off, write the `<svg>` by hand with the same vocabulary: `data-skeleton="drawing"`, `width="100%" height="100%"`, `viewBox="0 0 W H"`, `preserveAspectRatio`, `fill="none" stroke="currentColor"`, `style="color: var(--skeleton)"`, then only `<path data-line|data-guide|data-fill|data-stripes d="…">`, each line and guide with `vector-effect="non-scaling-stroke"`. A label is `<path data-fill fill="currentColor" stroke="none" d="M48 160H68V166H48Z"/>`; stripes take a pattern from `<defs>` (`fill="url(#stripes)"`, a 1×6 rect rotated 45°). Check it the same way.

## Sizing the box

The drawing fills the box it's in, so the box is sized the way the chart's is, by CSS: nothing is measured, and the drawing is in the server's HTML. Wrap the chart and its drawing in one box, or give the `Skeleton` the chart's size:

```tsx
<Skeleton loading={isPending} className="h-70 w-full">
  {isPending ? <AreaChartSkeleton width={640} height={280} points={30} /> : <RevenueChart data={data} />}
</Skeleton>
```

- **A `ResponsiveContainer`, `ParentSize` or Chart.js chart** fills its parent: that parent's height (`h-70`) is the box, and the drawing fills the same one. The library may measure for its own chart; the skeleton never does.
- **A fixed-size chart** (`<LineChart width={500} height={300}>`): the box is that size (`w-125 h-75`), and with the same design size the drawing is drawn 1:1.
- **A box with no height** (a flex item with only a width): the drawing takes the height its proportions give it. Set the box's height when the chart has one.
- **On a phone.** A stretched drawing narrows evenly, but a chart doesn't: Recharts keeps its YAxis width and thins its x labels. When that changes the drawing (a phone's 343px against a 600px design: the y labels squeezed, too many x labels), draw a second one at the phone's design size and swap the two with CSS, each in its own wrapper (`<div className="h-full max-sm:hidden">` and `<div className="h-full sm:hidden">`): the drawing's own `display` is inline, so a class on the `<svg>` won't hide it.

## Check it

1. **The markup:** `node <this skill's folder>/scripts/check-drawing.mjs drawing.svg` (or `-` for stdin) must end `check passed`, every count at 0. Get the markup from the running page (`document.querySelector('svg[data-skeleton="drawing"]').outerHTML`, through the browser tool) or from React (`renderToStaticMarkup(<CashFlowSkeleton width={560} height={240} />)` with the project's TypeScript runner). 2. **Look at it** loading, against the loaded chart, at the chart's usual width and at a phone's: best laid over a 1× screenshot of the chart at the box's origin, otherwise side by side. The check proves size, parts and pixels, not that it's the right chart: the drawing fills the chart's box; the axes, the labels and the legend land where the chart's do; the marks are the chart's count; the lines are 1px; nothing jumps when the chart arrives.

## Common failures

- **A circle or a plate over a chart.** A marked chart `svg` with no drawing is an icon's circle, a `canvas` a picture's plate. A chart that loads gets its drawing.
- **The drawing measured.** A `ResizeObserver`, `getBoundingClientRect` or a measuring wrapper to size it: the box's CSS sizes it, from the first frame.
- **A round chart stretched** (a pie in `preserveAspectRatio="none"`): an ellipse. Round charts are `fit="contain"` in the kit.
- **Lines that scale** (no `vector-effect="non-scaling-stroke"`): a stretched drawing's lines thicken or thin.
- **Text in the drawing** (a `<text>`, a title, a value): it reads as content. A label is a bar.
- **Colors in the drawing** (`stroke="#ccc"`, a class): the `Skeleton` colors it with `--skeleton`; outside one, `--skeleton` colors it.
- **The wrong chart.** A line chart's drawing for a bar chart, a legend on the right for a chart that has it on top, 12 bars for a week: the handover jumps, and the drawing said something false. Back to the spec.
- **Everything striped.** Stripes for one kind of area; lines for the rest.
- **Fractional sizes** (`width={320.5}`): a design size is whole pixels.
