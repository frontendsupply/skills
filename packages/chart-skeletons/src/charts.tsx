import * as React from 'react';
import {
  AxisLabels,
  Drawing,
  Grid,
  Guide,
  Hatch,
  LABEL,
  Label,
  Legend,
  Line,
  arc,
  area,
  circle,
  frame,
  half,
  hLine,
  monotone,
  noise,
  onCircle,
  outline,
  polyline,
  segment,
  shares,
  vLine,
  wave,
  whole,
  type Box,
  type LegendSide,
  type Pad,
  type Size,
} from './kit.js';

// The chart skeletons. Each is drawn at the chart's design size from the kit's parts, fills its box, in the chart's own structure: its
// axes and gridlines, its marks (as many as the chart will have), its labels and legend. The data is a stand-in: a
// plausible shape, the same on every render.

type Svg = Omit<React.ComponentProps<'svg'>, 'width' | 'height' | 'points'>;
type Axes = {
  /** Axis labels and gridlines (true). */
  axes?: boolean;
  /** Where the legend goes (none). */
  legend?: LegendSide;
  /** The chart's own margins, so the plot lands where the chart's does: pad (8, or each side), yAxis (32), xAxis (20). */
  margins?: { pad?: Pad; yAxis?: number; xAxis?: number };
};

type Curved = {
  /** How the line runs through its points: straight (linear), or smooth as Recharts' type="monotone" (linear). */
  curve?: 'linear' | 'monotone';
};
const through = (curve: Curved['curve'], points: [number, number][]) => (curve === 'monotone' ? monotone(points) : polyline(points));

// A series' point i of count, at value v (0 to 1) in the plot; on the half pixel up and down, so a flat run is crisp.
const xy = (plot: Box, i: number, count: number, v: number): [number, number] => [
  plot.x + (count > 1 ? (plot.w * i) / (count - 1) : plot.w / 2),
  half(plot.y + plot.h - 1 - v * (plot.h - 2)),
];

/* Line, area, sparkline ---------------------------------------------------- */

export type LineChartProps = Size &
  Axes &
  Curved &
  Svg & { /** Lines (1). */ series?: number; /** Points per line (12). */ points?: number; /** X labels, under points (6). */ labels?: number };

export function LineChartSkeleton({ width, height, series = 1, points = 12, labels = 6, curve, axes = true, legend = false, margins, ...props }: LineChartProps) {
  const f = frame({ width, height }, { axes, legend, ...margins });
  return (
    <Drawing width={width} height={height} {...props}>
      {axes && <Grid plot={f.plot} />}
      {axes && <AxisLabels frame={f} columns={labels} at="point" />}
      {Array.from({ length: series }, (_, s) => (
        <Line key={s} d={through(curve, wave(points, s).map((v, i) => xy(f.plot, i, points, v * (1 - s * 0.18))))} />
      ))}
      {f.legend && legend && <Legend box={f.legend} count={series} side={legend} />}
    </Drawing>
  );
}

export type AreaChartProps = LineChartProps & {
  /** Series stacked on each other (Recharts' stackId) rather than overlapping (false). */
  stacked?: boolean;
};

export function AreaChartSkeleton({ width, height, series = 1, points = 12, labels = 6, curve, stacked = false, axes = true, legend = false, margins, ...props }: AreaChartProps) {
  const f = frame({ width, height }, { axes, legend, ...margins });
  const base = f.plot.y + f.plot.h - 1;
  // Each series' values: on its own, or stacked, each layer a share of the height, the top of the stack under 0.92.
  const layers = Array.from({ length: series }, (_, s) => wave(points, s).map((v) => (stacked ? v / series : v * (1 - s * 0.22))));
  const tops = layers.map((layer, s) => layer.map((v, i) => (stacked ? layers.slice(0, s + 1).reduce((sum, l) => sum + l[i], 0) : v)));
  return (
    <Drawing width={width} height={height} {...props}>
      {axes && <Grid plot={f.plot} />}
      {axes && <AxisLabels frame={f} columns={labels} at="point" />}
      {tops.map((top, s) => {
        const line = top.map((v, i) => xy(f.plot, i, points, v));
        const d = through(curve, line);
        return (
          <React.Fragment key={s}>
            {/* Stripes under the first series: the bottom of the stack, or the one in front. */}
            {s === 0 && <Hatch d={`${d}L${line[line.length - 1][0]} ${base}L${line[0][0]} ${base}Z`} />}
            <Line d={d} />
          </React.Fragment>
        );
      })}
      {f.legend && legend && <Legend box={f.legend} count={series} side={legend} />}
    </Drawing>
  );
}

