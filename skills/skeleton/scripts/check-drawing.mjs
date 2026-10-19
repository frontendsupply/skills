#!/usr/bin/env node
// Checks a chart's skeleton drawing: node check-drawing.mjs <drawing.svg | -> [more.svg …]
//
// A drawing is the markup of an <svg data-skeleton="drawing"> (from the browser, `el.outerHTML`; from React,
// renderToStaticMarkup). Each check prints its count of failures and where they are; the drawing passes when every
// count is 0:
//   size        a viewBox of whole numbers from 0 0 (the design size, one unit a pixel there), and the svg fills its
//               box (width and height 100%, with a preserveAspectRatio) or is exactly that size
//   parts       every element is a path marked as one part: data-line, data-guide, data-fill or data-stripes
//   colors      no fill, stroke, class or style on a part: the Skeleton (or --skeleton) colors it
//   scaling     every line and guide keeps 1px however the drawing scales (vector-effect="non-scaling-stroke")
//   bounds      every part inside the drawing, a line's whole stroke too
//   grid        every straight 1px line on the half pixel, every label's straight edge on the whole pixel: crisp
//               (stripes are exempt: their edges sit under the lines that bound them)
//   labels      a fill is a label, 4 to 12px tall; a larger area is striped
//   lines       at least one line: a drawing with nothing to trace says nothing
// Also usable as a module: import { checkDrawing } from './check-drawing.mjs'.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PARTS = ['line', 'guide', 'fill', 'stripes'];
const PAINT = /^(none|currentColor|url\(#[^)]+\))$/;
const E = 0.01;

const attrs = (source) => Object.fromEntries([...source.matchAll(/([\w:-]+)(?:\s*=\s*"([^"]*)")?/g)].map(([, k, v]) => [k, v ?? '']));

// The points a path passes through (arcs and curves sampled) and its straight segments.
function trace(d) {
  const t = d.match(/[a-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  const points = [];
  const straights = [];
  let i = 0;
  let cmd = '';
  let [x, y, sx, sy] = [0, 0, 0, 0];
  const n = () => parseFloat(t[i++]);
  const to = (nx, ny) => {
    straights.push([x, y, nx, ny]);
    [x, y] = [nx, ny];
    points.push([x, y]);
  };
  while (i < t.length) {
    if (/[a-z]/i.test(t[i])) cmd = t[i++];
    const rel = cmd !== cmd.toUpperCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M':
        [x, y] = [ox + n(), oy + n()];
        [sx, sy] = [x, y];
        points.push([x, y]);
        cmd = rel ? 'l' : 'L';
        break;
      case 'L':
        to(ox + n(), oy + n());
        break;
      case 'H':
        to(ox + n(), y);
        break;
      case 'V':
        to(x, oy + n());
        break;
      case 'Z':
        if (x !== sx || y !== sy) to(sx, sy);
        break;
      case 'A': {
        const [rx, ry, phi, large, sweep] = [n(), n(), n(), n(), n()];
        const [ex, ey] = [ox + n(), oy + n()];
        for (const p of arc(x, y, rx, ry, phi, large, sweep, ex, ey)) points.push(p);
        [x, y] = [ex, ey];
        break;
      }
      case 'C':
      case 'Q':
      case 'S':
      case 'T': {
        // Curves: the control points bound the curve, so they stand in for it.
        const count = { C: 6, Q: 4, S: 4, T: 2 }[cmd.toUpperCase()];
        const v = Array.from({ length: count }, () => n());
        for (let k = 0; k < count; k += 2) points.push([ox + v[k], oy + v[k + 1]]);
        [x, y] = [ox + v[count - 2], oy + v[count - 1]];
        break;
      }
      default:
        i++;
    }
  }
  return { points, straights };
}

// An elliptical arc's points, from its endpoints (SVG's own conversion to a center and angles).
function arc(x1, y1, rx, ry, phi, large, sweep, x2, y2) {
  if (!rx || !ry) return [[x2, y2]];
  const a = (phi * Math.PI) / 180;
  const [cos, sin] = [Math.cos(a), Math.sin(a)];
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const px = cos * dx + sin * dy;
  const py = -sin * dx + cos * dy;
  let [Rx, Ry] = [Math.abs(rx), Math.abs(ry)];
  const scale = (px * px) / (Rx * Rx) + (py * py) / (Ry * Ry);
  if (scale > 1) [Rx, Ry] = [Rx * Math.sqrt(scale), Ry * Math.sqrt(scale)];
  const num = Rx * Rx * Ry * Ry - Rx * Rx * py * py - Ry * Ry * px * px;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(num, 0) / (Rx * Rx * py * py + Ry * Ry * px * px));
  const cx_ = (k * Rx * py) / Ry;
  const cy_ = (-k * Ry * px) / Rx;
  const cx = cos * cx_ - sin * cy_ + (x1 + x2) / 2;
  const cy = sin * cx_ + cos * cy_ + (y1 + y2) / 2;
  const angle = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const start = angle(1, 0, (px - cx_) / Rx, (py - cy_) / Ry);
  let delta = angle((px - cx_) / Rx, (py - cy_) / Ry, (-px - cx_) / Rx, (-py - cy_) / Ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  return Array.from({ length: 33 }, (_, s) => {
    const th = start + (delta * s) / 32;
    return [cos * Rx * Math.cos(th) - sin * Ry * Math.sin(th) + cx, sin * Rx * Math.cos(th) + cos * Ry * Math.sin(th) + cy];
  });
}

const frac = (v) => Math.abs(v - Math.floor(v));
const near = (v, f) => Math.abs(frac(v) - f) < E || Math.abs(frac(v) - f) > 1 - E;
const short = (d) => (d.length > 48 ? `${d.slice(0, 48)}…` : d);

export function checkDrawing(markup) {
  const failures = { size: [], parts: [], colors: [], scaling: [], bounds: [], grid: [], labels: [], lines: [] };
  const counts = Object.fromEntries(PARTS.map((p) => [p, 0]));
  const tags = [...markup.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+(?:\s*=\s*"[^"]*")?)*)\s*(\/?)>/g)];
  const root = tags[0];
  if (!root || root[2] !== 'svg' || attrs(root[3])['data-skeleton'] !== 'drawing') {
    failures.size.push('the markup does not start with <svg data-skeleton="drawing">');
    return { failures, counts, width: 0, height: 0 };
  }
  const r = attrs(root[3]);
  const box = (r.viewBox ?? r.viewbox ?? '').trim().split(/[\s,]+/).map(Number);
  const [width, height] = [box[2], box[3]];
  if (box.length !== 4 || box[0] !== 0 || box[1] !== 0 || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0)
    failures.size.push(`viewBox "${r.viewBox ?? ''}" must be "0 0 width height" in whole numbers: the chart's design size`);
  const fills = r.width === '100%' && r.height === '100%';
  const exact = Number(r.width) === width && Number(r.height) === height;
  if (!fills && !exact) failures.size.push(`width "${r.width}" and height "${r.height}": "100%" (the drawing fills its box) or the viewBox's own size`);
  if (fills && !/^(none|xMidYMid meet)$/.test(r.preserveAspectRatio ?? r.preserveaspectratio ?? ''))
    failures.size.push('a drawing that fills its box needs preserveAspectRatio: "none" (stretched) or "xMidYMid meet" (whole)');
  if (r['stroke-width'] && Number(r['stroke-width']) !== 1) failures.size.push(`stroke-width ${r['stroke-width']}: lines are 1px`);

  let defs = 0;
  let index = 0;
  for (const [, close, tag, source, self] of tags.slice(1)) {
    if (close) {
      if (tag === 'defs') defs--;
      continue;
    }
    if (tag === 'defs' && !self) defs++;
    if (defs || tag === 'defs') continue;
    if (tag === 'svg') {
      failures.parts.push('a nested <svg>: one drawing, one svg');
      continue;
    }
    const a = attrs(source);
    const kinds = PARTS.filter((p) => `data-${p}` in a);
    const at = `part ${++index}`;
    if (tag !== 'path' || kinds.length !== 1) {
      failures.parts.push(`${at}: <${tag}${kinds.length ? ` data-${kinds.join(' data-')}` : ''}> is not one part: a path with data-line, data-guide, data-fill or data-stripes`);
      continue;
    }
    const kind = kinds[0];
    counts[kind]++;
    for (const k of ['fill', 'stroke']) if (k in a && !PAINT.test(a[k])) failures.colors.push(`${at} (${kind}): ${k}="${a[k]}"`);
    for (const k of ['class', 'style', 'transform', 'opacity']) if (k in a) failures.colors.push(`${at} (${kind}): ${k}="${a[k]}": the Skeleton draws it`);
    if (a['stroke-width'] && Number(a['stroke-width']) !== 1) failures.colors.push(`${at} (${kind}): stroke-width ${a['stroke-width']}: lines are 1px`);
    if ((kind === 'line' || kind === 'guide') && a['vector-effect'] !== 'non-scaling-stroke')
      failures.scaling.push(`${at} (${kind}): no vector-effect="non-scaling-stroke", so it thickens or thins when the drawing scales`);
    const { points, straights } = trace(a.d ?? '');
    if (!points.length) {
      failures.parts.push(`${at} (${kind}): no path data`);
      continue;
    }
    // A stroke reaches half a pixel past its path.
    const inset = kind === 'line' || kind === 'guide' ? 0.5 : 0;
    const out = points.find(([x, y]) => x < inset - E || y < inset - E || x > width - inset + E || y > height - inset + E);
    if (out) failures.bounds.push(`${at} (${kind}) reaches ${out.map((v) => Math.round(v * 10) / 10).join(', ')}, outside 0 0 ${width} ${height}: ${short(a.d)}`);
    const f = inset ? 0.5 : 0;
    const off = kind !== 'stripes' && straights.find(([x1, y1, x2, y2]) => (y1 === y2 && x1 !== x2 && !near(y1, f)) || (x1 === x2 && y1 !== y2 && !near(x1, f)));
    if (off) {
      const [x1, y1, , y2] = off;
      const where = y1 === y2 ? `y ${y1}` : `x ${x1}`;
      failures.grid.push(`${at} (${kind}): a straight edge at ${where}, not on the ${inset ? 'half' : 'whole'} pixel: ${short(a.d)}`);
    }
    if (kind === 'fill') {
      const ys = points.map(([, y]) => y);
      const tall = Math.max(...ys) - Math.min(...ys);
      if (tall < 4 - E || tall > 12 + E) failures.labels.push(`${at}: a fill ${Math.round(tall * 10) / 10}px tall: a label is 4 to 12px; stripe an area (data-stripes) instead`);
    }
  }
  if (!counts.line) failures.lines.push('no data-line: draw the chart’s axes and marks as lines');
  return { failures, counts, width, height };
}

const NAMES = {
  size: 'size and viewBox',
  parts: 'not in the vocabulary',
  colors: 'colored or styled',
  scaling: 'lines that scale',
  bounds: 'out of bounds',
  grid: 'off the pixel grid',
  labels: 'labels too tall or short',
  lines: 'missing lines',
};

export function report(name, { failures, counts, width, height }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const lines = [`${name}  ${width}×${height}, ${total} parts (${counts.line} lines, ${counts.guide} guides, ${counts.fill} labels, ${counts.stripes} striped)`];
  for (const [key, list] of Object.entries(failures)) {
    lines.push(`  ${NAMES[key]}: ${list.length}`);
    for (const item of list.slice(0, 5)) lines.push(`    - ${item}`);
    if (list.length > 5) lines.push(`    - and ${list.length - 5} more`);
  }
  const passed = Object.values(failures).every((list) => !list.length);
  lines.push(passed ? '  check passed' : '  check failed');
  return { text: lines.join('\n'), passed };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: node check-drawing.mjs <drawing.svg | -> [more.svg …]');
    process.exit(2);
  }
  let ok = true;
  for (const file of files) {
    const markup = readFileSync(file === '-' ? 0 : file, 'utf8');
    const { text, passed } = report(file === '-' ? 'stdin' : file, checkDrawing(markup));
    console.log(text);
    ok &&= passed;
  }
  process.exit(ok ? 0 : 1);
}
