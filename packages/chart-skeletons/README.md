# @frontendsupply/chart-skeletons

Loading-state drawings of common charts that fill the chart's box, with no measuring, for frontend.supply's [skeleton skill](https://github.com/frontendsupply/skills/tree/main/skills/skeleton).

```bash
pnpm add @frontendsupply/chart-skeletons
```

```tsx
import { BarChartSkeleton } from '@frontendsupply/chart-skeletons';

<Skeleton loading={isPending} className="h-45 w-full">
  {isPending ? <BarChartSkeleton width={320} height={180} bars={7} /> : <OrdersChart data={data} />}
</Skeleton>
```

Each chart takes `width` and `height` (its design size in pixels: the chart's height and usual width) and its counts, and renders an `<svg data-skeleton="drawing">` of the chart's structure (axes, gridlines, its marks, a bar for each label) that fills its box: give the box the chart's size with CSS. Lines stay 1px as it scales; round charts keep their shape. It's drawn in `--skeleton`, so it renders on the server like the rest of the page, and pulses inside the skill's `Skeleton`.

Presets, for the common charts: `LineChartSkeleton`, `AreaChartSkeleton`, `BarChartSkeleton`, `StackedBarChartSkeleton`, `HorizontalBarChartSkeleton`, `PieChartSkeleton`, `DonutChartSkeleton`, `ScatterChartSkeleton`, `RadarChartSkeleton`, `HeatmapSkeleton`, `CandlestickChartSkeleton`, `GaugeSkeleton`, `FunnelChartSkeleton`, `SparklineSkeleton`. The kit they're drawn with (`frame`, `Drawing`, `Line`, `Guide`, `Label`, `Hatch`, `Grid`, `AxisLabels`, `Legend` and the path helpers) is exported too: the skeleton skill draws any other chart with it, from its name, its code or a screenshot.

`pnpm test` builds the package, draws every chart at common sizes and options and runs the skill's drawing check on each.

MIT