export type SparklineProps = Size & Curved & Svg & { /** Points (16). */ points?: number; /** A dot on the last point (true). */ dot?: boolean };

export function SparklineSkeleton({ width, height, points = 16, dot = true, curve, ...props }: SparklineProps) {
  const plot = { x: 2, y: 3, w: width - (dot ? 7 : 4), h: height - 6 };
  const line = wave(points, 2).map((v, i) => xy(plot, i, points, v));
  const [lx, ly] = line[line.length - 1];
  return (
    <Drawing width={width} height={height} {...props}>
      <Line d={through(curve, line)} />
      {dot && <Line d={circle(lx, ly, 2.5)} />}
    </Drawing>
  );
}

/* Bars ----------------------------------------------------------------------- */

export type BarChartProps = Size & Axes & Svg & { /** Bars (8). */ bars?: number };

export function BarChartSkeleton({ width, height, bars = 8, axes = true, legend = false, margins, ...props }: BarChartProps) {
  const f = frame({ width, height }, { axes, legend, ...margins });
  const step = f.plot.w / bars;
  const w = Math.max(Math.round(step * 0.56), 2);
  return (
    <Drawing width={width} height={height} {...props}>
      {axes && <Grid plot={f.plot} />}
      {axes && <AxisLabels frame={f} columns={0} />}
      {wave(bars, 1).map((v, i) => {
        const h = Math.max(Math.round(v * (f.plot.h - 2)), 4);
        const x = f.plot.x + step * i + (step - w) / 2;
        return (
          <React.Fragment key={i}>
            <Line d={outline({ x, y: f.plot.y + f.plot.h - h, w, h })} />
            {f.xLabels && <Label x={x + w / 2 - Math.min(w, 16) / 2} y={f.xLabels.y} w={Math.min(w, 16)} />}
          </React.Fragment>
        );
      })}
      {f.legend && legend && <Legend box={f.legend} count={1} side={legend} mark="box" />}
    </Drawing>
  );
}

export type HorizontalBarChartProps = Size & Svg & { /** Bars (6). */ bars?: number; /** Category labels on the left (true). */ labels?: boolean };

export function HorizontalBarChartSkeleton({ width, height, bars = 6, labels = true, ...props }: HorizontalBarChartProps) {
  const pad = 8;
  const left = pad + (labels ? 64 : 0);
  const plot = { x: left, y: pad, w: width - left - pad - 32, h: height - pad * 2 };
  const step = plot.h / bars;
  const h = Math.max(Math.round(step * 0.56), 2);
  return (
    <Drawing width={width} height={height} {...props}>
      <Line d={vLine(plot.x, plot.y, plot.y + plot.h)} />
      {wave(bars, 3)
        .sort((a, b) => b - a)
        .map((v, i) => {
          const y = plot.y + step * i + (step - h) / 2;
          const w = Math.max(Math.round(v * plot.w), 4);
          return (
            <React.Fragment key={i}>
              {labels && <Label x={left - 8 - (48 - (i % 3) * 8)} y={y + h / 2 - LABEL / 2} w={48 - (i % 3) * 8} />}
              <Line d={outline({ x: plot.x, y, w, h })} />
              <Label x={plot.x + w + 6} y={y + h / 2 - LABEL / 2} w={16} />
            </React.Fragment>
          );
        })}
    </Drawing>
  );
}

export type StackedBarChartProps = BarChartProps & { /** Parts per bar (3). */ stacks?: number };

