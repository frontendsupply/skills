import * as React from 'react';

/* -------------------------------------------------------------------------- */
/* The kit: what every chart skeleton is drawn with.                          */
/*                                                                            */
/* A drawing is an <svg data-skeleton="drawing"> drawn at the chart's design  */
/* size (its viewBox: its width and height, one unit per pixel there) that    */
/* fills its box, so it needs no measuring: give the box the chart's size and */
/* the drawing scales to it, its lines kept 1px. It's made of four parts,     */
/* every one a path:                                                          */
/*   Line     data-line     a 1px line: axes, a series, an outline.          */
/*   Guide    data-guide    a 1px dashed line: gridlines, a gauge's track.    */
/*   Label    data-fill     a filled bar standing for a short text.           */
/*   Hatch    data-stripes  a striped area: under a line, inside a slice.     */
/* All of it in --skeleton, so it renders on the server with the page; in a  */
/* Skeleton it pulses with the other skeletons.                               */
/* -------------------------------------------------------------------------- */

export type Box = { x: number; y: number; w: number; h: number };
export type Size = { width: number; height: number };

// Look: a label is a bar 6px tall (11px text); stripes are 6px apart; gridlines are dashed 2 on, 3 off.
export const LABEL = 6;
const STRIPES = 6;
const DASH = '2 3';

const r1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A 1px line's coordinate: on the half pixel, so the line covers one row of pixels exactly. */
export const half = (v: number) => Math.round(v - 0.5) + 0.5;
/** An area's edge: on the whole pixel. */
export const whole = (v: number) => Math.round(v);

/* Shapes: path data, rounded to a tenth of a pixel. ------------------------ */

/** A straight line through the points. */
export const polyline = (points: [number, number][]) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join('');
/** A horizontal 1px line. */
export const hLine = (x1: number, x2: number, y: number) => `M${whole(x1)} ${half(y)}H${whole(x2)}`;
/** A vertical 1px line. */
export const vLine = (x: number, y1: number, y2: number) => `M${half(x)} ${whole(y1)}V${whole(y2)}`;
/** A box's 1px outline, inside the box, clockwise from its top left. */
export const outline = ({ x, y, w, h }: Box) => {
  const [l, t, r, b] = [whole(x) + 0.5, whole(y) + 0.5, whole(x + w) - 0.5, whole(y + h) - 0.5];
  return `M${l} ${t}H${r}V${b}H${l}Z`;
};
/** A box's area, on whole pixels: for a label or a striped fill. */
export const area = ({ x, y, w, h }: Box) => {
  const [l, t, r, b] = [whole(x), whole(y), whole(x + w), whole(y + h)];
  return `M${l} ${t}H${r}V${b}H${l}Z`;
};
/** A circle, clockwise from its top. */
export const circle = (cx: number, cy: number, radius: number) =>
  `M${r1(cx)} ${r1(cy - radius)}A${r1(radius)} ${r1(radius)} 0 1 1 ${r1(cx)} ${r1(cy + radius)}A${r1(radius)} ${r1(radius)} 0 1 1 ${r1(cx)} ${r1(cy - radius)}Z`;
/** A point on a circle; angles in turns, 0 at the top, clockwise. */
export const onCircle = (cx: number, cy: number, radius: number, turn: number): [number, number] => [
  cx + radius * Math.sin(turn * 2 * Math.PI),
  cy - radius * Math.cos(turn * 2 * Math.PI),
];
/** A ring's segment (a pie slice when `inner` is 0), from turn `a` to turn `b`. */
export const segment = (cx: number, cy: number, outer: number, inner: number, a: number, b: number) => {
  const large = b - a > 0.5 ? 1 : 0;
  const [x1, y1] = onCircle(cx, cy, outer, a);
  const [x2, y2] = onCircle(cx, cy, outer, b);
  if (!inner) return `M${r1(cx)} ${r1(cy)}L${r1(x1)} ${r1(y1)}A${r1(outer)} ${r1(outer)} 0 ${large} 1 ${r1(x2)} ${r1(y2)}Z`;
  const [x3, y3] = onCircle(cx, cy, inner, b);
  const [x4, y4] = onCircle(cx, cy, inner, a);
  return `M${r1(x1)} ${r1(y1)}A${r1(outer)} ${r1(outer)} 0 ${large} 1 ${r1(x2)} ${r1(y2)}L${r1(x3)} ${r1(y3)}A${r1(inner)} ${r1(inner)} 0 ${large} 0 ${r1(x4)} ${r1(y4)}Z`;
};
/** An open arc, from turn `a` to turn `b`. */
export const arc = (cx: number, cy: number, radius: number, a: number, b: number) => {
  const [x1, y1] = onCircle(cx, cy, radius, a);
  const [x2, y2] = onCircle(cx, cy, radius, b);
  return `M${r1(x1)} ${r1(y1)}A${r1(radius)} ${r1(radius)} 0 ${b - a > 0.5 ? 1 : 0} 1 ${r1(x2)} ${r1(y2)}`;
};

