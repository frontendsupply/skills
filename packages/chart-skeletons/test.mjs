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
  LineChartSkeleton: [...axes, { series: 3, legend: 'bottom' }, { points: 40 }],
  AreaChartSkeleton: [...axes, { series: 2, legend: 'right' }, { points: 40 }],
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
  SparklineSkeleton: [{}, { dot: false }, { points: 40 }],
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
console.log(failed ? `${failed} of ${checked} drawings failed` : `all ${checked} drawings passed`);
process.exit(failed ? 1 : 0);