export function StackedBarChartSkeleton({ width, height, bars = 8, stacks = 3, axes = true, legend = false, margins, ...props }: StackedBarChartProps) {
  const f = frame({ width, height }, { axes, legend, ...margins });
  const step = f.plot.w / bars;
  const w = Math.max(Math.round(step * 0.56), 2);
  const parts = Array.from({ length: stacks }, (_, s) => wave(bars, s + 4));
  const heights = wave(bars, 1);
  return (
    <Drawing width={width} height={height} {...props}>
      {axes && <Grid plot={f.plot} />}
      {axes && <AxisLabels frame={f} columns={0} />}
      {Array.from({ length: bars }, (_, i) => {
        const x = f.plot.x + step * i + (step - w) / 2;
        const total = parts.reduce((sum, p) => sum + p[i], 0);
        const stack = Math.max(Math.round((0.35 + 0.6 * heights[i]) * (f.plot.h - 2)), stacks * 4);
        let top = f.plot.y + f.plot.h;
        return (
          <React.Fragment key={i}>
            {parts.map((p, s) => {
              const h = s === stacks - 1 ? top - (f.plot.y + f.plot.h - stack) : Math.max(Math.round((p[i] / total) * stack), 3);
              top -= h;
              const box = { x, y: top, w, h };
              return (
                <React.Fragment key={s}>
                  {s === 0 && <Hatch d={area(box)} />}
                  <Line d={outline(box)} />
                </React.Fragment>
              );
            })}
            {f.xLabels && <Label x={x + w / 2 - Math.min(w, 16) / 2} y={f.xLabels.y} w={Math.min(w, 16)} />}
          </React.Fragment>
        );
      })}
      {f.legend && legend && <Legend box={f.legend} count={stacks} side={legend} mark="box" />}
    </Drawing>
  );
}

/* Shares: pie, donut, funnel -------------------------------------------------- */

export type PieChartProps = Size & Svg & { /** Slices (4). */ slices?: number; /** Where the legend goes (right). */ legend?: LegendSide };

function shareLayout({ width, height }: Size, legend: LegendSide) {
  const pad = 8;
  const across = legend === 'top' || legend === 'bottom';
  const w = width - pad * 2 - (legend === 'right' ? 104 : 0);
  const h = height - pad * 2 - (across ? 24 : 0);
  const r = Math.max(Math.floor(Math.min(w, h) / 2), 8);
  // The center on the half pixel, so a slice's straight edge at the top or side is a crisp 1px line.
  const cx = half(pad + w / 2);
  const cy = half(pad + (legend === 'top' ? 24 : 0) + h / 2);
  const box =
    legend === 'right'
      ? { x: width - pad - 88, y: cy - 30, w: 88, h: 60 }
      : across
        ? { x: pad + 4, y: legend === 'top' ? pad + 1 : height - pad - LABEL - 1, w: width - pad * 2 - 8, h: LABEL + 2 }
        : undefined;
  return { cx, cy, r, box };
}

export function PieChartSkeleton({ width, height, slices = 4, legend = 'right', ...props }: PieChartProps) {
  const { cx, cy, r, box } = shareLayout({ width, height }, legend);
  let at = 0;
  return (
    <Drawing width={width} height={height} fit="contain" {...props}>
      {shares(slices).map((share, i) => {
        const d = segment(cx, cy, r - 0.5, 0, at, at + share);
        at += share;
        return (
          <React.Fragment key={i}>
            {i === 0 && <Hatch d={d} />}
            <Line d={d} />
          </React.Fragment>
        );
      })}
      {box && legend && <Legend box={box} count={Math.min(slices, 4)} side={legend} mark="box" />}
    </Drawing>
  );
}

export type DonutChartProps = PieChartProps;

export function DonutChartSkeleton({ width, height, slices = 4, legend = 'right', ...props }: DonutChartProps) {
  const { cx, cy, r, box } = shareLayout({ width, height }, legend);
  const inner = Math.round(r * 0.64);
  const gap = 0.006;
  let at = 0;
  return (
    <Drawing width={width} height={height} fit="contain" {...props}>
      {shares(slices).map((share, i) => {
        const d = segment(cx, cy, r - 0.5, inner, at + gap, at + share - gap);
        at += share;
        return (
          <React.Fragment key={i}>
            {i === 0 && <Hatch d={d} />}
            <Line d={d} />
          </React.Fragment>
        );
      })}
      <Label x={cx - 16} y={cy - LABEL - 2} w={32} h={LABEL + 2} />
      <Label x={cx - 12} y={cy + 4} w={24} />
      {box && legend && <Legend box={box} count={Math.min(slices, 4)} side={legend} mark="box" />}
    </Drawing>
  );
}

export type FunnelChartProps = Size & Svg & { /** Stages (5). */ stages?: number };

