# Charts

A chart that loads becomes a drawing of itself (rule 4): an `<svg data-skeleton="drawing">` at the chart's exact size, made of the chart's own structure (its axes and gridlines, as many bars or points or slices as it will have, a bar where each label goes) and nothing else. Inside a `Skeleton` the component draws it with the two colors: its lines trace in, the shimmer crosses it, and the chart takes its place when the data lands.

The drawing is decided before any SVG is written, the way a draughtsman works: read the chart, write its spec, then draw it from the spec with the package's parts. Most of the quality is in the spec.

## The vocabulary

Every drawing is made of four parts, every one a `<path>` marked with what it is. Nothing else goes in: no text, no colors, no transforms, no `rect` or `circle` (the kit's shapes are paths).

| Part | Marked | Draws | Use it for |
| --- | --- | --- | --- |
| `Line` | `data-line` | A 1px line, traced in | Axes, the baseline, a series, a bar's or slice's outline, a point's circle, a legend key |
| `Guide` | `data-guide` | A 1px dashed line (2 on, 3 off) | Gridlines, a gauge's track, a radar's rings and spokes, connectors |
| `Label` | `data-fill` | A filled bar, 6px tall | Any text the chart shows: axis labels, a legend's names, a value in a donut's hole |
| `Hatch` | `data-stripes` | Diagonal stripes | An area: under a line, one slice, the bottom of each stack, a heatmap's strong cells |

- **Lines for structure, stripes for one kind of area.** Stripe the area that says what the chart is (the fill under an area chart's line, a pie's first slice, the first stack), not everything: a drawing that's mostly stripes reads as a picture.
- **A label is short.** 6px tall (11px text), as wide as its text would be: about 6px per character at 11px (`Mon` 18 to 20px, `$40k` 24px, a legend name 30 to 40px). Vary neighbouring widths a little; real labels differ.
- **No text, ever.** A label is a bar: the real words aren't known yet, and a word in a skeleton reads as content.

## The rules of a drawing

1. **The chart's exact size.** `width` and `height` are the chart's rendered size in CSS pixels, whole numbers, and the `viewBox` is `0 0 width height`: one unit, one pixel. Never scale a drawing with CSS (`w-full`, `h-auto`): a scaled 1px line blurs. A responsive chart is measured, and the drawing redrawn at the new size (see **Responsive charts**).
2. **The structure, never the data.** Draw what's known before the numbers: the chart type, its axes and grid, how many marks it has, where its labels and legend go. The marks' heights are a stand-in (the kit's `wave`, `noise`, `shares`): plausible, the same on every render, never real values.
3. **The real count.** As many bars, candles, slices, series, rows and columns as the chart will have, from what's already known: 7 for a week, 12 for a year, the series in the chart's config. When the count depends on the data, estimate low (rule 7): the fewest it usually has.
4. **Where the chart puts things.** Labels and legend on the side the chart draws them (Chart.js puts its legend on top by default, Recharts below), gridlines where it has them (horizontal only, or both), its plot inset by its own margins. A drawing that lines up with the chart hands over without a jump.
5. **Crisp.** A straight 1px line sits on the half pixel (`x.5`), a label's edges on whole pixels. The kit does it (`half`, `whole`, `outline`, `area`, `hLine`, `vLine`); hand-written coordinates must too.
6. **Inside the box.** Every part inside `0 0 width height`, a line's whole stroke too (half a pixel in from the edge).

`scripts/check-drawing.mjs` checks rules 1, 5 and 6 and the vocabulary, and prints each failure with the part and its path. Rules 2 to 4 are yours: they're what the spec is for.

## Read the chart

Whatever you're given, find out the same things: **the type, the size, the frame, the marks, the labels, the legend, the grid.**

**From a name** ("a bar chart of orders per day"): the package has it, or the kit composes it. The size comes from where the chart will sit (its container, or the size the code gives it); the count from the name ("per day this week": 7).

**From code,** read the chart's own props:

| Library | Size | Frame and legend | Marks |
| --- | --- | --- | --- |
| Recharts (and shadcn/ui charts, Tremor) | `<ResponsiveContainer width height>` or the chart's `width`/`height`; shadcn's `ChartContainer` is `aspect-video` unless its class says otherwise | `margin`, `<YAxis width>` (60 by default), `<XAxis height>` (30), `<Legend verticalAlign>` (bottom), `<CartesianGrid vertical={false}>` | one `<Line>`/`<Area>`/`<Bar>` per series, `stackId` for stacks, `data.length` points |
| Chart.js (react-chartjs-2) | the canvas's container; `aspectRatio` (2 by default; 1 for pie, doughnut, radar) | `plugins.legend.position` (top by default), `scales.x.grid` / `scales.y.grid` | `data.datasets` (series), `data.labels` (points or bars) |
| ECharts | the container `div`'s size | `grid` (`left`, `right`, `top`, `bottom`; 10% / 60px by default), `legend` (top center) | `series[]`, `xAxis.data` |
| visx, D3 | the `width`/`height` passed in (often from `ParentSize`) | the `margin` object | the data's length |
| Nivo | the container (`Responsive*`) | `margin`, `legends[].anchor` | `keys` (series), `data` |

**From a screenshot,** measure:
- **The scale.** Screenshots are often 2× (a Retina screen). Axis labels are usually 11 to 12px in CSS: if they're 22 to 24px tall in the image, halve every measurement. When the user names the size, use theirs.
- **The chart's box:** from the card's inner edge to inner edge (not the card's padding or title, which stay as they are: they're the design).
- **The plot:** where the axes sit, so the frame's `yAxis`, `xAxis` and `pad` match (the y labels' width plus their gap; the x labels' height plus their gap).
- **Count everything:** bars, candles, points per line, series (one per color), slices, rows and columns, gridlines, x labels (often every other category), legend entries.
- **Where the legend and labels are,** and how long the labels run.

## Write the spec

Before any SVG, write the spec in this shape (in your notes or the report, never in the drawing):

```
Chart: revenue, Recharts AreaChart in a ResponsiveContainer (height 280; width from the card, measured)
Size: 640×280
Frame: y labels left, 48px (YAxis width 40 + 8); x labels below, 24px; pad 8; legend none
Marks: 1 series, 30 points (30 days); stripes under the line
Grid: 4 dashed rows (CartesianGrid vertical={false}), solid baseline
Labels: 5 y labels ($40k: 24px), 6 x labels (Oct 1: 30px)
Drawing: AreaChartSkeleton points={30} margins={{ yAxis: 48, xAxis: 24 }}
```

Then pick: **the package** when one of its charts matches the spec at its options; **the kit** when the chart differs (another frame, another mark, a type the package hasn't). Never bend the spec to fit the package: a bar chart drawn as a line chart, or a legend on the wrong side, says the wrong thing.

## The package

`@frontendsupply/chart-skeletons` (install it with the project's package manager). Each chart takes `width` and `height` (the chart's size in pixels) and its counts; every other prop goes to the `<svg>`.

| Component | Options (default) | Draws |
| --- | --- | --- |
| `LineChartSkeleton` | `series` (1), `points` (12), `axes` (true), `legend` (none), `margins` | Gridlines, axis labels, one traced line per series |
| `AreaChartSkeleton` | as `LineChartSkeleton` | The same, with stripes under the first series |
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
| `SparklineSkeleton` | `points` (16), `dot` (true) | A line and its last point, no axes: for a figure's card |

`legend` is `'top'`, `'right'`, `'bottom'` or `false`. Axes are y labels on the left and x labels below, in the frame described under **The kit**; `margins` (`{ pad, yAxis, xAxis }`, on every chart with `axes`) moves the plot to where the chart's own margins put it.

```tsx
import { BarChartSkeleton } from '@frontendsupply/chart-skeletons';

<Skeleton loading={isPending}>
  {isPending ? <BarChartSkeleton width={320} height={180} bars={7} /> : <OrdersChart data={data} width={320} height={180} />}
</Skeleton>
```

The drawing is marked by the package (`data-skeleton="drawing"`), so the chart's own `svg` or `canvas` needs no mark: it replaces the drawing when the data arrives.

## The kit

Everything the package's charts are drawn with, exported from the same package, for every chart they don't cover.

- **`frame({ width, height }, { axes, legend, pad, yAxis, xAxis })`** lays the chart out: `pad` around everything (8), y labels on the left (`yAxis`, 32 wide), x labels below (`xAxis`, 20 tall), a legend on top or below (24) or on the right (96). It returns `{ plot, yLabels, xLabels, legend }`, each a box `{ x, y, w, h }`. Match `yAxis`, `xAxis` and `pad` to the chart's own margins.
- **Parts:** `Drawing` (the `<svg>`: `width`, `height`, then the parts as children), `Line`, `Guide` and `Hatch` (each a `d`), `Label` (`x`, `y`, `w`, and `h`, 6 by default).
- **Pieces:** `Grid` (`plot`, `rows`: dashed rows and a solid baseline), `AxisLabels` (`frame`, `rows`, `columns`: y labels at the gridlines, x labels spread below; `columns={0}` for none, when each bar labels itself), `Legend` (`box`, `count`, `side`, `mark`: `'line'` keys for lines, `'box'` for bars and slices; as many entries as fit).
- **Shapes,** path data on the pixel grid: `hLine(x1, x2, y)`, `vLine(x, y1, y2)`, `outline(box)` (a box's 1px outline, inside it, clockwise), `area(box)` (a box on whole pixels, for a hatch or a label), `polyline(points)`, `circle(cx, cy, r)`, `arc(cx, cy, r, a, b)` and `segment(cx, cy, outer, inner, a, b)` (angles in turns, 0 at the top, clockwise; `inner` 0 is a pie slice), `onCircle(cx, cy, r, turn)`, and `half(v)` / `whole(v)` to snap a coordinate of your own.
- **Stand-in data:** `wave(count, seed)` (values 0.1 to 0.92, wandering and rising a little), `noise(count, seed)` (0 to 1, no pattern), `shares(count)` (parts of a whole, largest first).
- **`LABEL`** (6): a label's height.

### A chart the package doesn't have

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

**Without React,** or for a one-off, write the `<svg>` by hand with the same vocabulary: `data-skeleton="drawing"`, `width`, `height`, `viewBox`, `fill="none" stroke="currentColor"`, then only `<path data-line|data-guide|data-fill|data-stripes d="…">`. A label is `<path data-fill fill="currentColor" stroke="none" d="M48 160H68V166H48Z"/>`; stripes take a pattern from `<defs>` (`fill="url(#stripes)"`, a 1×6 rect rotated 45°). Check it the same way.

## Responsive charts

A chart that fills its container (`ResponsiveContainer`, `ParentSize`, Chart.js's default) has no size until it's measured. Measure the box it fills and pass the numbers to both the drawing and the chart:

```tsx
function Sized({ className, children }: { className?: string; children: (size: Size) => React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState<Size | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current!;
    const update = () => setSize((was) => (was?.width === el.clientWidth && was.height === el.clientHeight ? was : { width: el.clientWidth, height: el.clientHeight }));
    update();
    const resize = new ResizeObserver(update);
    resize.observe(el);
    return () => resize.disconnect();
  }, []);
  // contain-size: the box is sized by its container, never by the chart in it, so it can shrink.
  return <div ref={ref} className={`contain-size ${className ?? ''}`}>{size && size.width > 0 && children(size)}</div>;
}

<Sized className="h-70">
  {(size) => (
    <Skeleton loading={isPending}>
      {isPending ? <AreaChartSkeleton {...size} points={30} /> : <RevenueChart data={data} {...size} />}
    </Skeleton>
  )}
</Sized>
```

Put the measuring box **outside** the `Skeleton`, so the drawing is there when the `Skeleton` first measures. Use the project's own measuring hook if it has one (`useResizeObserver`, `ParentSize`).

## Check it

1. **The markup:** `node <this skill's folder>/scripts/check-drawing.mjs drawing.svg` (or `-` for stdin) must end `check passed`, every count at 0. Get the markup from the running page (`document.querySelector('svg[data-skeleton="drawing"]').outerHTML`, through the browser tool) or from React (`renderToStaticMarkup(<CashFlowSkeleton width={560} height={240} />)` with the project's TypeScript runner). Check at the chart's size and at a phone's (about 343 wide).
2. **The size, in the page:** the drawing's `getBoundingClientRect()` is its `width` and `height` exactly (nothing in the page scales it).
3. **Look at it** loading, beside the loaded chart (a screenshot of each, or replay): the axes, the labels and the legend land where the chart's do; the marks are the chart's count; the lines trace in; nothing jumps when the chart arrives.

## Common failures

- **A plate over a chart.** A marked chart `svg` (or `canvas`) with no drawing is a striped plate: that's for pictures. A chart that loads gets its drawing.
- **The drawing scaled to fit** (`className="w-full h-auto"`, a `viewBox` of another size, `preserveAspectRatio="none"`): blurred, stretched lines. Measure and draw at the size.
- **Text in the drawing** (a `<text>`, a title, a value): it reads as content. A label is a bar.
- **Colors in the drawing** (`stroke="#ccc"`, a class): the `Skeleton` colors it with `--skeleton`; outside one, `--skeleton` colors it.
- **The wrong chart.** A line chart's drawing for a bar chart, a legend on the right for a chart that has it on top, 12 bars for a week: the handover jumps, and the drawing said something false. Back to the spec.
- **Everything striped.** Stripes for one kind of area; lines for the rest.
- **Fractional sizes** (`width={320.5}`): round the measured size down (`clientWidth` already is).