/**
 * A smooth line through the points that never overshoots them (monotone in x: Recharts' and d3's `monotone`), for a
 * series drawn with `type="monotone"`.
 */
export function monotone(points: [number, number][]): string {
  if (points.length < 3) return polyline(points);
  const slope = points.slice(1).map(([x, y], i) => (y - points[i][1]) / (x - points[i][0] || 1));
  // Fritsch–Carlson tangents: 0 at a turn, a weighted mean of the slopes on either side elsewhere.
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === points.length - 1) return slope[i - 1];
    const [a, b] = [slope[i - 1], slope[i]];
    if (a * b <= 0) return 0;
    const [dx0, dx1] = [points[i][0] - points[i - 1][0], points[i + 1][0] - points[i][0]];
    return (3 * (dx0 + dx1)) / ((2 * dx1 + dx0) / a + (dx1 + 2 * dx0) / b);
  });
  return points
    .slice(1)
    .map(([x, y], i) => {
      const [x0, y0] = points[i];
      const third = (x - x0) / 3;
      return `C${r1(x0 + third)} ${r1(y0 + tangent[i] * third)} ${r1(x - third)} ${r1(y - tangent[i + 1] * third)} ${r1(x)} ${r1(y)}`;
    })
    .reduce((d, c) => d + c, `M${r1(points[0][0])} ${r1(points[0][1])}`);
}

/**
 * A sankey link: a band from one node's edge (`x1`, from `y1` to `y1end`) to another's (`x2`, `y2` to `y2end`), its
 * long sides curved. Its ends are on the half pixel, so they lie on the nodes' 1px outlines.
 */
export const band = (x1: number, y1: number, y1end: number, x2: number, y2: number, y2end: number) => {
  const [a, b] = [half(x1), half(x2)];
  const mid = r1((a + b) / 2);
  return `M${a} ${r1(y1)}C${mid} ${r1(y1)} ${mid} ${r1(y2)} ${b} ${r1(y2)}V${r1(y2end)}C${mid} ${r1(y2end)} ${mid} ${r1(y1end)} ${a} ${r1(y1end)}Z`;
};

/**
 * Tiles for a treemap: one box per value, in the order given, filling `box`, each as close to square as the values allow
 * (squarified, as Recharts and d3 lay them out).
 */
export function squarify(values: number[], box: Box): Box[] {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const areas = values.map((v) => (v / total) * box.w * box.h);
  const order = areas.map((_, i) => i).sort((a, b) => areas[b] - areas[a]);
  const tiles: Box[] = [];
  const sum = (row: number[]) => row.reduce((a, k) => a + areas[k], 0);
  // How far the row's worst tile is from square, laid along a side this long.
  const worst = (row: number[], side: number) => {
    const s = sum(row);
    return Math.max(...row.map((k) => Math.max((side * side * areas[k]) / (s * s), (s * s) / (side * side * areas[k]))));
  };
  const lay = (row: number[], r: Box): Box => {
    const s = sum(row);
    if (r.w >= r.h) {
      const w = s / r.h;
      row.reduce((y, k) => ((tiles[k] = { x: r.x, y, w, h: areas[k] / w }), y + areas[k] / w), r.y);
      return { x: r.x + w, y: r.y, w: r.w - w, h: r.h };
    }
    const h = s / r.w;
    row.reduce((x, k) => ((tiles[k] = { x, y: r.y, w: areas[k] / h, h }), x + areas[k] / h), r.x);
    return { x: r.x, y: r.y + h, w: r.w, h: r.h - h };
  };
  let rest = { ...box };
  let row: number[] = [];
  for (const k of order) {
    const side = Math.min(rest.w, rest.h);
    if (row.length && worst([...row, k], side) > worst(row, side)) {
      rest = lay(row, rest);
      row = [];
    }
    row.push(k);
  }
  if (row.length) lay(row, rest);
  return tiles;
}

/* Stand-in data: plausible, and the same on every render. ----------------- */