export function FunnelChartSkeleton({ width, height, stages = 5, ...props }: FunnelChartProps) {
  const pad = 8;
  const plotW = width - pad * 2 - 64;
  const step = (height - pad * 2) / stages;
  const cx = pad + plotW / 2;
  const widths = Array.from({ length: stages + 1 }, (_, i) => plotW * (1 - (i / stages) * 0.72));
  return (
    <Drawing width={width} height={height} {...props}>
      {Array.from({ length: stages }, (_, i) => {
        const y1 = whole(pad + step * i) + 0.5;
        const y2 = whole(pad + step * (i + 1)) - 1.5;
        const [a, b] = [widths[i] / 2, widths[i + 1] / 2];
        const d = polyline([[cx - a, y1], [cx + a, y1], [cx + b, y2], [cx - b, y2]]) + 'Z';
        return (
          <React.Fragment key={i}>
            {i === 0 && <Hatch d={d} />}
            <Line d={d} />
            <Label x={pad + plotW + 12} y={(y1 + y2) / 2 - LABEL / 2} w={40 - (i % 2) * 12} />
          </React.Fragment>
        );
      })}
    </Drawing>
  );
}

/* Points, webs, grids --------------------------------------------------------- */

export type ScatterChartProps = Size & Axes & Svg & { /** Points (24). */ points?: number };

export function ScatterChartSkeleton({ width, height, points = 24, axes = true, legend = false, margins, ...props }: ScatterChartProps) {
  const f = frame({ width, height }, { axes, legend, ...margins });
  // A loose rising cloud: spread along x, scattered around a rising trend.
  const xs = noise(points, 1);
  const ys = noise(points, 2);
  return (
    <Drawing width={width} height={height} {...props}>
      {axes && <Grid plot={f.plot} />}
      {axes && <AxisLabels frame={f} />}
      {axes && <Line d={vLine(f.plot.x, f.plot.y, f.plot.y + f.plot.h)} />}
      {xs.map((x, i) => {
        const px = f.plot.x + 6 + ((i + x) / points) * (f.plot.w - 12);
        const py = f.plot.y + f.plot.h - 6 - (0.12 + 0.5 * (i / points) + ys[i] * 0.3) * (f.plot.h - 12);
        return <Line key={i} d={circle(px, py, 3)} />;
      })}
      {f.legend && legend && <Legend box={f.legend} count={1} side={legend} mark="box" />}
    </Drawing>
  );
}

export type RadarChartProps = Size & Svg & { /** Spokes (6). */ spokes?: number; /** Rings (3). */ rings?: number };

export function RadarChartSkeleton({ width, height, spokes = 6, rings = 3, ...props }: RadarChartProps) {
  const cx = half(width / 2);
  const cy = half(height / 2);
  const r = Math.max(Math.min(width, height) / 2 - 22, 8);
  // Corners on the half pixel, so an edge that runs straight across or down is a crisp 1px line.
  const corner = (k: number, i: number): [number, number] => onCircle(cx, cy, r * k, i / spokes).map(half) as [number, number];
  const ring = (k: number) => polyline(Array.from({ length: spokes }, (_, i) => corner(k, i))) + 'Z';
  const shape = polyline(wave(spokes, 5).map((v, i) => corner(0.35 + 0.6 * v, i))) + 'Z';
  return (
    <Drawing width={width} height={height} fit="contain" {...props}>
      {Array.from({ length: rings }, (_, k) => (
        <Guide key={k} d={ring((k + 1) / rings)} />
      ))}
      {Array.from({ length: spokes }, (_, i) => (
        <Guide key={`s${i}`} d={polyline([[cx, cy], corner(1, i)])} />
      ))}
      <Hatch d={shape} />
      <Line d={shape} />
      {Array.from({ length: spokes }, (_, i) => {
        const [x, y] = onCircle(cx, cy, r + 13, i / spokes);
        return <Label key={`l${i}`} x={x - 10} y={y - LABEL / 2} w={20} />;
      })}
    </Drawing>
  );
}

export type HeatmapProps = Size & Svg & { /** Rows (5). */ rows?: number; /** Columns (12). */ columns?: number };

