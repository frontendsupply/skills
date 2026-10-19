import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';
import { cn } from 'cn';

/* -------------------------------------------------------------------------- */
/* Skeletons for the parts of a component that wait on data. While `loading`, */
/* the component renders as usual with placeholder data, and every element    */
/* marked `data-skeleton` is drawn instead of shown: its text as borderless   */
/* bars, one per line; its pictures as striped plates with a 1px border; its  */
/* icons as 1px circles; a chart's drawing (an svg[data-skeleton="drawing"])  */
/* as its own lines; anything else as a 1px outline. Everything not marked    */
/* (labels, dividers, buttons, static icons) shows as itself. Outlines        */
/* trace in clockwise, then one shimmer sweeps across every skeleton. Two     */
/* colors: --skeleton and --skeleton-shine.                                   */
/*                                                                            */
/* The drawing is two SVG masks, measured from the marked elements, on the    */
/* wrapper's ::before (the skeletons) and ::after (the shimmer). Turning it   */
/* on changes only paint: the placeholder's layout stays as it is.            */
/* -------------------------------------------------------------------------- */

// The trace: every outline draws itself clockwise from its top left in TRACE_MS; outlines start in document order across
// STAGGER_MS. Then the shimmer: a band crossing in SHIMMER_MS, again and again. When `loading` ends, the data fades in
// over REVEAL_MS (the 200ms transitions below).
const TRACE_MS = 600;
const STAGGER_MS = 400;
const SHIMMER_MS = 1500;
const REVEAL_MS = 200;
// The look of the drawing: a line of text is a bar from 20% to 80% of its height; a plate's stripes are 45°, 6px apart;
// an SVG up to 32px is an icon (a circle), a larger one a picture (a plate); a drawing's guides are dashed 2px on, 3px
// off. Lines are 1px, corners square unless the element is fully round.
const TEXT_TOP = 0.2;
const TEXT_HEIGHT = 0.6;
const STRIPES = 6;
const DASH = '2 3';
const ICON_MAX = 32;
const MARKED = '[data-skeleton]';
const MEDIA = 'img, video, canvas, picture, svg';
// A drawing of a chart: an svg at the chart's size whose parts are paths, each marked with what it is: a 1px line
// (traced), a dashed guide, a filled label, a striped area.
const DRAWING = 'svg[data-skeleton="drawing"]';
const PARTS = ['line', 'guide', 'fill', 'stripes'] as const;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const skeletonClassName = cn(
  // behavior: the drawing's two layers cover the wrapper, over the content, never catching the pointer: the skeletons
  // (::before, --skeleton) and the shimmer over them (::after, --skeleton-shine), each masked by an SVG measured from
  // the marked elements, at the wrapper's exact size so nothing is scaled
  'relative before:pointer-events-none before:absolute before:inset-0 before:z-1 after:pointer-events-none after:absolute after:inset-0 after:z-1',
  'before:mask-(--skeleton-shapes) after:mask-(--skeleton-shimmer) before:mask-size-[100%_100%] after:mask-size-[100%_100%] before:mask-no-repeat after:mask-no-repeat',
  'data-loading:data-drawn:before:bg-(--skeleton) data-loading:data-drawn:after:bg-(--skeleton-shine)',
  // behavior: while loading, a marked element keeps its box and paints nothing (text, background, border, shadow,
  // decoration; pictures move out of view, icons' shapes hide): its skeleton is drawn in its place. Important, so a
  // project's own rules (often unlayered) can't show through
  'data-loading:[&_:is([data-skeleton],[data-skeleton]_*)]:text-transparent! data-loading:[&_:is([data-skeleton],[data-skeleton]_*)]:placeholder:text-transparent! data-loading:[&_:is([data-skeleton],[data-skeleton]_*)]:decoration-transparent!',
  'data-loading:[&_:is([data-skeleton],[data-skeleton]_*)]:border-transparent! data-loading:[&_:is([data-skeleton],[data-skeleton]_*)]:bg-transparent! data-loading:[&_:is([data-skeleton],[data-skeleton]_*)]:bg-none! data-loading:[&_:is([data-skeleton],[data-skeleton]_*)]:[box-shadow:none]!',
  'data-loading:[&_:is([data-skeleton],[data-skeleton]_*):is(img,video,canvas)]:object-[0_-200vh]! data-loading:[&_:is([data-skeleton],[data-skeleton]_*)_svg_*]:invisible! data-loading:[&_svg[data-skeleton]_*]:invisible!',
  // behavior: when the data arrives, the marked elements fade from transparent to their own paint; with reduced motion,
  // at once
  'data-revealing:[&_:is([data-skeleton],[data-skeleton]_*)]:transition-[color,background-color,border-color,box-shadow]! data-revealing:[&_:is([data-skeleton],[data-skeleton]_*)]:duration-200!',
  'motion-reduce:data-revealing:[&_:is([data-skeleton],[data-skeleton]_*)]:transition-none!',
);