/** `count` values between 0.1 and 0.92, wandering and rising a little, like most charts over time. */
export function wave(count: number, seed = 0): number[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i + seed * 5.3;
    const rise = count > 1 ? (i / (count - 1) - 0.5) * 0.24 : 0;
    return clamp(0.5 + 0.17 * Math.sin(t * 0.85 + seed) + 0.1 * Math.sin(t * 0.33 + seed * 2.1) + rise, 0.1, 0.92);
  });
}

/** `count` values between 0 and 1 with no pattern: scatter, jitter. */
export function noise(count: number, seed = 0): number[] {
  return Array.from({ length: count }, (_, i) => {
    const v = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
    return v - Math.floor(v);
  });
}

/** `count` shares of a whole, largest first, adding up to 1. */
export function shares(count: number): number[] {
  const raw = Array.from({ length: count }, (_, i) => 1 / (i + 1.6));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / sum);
}

/* The frame: where the plot, the axis labels and the legend go. ------------ */

export type LegendSide = 'top' | 'right' | 'bottom' | false;
export type Frame = { plot: Box; yLabels?: Box; xLabels?: Box; legend?: Box };

/** Space around a chart: one number for every side, or each side its own (Recharts' `margin`). */
export type Pad = number | { top?: number; right?: number; bottom?: number; left?: number };

/**
 * Lays a chart out inside its size: y labels on the left (`yAxis`, 32px: Recharts' YAxis width), x labels below
 * (`xAxis`, 20px: its XAxis height), a legend above or below (24px, centered across the chart, as Recharts and
 * Chart.js put it) or on the right (96px), and `pad` around everything (8px; Recharts' default margin is 5).
 */
export function frame(
  { width, height }: Size,
  { axes = true, legend = false as LegendSide, pad = 8, yAxis = 32, xAxis = 20 }: { axes?: boolean; legend?: LegendSide; pad?: Pad; yAxis?: number; xAxis?: number } = {},
): Frame {
  const p = typeof pad === 'number' ? { top: pad, right: pad, bottom: pad, left: pad } : { top: 8, right: 8, bottom: 8, left: 8, ...pad };
  const left = p.left + (axes ? yAxis : 0);
  const right = width - p.right - (legend === 'right' ? 96 : 0);
  const top = p.top + (legend === 'top' ? 24 : 0);
  const bottom = height - p.bottom - (axes ? xAxis : 0) - (legend === 'bottom' ? 24 : 0);
  const plot = { x: left, y: top, w: Math.max(right - left, 1), h: Math.max(bottom - top, 1) };
  // A legend above or below sits in the middle of its 24px band, centered across the whole chart.
  const across = (y: number) => ({ x: p.left, y: y + (24 - LABEL - 2) / 2, w: width - p.left - p.right, h: LABEL + 2 });
  return {
    plot,
    // Labels only where there's room for them: a label and its 8px gap.
    yLabels: axes && yAxis >= 16 ? { x: p.left, y: top, w: yAxis - 8, h: plot.h } : undefined,
    xLabels: axes && xAxis >= 8 + LABEL ? { x: left, y: bottom + 8, w: plot.w, h: LABEL } : undefined,
    legend:
      legend === 'right'
        ? { x: right + 16, y: top, w: 96 - 16, h: plot.h }
        : legend === 'bottom'
          ? across(height - p.bottom - 24)
          : legend === 'top'
            ? across(p.top)
            : undefined,
  };
}

/* The parts. --------------------------------------------------------------- */

const Stripes = React.createContext('');

/** How a drawing fills a box of other proportions: stretched to it (charts on axes), or whole and centered (round ones). */
export type Fit = 'stretch' | 'contain';

/**
 * The drawing: an <svg> drawn at `width` × `height` that fills its box (as tall as the box, or, in a box with no height,
 * as tall as its proportions make it), its parts in --skeleton.
 */
export function Drawing({ width, height, fit = 'stretch', children, ...props }: Size & { fit?: Fit } & Omit<React.ComponentProps<'svg'>, 'width' | 'height'>) {
  // Its stripes' pattern id: from `id` when one is given (two drawings rendered by separate React roots, as with
  // renderToStaticMarkup, would otherwise share one), else React's.
  const auto = React.useId();
  const id = `stripes-${(props.id ?? auto).replace(/[^\w-]/g, '')}`;
  return (
    <svg
      data-skeleton="drawing"
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fit === 'contain' ? 'xMidYMid meet' : 'none'}
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden="true"
      {...props}
      style={{ color: 'var(--skeleton, #e5e5e5)', display: 'block', aspectRatio: `${width} / ${height}`, ...props.style }}
    >
      <defs>
        <pattern id={id} width={STRIPES} height={STRIPES} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={1} height={STRIPES} fill="currentColor" />
        </pattern>
      </defs>
      <Stripes.Provider value={id}>{children}</Stripes.Provider>
    </svg>
  );
}

