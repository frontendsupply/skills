import * as React from 'react';

/* -------------------------------------------------------------------------- */
/* The kit: what every chart skeleton is drawn with.                          */
/*                                                                            */
/* A drawing is an <svg data-skeleton="drawing"> at the chart's exact size    */
/* (its viewBox is its width and height, one unit per pixel) made of four     */
/* parts, every one a path:                                                   */
/*   Line     data-line     a 1px line: axes, a series, an outline. Traces in.*/
/*   Guide    data-guide    a 1px dashed line: gridlines, a gauge's track.    */
/*   Label    data-fill     a filled bar standing for a short text.           */
/*   Hatch    data-stripes  a striped area: under a line, inside a slice.     */
/* Inside a Skeleton, the Skeleton draws these parts itself (with its colors, */
/* trace and shimmer); outside one, the drawing shows them in --skeleton.     */
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

/**
 * Lays a chart out inside its size: y labels on the left (`yAxis`, 32px), x labels below (`xAxis`, 20px), a legend
 * above or below (24px) or on the right (96px), and `pad` around everything (8px).
 */
export function frame(
  { width, height }: Size,
  { axes = true, legend = false as LegendSide, pad = 8, yAxis = 32, xAxis = 20 }: { axes?: boolean; legend?: LegendSide; pad?: number; yAxis?: number; xAxis?: number } = {},
): Frame {
  const left = pad + (axes ? yAxis : 0);
  const right = width - pad - (legend === 'right' ? 96 : 0);
  const top = pad + (legend === 'top' ? 24 : 0);
  const bottom = height - pad - (axes ? xAxis : 0) - (legend === 'bottom' ? 24 : 0);
  const plot = { x: left, y: top, w: Math.max(right - left, 1), h: Math.max(bottom - top, 1) };
  return {
    plot,
    // Labels only where there's room for them: a label and its 8px gap.
    yLabels: axes && yAxis >= 16 ? { x: pad, y: top, w: yAxis - 8, h: plot.h } : undefined,
    xLabels: axes && xAxis >= 8 + LABEL ? { x: left, y: bottom + 8, w: plot.w, h: LABEL } : undefined,
    legend:
      legend === 'right'
        ? { x: right + 16, y: top, w: 96 - 16, h: plot.h }
        : legend === 'bottom'
          ? { x: left, y: height - pad - LABEL - 2, w: plot.w, h: LABEL + 2 }
          : legend === 'top'
            ? { x: left, y: pad + 1, w: plot.w, h: LABEL + 2 }
            : undefined,
  };
}

/* The parts. --------------------------------------------------------------- */

const Stripes = React.createContext('');

/** The drawing: an <svg> at the chart's exact size, its parts in `--skeleton` when no Skeleton draws them. */
export function Drawing({ width, height, children, ...props }: Size & Omit<React.ComponentProps<'svg'>, 'width' | 'height'>) {
  const id = `stripes-${React.useId().replace(/[^\w-]/g, '')}`;
  return (
    <svg
      data-skeleton="drawing"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden="true"
      {...props}
      style={{ color: 'var(--skeleton, #e5e5e5)', display: 'block', ...props.style }}
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
/** A 1px line: axes, a series, an outline. */
export const Line = ({ d }: PathProps) => <path data-line d={d} strokeLinecap="square" />;
/** A 1px dashed line: gridlines, a track. */
export const Guide = ({ d }: PathProps) => <path data-guide d={d} strokeDasharray={DASH} />;
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

/** Y labels at each gridline, right-aligned to the plot; x labels spread under it. */
export function AxisLabels({ frame: f, rows = 4, columns = 6 }: { frame: Frame; rows?: number; columns?: number }) {
  const { yLabels, xLabels, plot } = f;
  return (
    <>
      {yLabels &&
        Array.from({ length: rows + 1 }, (_, i) => {
          const w = i === rows ? 8 : 18 - (i % 2) * 4;
          return <Label key={`y${i}`} x={yLabels.x + yLabels.w - w} y={plot.y + (plot.h * i) / rows - LABEL / 2} w={w} />;
        })}
      {xLabels &&
        Array.from({ length: columns }, (_, i) => {
          const w = 20;
          const cx = plot.x + (plot.w * (i + 0.5)) / columns;
          return <Label key={`x${i}`} x={cx - w / 2} y={xLabels.y} w={w} />;
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
