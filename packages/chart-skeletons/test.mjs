// Every drawing, at common sizes and options, through the skeleton skill's drawing check: pnpm test (it builds first,
// and checks the build: what's published).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { checkDrawing, report } from '../../skills/skeleton/scripts/check-drawing.mjs';
import * as pkg from './dist/index.js';

const charts = Object.fromEntries(Object.entries(pkg).filter(([name]) => name.endsWith('Skeleton')));
const sizes = [[320, 180], [480, 240], [256, 160], [640, 320], [343, 200], [181, 121]];
const axes = [{}, { legend: 'top' }, { legend: 'bottom' }, { legend: 'right' }, { axes: false }, { margins: { pad: 12, yAxis: 48, xAxis: 24 } }];
const variants = {
  LineChartSkeleton: [...axes, { series: 3, legend: 'bottom' }, { points: 40 }, { curve: 'monotone', points: 30, labels: 7 }],
  AreaChartSkeleton: [...axes, { series: 2, legend: 'right' }, { points: 40 }, { series: 2, stacked: true, curve: 'monotone', legend: 'top', margins: { pad: { top: 5, right: 30, bottom: 5, left: 5 }, yAxis: 48, xAxis: 30 } }],
  BarChartSkeleton: [...axes, { bars: 3 }, { bars: 24 }],
  StackedBarChartSkeleton: [...axes, { stacks: 5, legend: 'right' }, { bars: 16 }],
  HorizontalBarChartSkeleton: [{}, { bars: 10 }, { bars: 2, labels: false }],
  PieChartSkeleton: [{}, { legend: 'top' }, { legend: 'bottom' }, { legend: false, slices: 7 }],
  DonutChartSkeleton: [{}, { legend: 'top' }, { legend: 'bottom' }, { legend: false, slices: 2 }],
  ScatterChartSkeleton: [...axes, { points: 80 }],
  RadarChartSkeleton: [{}, { spokes: 5, rings: 4 }, { spokes: 8, rings: 2 }],
  HeatmapSkeleton: [{}, { rows: 7, columns: 24 }, { rows: 2, columns: 4 }],
  CandlestickChartSkeleton: [{}, { candles: 40 }, { axes: false }, { margins: { yAxis: 0 } }],
  GaugeSkeleton: [{}, { value: 0.05 }, { value: 1 }],
  FunnelChartSkeleton: [{}, { stages: 3 }, { stages: 7 }],
  SparklineSkeleton: [{}, { dot: false }, { points: 40 }, { curve: 'monotone' }],
};
const small = [[96, 32], [160, 40], [121, 25]];

let failed = 0;
let checked = 0;
for (const [name, Chart] of Object.entries(charts)) {
  if (!variants[name]) throw new Error(`${name} has no variants in test.mjs`);
  for (const [width, height] of name === 'SparklineSkeleton' ? small : sizes) {
    for (const props of variants[name]) {
      const markup = renderToStaticMarkup(createElement(Chart, { width, height, ...props }));
      const { text, passed } = report(`${name} ${width}×${height} ${JSON.stringify(props)}`, checkDrawing(markup));
      checked++;
      if (!passed) {
        failed++;
        console.log(text);
      }
    }
  }
}
// The kit's layout helpers, drawn as an agent would compose them: a treemap (squarify) and a sankey (band).
const { Drawing, Line, Hatch, Label, outline, area, band, squarify, shares } = pkg;
const box = { x: 0, y: 0, w: 400, h: 300 };
const tiles = squarify(shares(8), box);
const covered = tiles.reduce((sum, t) => sum + t.w * t.h, 0);
const inside = tiles.every((t) => t.x >= -0.01 && t.y >= -0.01 && t.x + t.w <= box.w + 0.01 && t.y + t.h <= box.h + 0.01);
if (Math.abs(covered - box.w * box.h) > 1 || !inside || tiles.length !== 8) {
  failed++;
  console.log(`squarify: ${tiles.length} tiles covering ${Math.round(covered)} of ${box.w * box.h}, inside: ${inside}`);
}
const composed = {
  treemap: createElement(Drawing, { width: 400, height: 300 }, ...tiles.flatMap((t, i) => [
    i === 0 && createElement(Hatch, { key: `h${i}`, d: area(t) }),
    createElement(Line, { key: `l${i}`, d: outline(t) }),
    t.w > 40 && t.h > 20 && createElement(Label, { key: `t${i}`, x: t.x + 8, y: t.y + 8, w: Math.min(40, t.w - 16) }),
  ])),
  sankey: createElement(Drawing, { width: 640, height: 320 },
    createElement(Line, { d: outline({ x: 120, y: 20, w: 10, h: 280 }) }),
    createElement(Line, { d: outline({ x: 510, y: 20, w: 10, h: 120 }) }),
    createElement(Line, { d: outline({ x: 510, y: 160, w: 10, h: 140 }) }),
    createElement(Hatch, { d: band(129.5, 20.5, 140, 510.5, 20.5, 139.5) }),
    createElement(Line, { d: band(129.5, 20.5, 140, 510.5, 20.5, 139.5) }),
    createElement(Line, { d: band(129.5, 140, 299.5, 510.5, 160.5, 299.5) }),
  ),
};
for (const [name, element] of Object.entries(composed)) {
  const { text, passed } = report(`kit ${name}`, checkDrawing(renderToStaticMarkup(element)));
  checked++;
  if (!passed) {
    failed++;
    console.log(text);
  }
}

console.log(failed ? `${failed} of ${checked} drawings failed` : `all ${checked} drawings passed`);
process.exit(failed ? 1 : 0);