type PathProps = { d: string };
// Lines stay 1px however the drawing scales, and end where they're drawn to (butt caps).
/** A 1px line: axes, a series, an outline. */
export const Line = ({ d }: PathProps) => <path data-line d={d} vectorEffect="non-scaling-stroke" />;
/** A 1px dashed line: gridlines, a track. */
export const Guide = ({ d }: PathProps) => <path data-guide d={d} strokeDasharray={DASH} vectorEffect="non-scaling-stroke" />;
/** A filled bar for a short text, `w` wide (and `LABEL` tall), its top left at x, y. */
export const Label = ({ x, y, w, h = LABEL }: { x: number; y: number; w: number; h?: number }) => (
  <path data-fill d={area({ x, y, w, h })} fill="currentColor" stroke="none" />
);
/** A striped area. */
export function Hatch({ d }: PathProps) {
  return <path data-stripes d={d} fill={`url(#${React.useContext(Stripes)})`} stroke="none" />;
}

/* Common pieces. ------------------------------------------------------------ */

/** Dashed gridlines across the plot (`rows` bands) and a solid baseline. */
export function Grid({ plot, rows = 4 }: { plot: Box; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <Guide key={i} d={hLine(plot.x, plot.x + plot.w, plot.y + (plot.h * i) / rows)} />
      ))}
      <Line d={hLine(plot.x, plot.x + plot.w, plot.y + plot.h - 1)} />
    </>
  );
}

/**
 * Y labels at each gridline, right-aligned to the plot; `columns` x labels under it, centered in equal bands (`at`
 * "band": bars, categories) or on points from the plot's left edge to its right (`at` "point": a line or an area's x
 * axis). `widths` sets the labels' widths, as measured: `y` (18, alternating with 14; the last, the 0, is 8) and `x` (20).
 */
export function AxisLabels({
  frame: f,
  rows = 4,
  columns = 6,
  at = 'band',
  widths = {},
}: {
  frame: Frame;
  rows?: number;
  columns?: number;
  at?: 'band' | 'point';
  widths?: { x?: number; y?: number };
}) {
  const { yLabels, xLabels, plot } = f;
  const xw = widths.x ?? 20;
  return (
    <>
      {yLabels &&
        Array.from({ length: rows + 1 }, (_, i) => {
          const w = i === rows ? 8 : (widths.y ?? 18) - (i % 2) * 4;
          return <Label key={`y${i}`} x={yLabels.x + yLabels.w - w} y={plot.y + (plot.h * i) / rows - LABEL / 2} w={w} />;
        })}
      {xLabels &&
        Array.from({ length: columns }, (_, i) => {
          const cx = at === 'point' ? plot.x + (columns > 1 ? (plot.w * i) / (columns - 1) : plot.w / 2) : plot.x + (plot.w * (i + 0.5)) / columns;
          // The end labels stay over the plot's ends rather than past them, as charts keep them.
          const x = Math.min(Math.max(cx - xw / 2, plot.x - xw / 2 + 4), plot.x + plot.w - xw / 2 - 4);
          return <Label key={`x${i}`} x={x} y={xLabels.y} w={xw} />;
        })}
    </>
  );
}

/** A legend: one key (a short line, or a small box) and one label per entry, as many as fit in `box`. */
export function Legend({ box, count, side, mark = 'line' }: { box: Box; count: number; side: Exclude<LegendSide, false>; mark?: 'line' | 'box' }) {
  // Down the side, 18px apart; across, centered, up to 88px apart and at least 56.
  const down = side === 'right';
  const step = down ? 18 : Math.max(Math.min(88, box.w / count), 56);
  const shown = Math.min(count, down ? Math.floor((box.h - LABEL) / step) + 1 : Math.floor((box.w + 8) / step));
  const room = down ? box.w - 18 : step - 26;
  const start = down ? box.x : box.x + Math.max((box.w - (shown * step - 8)) / 2, 0);
  const entries = Array.from({ length: shown }, (_, i) => {
    const [x, y] = down ? [box.x, box.y + i * step] : [start + i * step, box.y];
    return (
      <React.Fragment key={i}>
        {mark === 'line' ? <Line d={hLine(x, x + 12, y + LABEL / 2)} /> : <Line d={outline({ x, y: y - 1, w: 8, h: 8 })} />}
        <Label x={x + 18} y={y} w={Math.min(40 - (i % 2) * 10, room)} />
      </React.Fragment>
    );
  });
  return <>{entries}</>;
}