export function HeatmapSkeleton({ width, height, rows = 5, columns = 12, ...props }: HeatmapProps) {
  const pad = 8;
  const left = pad + 32;
  const bottom = height - pad - 16;
  const cw = (width - left - pad) / columns;
  const ch = (bottom - pad) / rows;
  return (
    <Drawing width={width} height={height} {...props}>
      {Array.from({ length: rows }, (_, r) => (
        <React.Fragment key={r}>
          <Label x={pad} y={pad + ch * r + ch / 2 - LABEL / 2} w={20} />
          {wave(columns, r + 1).map((v, c) => {
            const box = { x: left + cw * c, y: pad + ch * r, w: cw - 2, h: ch - 2 };
            return (
              <React.Fragment key={c}>
                {v > 0.58 && <Hatch d={area(box)} />}
                <Line d={outline(box)} />
              </React.Fragment>
            );
          })}
        </React.Fragment>
      ))}
      {Array.from({ length: Math.ceil(columns / 2) }, (_, c) => (
        <Label key={`c${c}`} x={left + cw * c * 2 + cw / 2 - 8} y={bottom + 6} w={16} />
      ))}
    </Drawing>
  );
}

/* Finance, gauges ----------------------------------------------------------- */

export type CandlestickChartProps = Size & Axes & Svg & { /** Candles (16). */ candles?: number };

export function CandlestickChartSkeleton({ width, height, candles = 16, axes = true, margins, ...props }: CandlestickChartProps) {
  const f = frame({ width, height }, { axes, ...margins });
  const step = f.plot.w / candles;
  const w = Math.max(Math.round(step * 0.5), 3);
  // Closing prices stretched over the plot, so the candles have bodies worth seeing.
  const jitter = noise(candles + 1, 4);
  const raw = wave(candles + 1, 3).map((v, i) => v + (jitter[i] - 0.5) * 0.2);
  const [lo, hi] = [Math.min(...raw), Math.max(...raw)];
  const close = raw.map((v) => 0.08 + ((v - lo) / (hi - lo || 1)) * 0.84);
  return (
    <Drawing width={width} height={height} {...props}>
      {axes && <Grid plot={f.plot} />}
      {axes && <AxisLabels frame={f} />}
      {Array.from({ length: candles }, (_, i) => {
        const [open, shut] = [close[i], close[i + 1]];
        const top = f.plot.y + (1 - Math.max(open, shut)) * (f.plot.h - 8) + 4;
        const bottom = f.plot.y + (1 - Math.min(open, shut)) * (f.plot.h - 8) + 4;
        const x = f.plot.x + step * i + (step - w) / 2;
        const cx = whole(x) + Math.floor(w / 2);
        const body = { x, y: top, w, h: Math.max(bottom - top, 3) };
        return (
          <React.Fragment key={i}>
            <Line d={vLine(cx, top - 4 - (i % 3) * 2, top)} />
            <Line d={vLine(cx, top + body.h, top + body.h + 3 + (i % 2) * 3)} />
            {shut < open && <Hatch d={area(body)} />}
            <Line d={outline(body)} />
          </React.Fragment>
        );
      })}
    </Drawing>
  );
}

export type GaugeProps = Size & Svg & { /** How full the gauge shows (0.62). */ value?: number };

export function GaugeSkeleton({ width, height, value = 0.62, ...props }: GaugeProps) {
  const r = Math.max(Math.min(width / 2 - 8, height - 32), 12);
  const cx = half(width / 2);
  const cy = half(8 + r);
  const band = Math.max(Math.round(r * 0.22), 6);
  const start = -0.25;
  return (
    <Drawing width={width} height={height} fit="contain" {...props}>
      <Guide d={arc(cx, cy, r - 0.5, start, 0.25)} />
      <Guide d={arc(cx, cy, r - band + 0.5, start, 0.25)} />
      <Hatch d={segment(cx, cy, r - 0.5, r - band + 0.5, start, start + value * 0.5)} />
      <Line d={segment(cx, cy, r - 0.5, r - band + 0.5, start, start + value * 0.5)} />
      <Label x={cx - 20} y={cy - LABEL - 6} w={40} h={LABEL + 4} />
      <Label x={cx - r} y={cy + 6} w={12} />
      <Label x={cx + r - 12} y={cy + 6} w={12} />
      <Line d={hLine(cx - r, cx - r + band, half(cy))} />
    </Drawing>
  );
}
