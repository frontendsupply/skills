# @frontendsupply/chart-skeletons

Loading-state drawings of common charts, at a chart's exact size, for frontend.supply's [skeleton skill](https://github.com/frontendsupply/skills/tree/main/skills/skeleton).

```bash
pnpm add @frontendsupply/chart-skeletons
```

```tsx
import { BarChartSkeleton } from '@frontendsupply/chart-skeletons';

<Skeleton loading={isPending}>
  {isPending ? <BarChartSkeleton width={320} height={180} bars={7} /> : <OrdersChart data={data} />}
</Skeleton>
```

Each chart takes `width` and `height` (the chart's size in pixels) and its counts, and renders an `<svg data-skeleton="drawing">` of the chart's structure: axes, gridlines, its marks, a bar for each label. Inside the skill's `Skeleton` its lines trace in; on its own it's drawn in `--skeleton`.

Charts: `LineChartSkeleton`, `AreaChartSkeleton`, `BarChartSkeleton`, `StackedBarChartSkeleton`, `HorizontalBarChartSkeleton`, `PieChartSkeleton`, `DonutChartSkeleton`, `ScatterChartSkeleton`, `RadarChartSkeleton`, `HeatmapSkeleton`, `CandlestickChartSkeleton`, `GaugeSkeleton`, `FunnelChartSkeleton`, `SparklineSkeleton`. The kit they're drawn with (`frame`, `Drawing`, `Line`, `Guide`, `Label`, `Hatch`, `Grid`, `AxisLabels`, `Legend` and the path helpers) is exported for every other chart.

`pnpm test` builds the package, draws every chart at common sizes and options and runs the skill's drawing check on each.

MIT