type Box = { x: number; y: number; w: number; h: number };
// A skeleton, on whole pixels: a text bar (filled, no border), or an outline (square, or fully round), striped if it
// stands for a picture.
type Shape = Box & { bar?: boolean; round?: boolean; stripes?: boolean; drawing?: Drawing };
type Drawing = { viewBox: string; parts: { kind: (typeof PARTS)[number]; d: string }[] };

// Every marked element's skeletons inside `root`, in document order, relative to root's padding box and snapped to
// whole pixels, so every 1px line is crisp.
function measure(root: HTMLElement): Shape[] {
  const origin = root.getBoundingClientRect();
  const ox = origin.left + root.clientLeft;
  const oy = origin.top + root.clientTop;
  const box = (r: { left: number; top: number; width: number; height: number }): Box => {
    const x = Math.round(r.left - ox);
    const y = Math.round(r.top - oy);
    return { x, y, w: Math.max(Math.round(r.left - ox + r.width) - x, 1), h: Math.max(Math.round(r.top - oy + r.height) - y, 1) };
  };
  // Square, unless the element is fully round (a pill, a circle, an avatar).
  const round = (el: Element, r: DOMRect) => {
    const corner = getComputedStyle(el).borderTopLeftRadius;
    const radius = corner.endsWith('%') ? (parseFloat(corner) / 100) * Math.min(r.width, r.height) : parseFloat(corner) || 0;
    return radius >= Math.min(r.width, r.height) / 2 - 0.5;
  };
  // A drawing (its own parts), a picture (a striped plate), an icon (a circle), or nothing.
  const media = (el: Element): Shape | null => {
    if (!el.matches(MEDIA)) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    if (el.matches(DRAWING)) {
      const v = (el as SVGSVGElement).viewBox.baseVal;
      const parts = [...el.querySelectorAll('path')].flatMap((path) => {
        const kind = PARTS.find((k) => path.hasAttribute(`data-${k}`));
        const d = path.getAttribute('d');
        return kind && d ? [{ kind, d }] : [];
      });
      return { ...box(r), drawing: { viewBox: v?.width ? `${v.x} ${v.y} ${v.width} ${v.height}` : `0 0 ${r.width} ${r.height}`, parts } };
    }
    const icon = el.matches('svg') && r.width <= ICON_MAX && r.height <= ICON_MAX;
    return icon ? { ...box(r), round: true } : { ...box(r), round: round(el, r), stripes: true };
  };
  const shapes: Shape[] = [];
  const range = document.createRange();
  for (const marked of root.querySelectorAll(MARKED)) {
    // A marked element inside another is drawn with it.
    if (marked.parentElement?.closest(MARKED)) continue;
    const own = media(marked);
    if (own) {
      shapes.push(own);
      continue;
    }
    const count = shapes.length;
    // Its text, a bar per line (the boxes of its words, joined), and its pictures and icons, in order; nothing inside a
    // picture or an icon.
    const walker = document.createTreeWalker(marked, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (node.parentElement?.closest(MEDIA) && marked.contains(node.parentElement.closest(MEDIA)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    // A bar ends where its line does, or where the element cuts it off (truncated text, an ellipsis).
    const edge = marked.getBoundingClientRect();
    const clipped = getComputedStyle(marked).overflowX !== 'visible';
    const bar = (l: DOMRect) => {
      const left = clipped ? Math.max(l.left, edge.left) : l.left;
      const right = clipped ? Math.min(l.right, edge.right) : l.right;
      if (right > left) shapes.push({ ...box({ left, top: l.top + l.height * TEXT_TOP, width: right - left, height: l.height * TEXT_HEIGHT }), bar: true });
    };
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node instanceof Element) {
        const shape = media(node);
        if (shape) shapes.push(shape);
        continue;
      }
      const text = node as Text;
      let line: DOMRect | null = null;
      for (const match of text.data.matchAll(/\S+/g)) {
        range.setStart(text, match.index);
        range.setEnd(text, match.index + match[0].length);
        for (const r of range.getClientRects()) {
          if (!r.width || !r.height) continue;
          if (line && Math.abs(line.top - r.top) < 1 && r.left >= line.left) line = new DOMRect(line.left, line.top, r.right - line.left, line.height);
          else {
            if (line) bar(line);
            line = r;
          }
        }
      }
      if (line) bar(line);
    }
    // Nothing to read or show inside (a color swatch, a status box): its outline.
    if (shapes.length === count) {
      const r = marked.getBoundingClientRect();
      if (r.width && r.height) shapes.push({ ...box(r), round: round(marked, r) });
    }
  }
  return shapes;
}

// An outline as one clockwise path from its top left (a round one from the start of its top edge). A 1px line sits half
// a pixel inside its box, on the pixel grid.
function outline(s: Shape): string {
  const x = s.x + 0.5;
  const y = s.y + 0.5;
  const w = Math.max(s.w - 1, 0);
  const h = Math.max(s.h - 1, 0);
  if (!s.round) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  const r = Math.min(w, h) / 2;
  const arc = (ex: number, ey: number) => `A${r} ${r} 0 0 1 ${ex} ${ey}`;
  return w >= h
    ? `M${x + r} ${y}H${x + w - r}${arc(x + w - r, y + h)}H${x + r}${arc(x + r, y)}Z`
    : `M${x} ${y + r}${arc(x + w, y + r)}V${y + h - r}${arc(x, y + h - r)}Z`;
}

// `id` makes a drawing new: the browser keeps an animated image's timeline with its URL, so a second loading with the
// same content would otherwise start where the first one ended.
const svg = (w: number, h: number, body: string, id: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" id="${id}">${body}</svg>`)}")`;

// The skeletons and the shimmer: traced in and shimmering when `animate`, shimmering without a second trace on a
// redraw, both still for reduced motion. Sized to root's padding box exactly (it can be fractional), so the masks are
// never scaled and a 1px line stays 1px.
function draw(root: HTMLElement, shapes: Shape[], id: string, animate: boolean, still: boolean) {
  const rect = root.getBoundingClientRect();
  const style = getComputedStyle(root);
  const w = rect.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
  const h = rect.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth);
  // Read now, with the size: after the first write below, a read would make the browser recompute styles again.
  const rtl = style.direction === 'rtl';
  const outlines = shapes.filter((s) => !s.bar).length;
  let body = '';
  let lit = '';
  let i = 0;
  for (const s of shapes) {
    // A drawing: its parts at its place, each drawn as what it is; it traces in as one outline.
    if (s.drawing) {
      const delay = animate ? Math.round((i++ / Math.max(outlines - 1, 1)) * STAGGER_MS) : 0;
      const at = (ms: number) => (animate ? ` style="animation-delay:${ms}ms"` : '');
      const open = `<svg x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" viewBox="${s.drawing.viewBox}" overflow="visible">`;
      let own = '';
      let shine = '';
      for (const { kind, d } of s.drawing.parts) {
        if (kind === 'line') own += `<path class="t" pathLength="1" d="${d}"${at(delay)}/>`;
        if (kind === 'guide') own += `<path class="u" d="${d}"${at(delay)}/>`;
        if (kind === 'fill') own += `<path${animate ? ' class="b"' : ''} d="${d}"${at(delay)}/>`;
        if (kind === 'stripes') own += `<path class="p" d="${d}"${at(delay + TRACE_MS / 2)}/>`;
        shine +=
          kind === 'fill' ? `<path d="${d}" fill="#fff"/>` : kind === 'stripes' ? `<path d="${d}" fill="url(#lit)"/>` : `<path d="${d}" fill="none" stroke="#fff"${kind === 'guide' ? ` stroke-dasharray="${DASH}"` : ''}/>`;
      }
      body += `${open}${own}</svg>`;
      lit += `${open}${shine}</svg>`;
      continue;
    }
    const area = s.round ? `<path d="${outline(s)}"` : `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}"`;
    if (s.bar) {
      body += `${area}${animate ? ' class="b"' : ''}/>`;
      lit += `${area} fill="#fff"/>`;
      continue;
    }
    const delay = animate ? Math.round((i++ / Math.max(outlines - 1, 1)) * STAGGER_MS) : 0;
    if (s.stripes) body += `${area} class="p"${animate ? ` style="animation-delay:${delay + TRACE_MS / 2}ms"` : ''}/>`;
    body += `<path class="t" pathLength="1" d="${outline(s)}"${animate ? ` style="animation-delay:${delay}ms"` : ''}/>`;
    lit += `<path d="${outline(s)}" fill="none" stroke="#fff"/>${s.stripes ? `${area} fill="url(#lit)"/>` : ''}`;
  }
  const stripes = (name: string, fill: string) =>
    `<pattern id="${name}" width="${STRIPES}" height="${STRIPES}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1" height="${STRIPES}" fill="${fill}"/></pattern>`;
  const trace = animate
    ? `.t{stroke-dasharray:1;stroke-dashoffset:1;animation:t ${TRACE_MS}ms cubic-bezier(.65,0,.35,1) forwards}.p,.b,.u{opacity:0;animation:p ${TRACE_MS / 2}ms ease-out forwards}@keyframes t{to{stroke-dashoffset:0}}@keyframes p{to{opacity:1}}`
    : '';
  root.style.setProperty(
    '--skeleton-shapes',
    svg(w, h, `<defs>${stripes('stripes', '#000')}</defs><style>.t{fill:none;stroke:#000;stroke-width:1px;stroke-linecap:square}.u{fill:none;stroke:#000;stroke-width:1px;stroke-dasharray:${DASH}}.p{fill:url(#stripes)}${trace}</style>${body}`, `${id}s`),
  );
  // The shimmer: a soft band crossing the whole width, seen only through the skeletons. It waits for the trace, and
  // runs the other way on right-to-left pages. Empty (nothing to paint) for reduced motion.
  const band = Math.min(Math.max(w * 0.35, 120), 320);
  const shimmer = still
    ? ''
    : `<defs>${stripes('lit', '#fff')}<linearGradient id="g"><stop offset="0" stop-opacity="0"/><stop offset=".5"/><stop offset="1" stop-opacity="0"/></linearGradient><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">${lit}</mask></defs>` +
      `<style>.s{transform:translateX(${-band}px);animation:s ${SHIMMER_MS}ms ease-in-out ${animate ? TRACE_MS + STAGGER_MS : 0}ms infinite${rtl ? ' reverse' : ''}}@keyframes s{from{transform:translateX(${-band}px)}to{transform:translateX(${w}px)}}</style>` +
      `<g mask="url(#m)"><rect class="s" width="${band}" height="${h}" fill="url(#g)"/></g>`;
  root.style.setProperty('--skeleton-shimmer', svg(w, h, shimmer, `${id}m`));
  root.dataset.drawn = '';
}

function clear(root: HTMLElement) {
  root.style.removeProperty('--skeleton-shapes');
  root.style.removeProperty('--skeleton-shimmer');
  delete root.dataset.drawn;
}

let drawings = 0;

type SkeletonProps = useRender.ComponentProps<'div'> & {
  /** Draws the marked elements as skeletons. Set it while the content shows placeholder data. */
  loading?: boolean;
};

type State = 'loading' | 'revealing' | 'idle';

export function Skeleton({ loading = false, render, className, ref, ...props }: SkeletonProps) {
  // Follows `loading` in the same render, both ways: the render that brings the data is already revealing, so no frame
  // ever paints the old skeletons over the new content.
  const [state, setState] = React.useState<State>(loading ? 'loading' : 'idle');
  if (loading && state !== 'loading') setState('loading');
  if (!loading && state === 'loading') setState(window.matchMedia(REDUCED_MOTION).matches ? 'idle' : 'revealing');
  const own = React.useRef<HTMLDivElement>(null);

  // While loading: drawn once, where the text really is: measured before the first paint, or once the fonts are in if
  // they're still loading (until then the marked elements are blank, never a guess that moves when the fonts land). Then
  // redrawn only when the size or the content moves a skeleton.
  React.useLayoutEffect(() => {
    const root = own.current;
    if (state !== 'loading' || !root) return;
    if (!root.querySelector(MARKED)) console.warn('Skeleton: nothing inside is marked data-skeleton, so no skeleton is drawn.', root);
    const id = `s${++drawings}`;
    const still = window.matchMedia(REDUCED_MOTION).matches;
    let frame = 0;
    let drawn = '';
    let traced = false;
    let live = true;
    // The first drawing with something in it traces in; later ones only when something moved, and still.
    const redraw = (shapes = measure(root)) => {
      frame = 0;
      const now = JSON.stringify(shapes);
      if (now !== drawn) draw(root, shapes, id, !traced && !still, still);
      drawn = now;
      traced ||= shapes.length > 0;
    };
    // Measured first: laying the text out is what starts loading a font it needs, so only then is the fonts' status
    // known.
    const first = measure(root);
    if (document.fonts?.status === 'loading') document.fonts.ready.then(() => live && !drawn && redraw());
    else redraw(first);
    // A resize redraws at once: the observer runs after layout and before paint, so the new drawing lands in the same
    // frame as the new layout, never a frame of the old one stretched over it. Content changes wait for a frame.
    const resize = new ResizeObserver(() => {
      if (!drawn) return;
      cancelAnimationFrame(frame);
      redraw();
    });
    resize.observe(root);
    const change = new MutationObserver(() => {
      if (drawn && !frame) frame = requestAnimationFrame(() => redraw());
    });
    change.observe(root, { subtree: true, childList: true, characterData: true });
    // When loading ends: no redraw for the new content (the observers stop, their pending records with them), and the
    // drawing goes before the next paint.
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      resize.disconnect();
      change.disconnect();
      clear(root);
    };
  }, [state]);

  React.useEffect(() => {
    if (state !== 'revealing') return;
    const done = window.setTimeout(() => setState('idle'), REVEAL_MS);
    return () => window.clearTimeout(done);
  }, [state]);

  return useRender({
    defaultTagName: 'div',
    render,
    ref: [own, ref ?? null],
    props: {
      'data-slot': 'skeleton',
      'data-loading': state === 'loading' ? '' : undefined,
      'data-revealing': state === 'revealing' ? '' : undefined,
      'aria-busy': state === 'loading' || undefined,
      // Nothing is clicked or read while the content is placeholder data.
      inert: state === 'loading',
      className: cn(skeletonClassName, className),
      ...props,
    },
  });
}
