import * as React from 'react';
import { flushSync } from 'react-dom';
import { useRender } from '@base-ui/react/use-render';
import { cn } from 'cn';

/* -------------------------------------------------------------------------- */
/* Skeletons for the parts of a component that wait on data. While `loading`, */
/* the component renders as usual with placeholder data, and every element    */
/* marked `data-skeleton` is drawn instead of shown: its text as borderless   */
/* bars, one per line; its pictures as striped plates with a 1px border; its  */
/* icons as 1px circles; a chart's drawing (an svg[data-skeleton="drawing"])  */
/* as its own lines; anything else as a 1px outline. Everything not marked    */
/* (labels, dividers, buttons, static icons) shows as itself. Outlines trace  */
/* in clockwise and the data fades in. One color: --skeleton.                 */
/*                                                                            */
/* The drawing is an <svg> inside the wrapper, over the content, measured     */
/* from the marked elements at the wrapper's exact size. Turning it on        */
/* changes only paint: the placeholder's layout stays as it is.               */
/* -------------------------------------------------------------------------- */

// The trace: every outline draws itself clockwise from its top left in TRACE_MS (the duration-600 below); outlines start
// in document order across STAGGER_MS, and a plate's stripes fade in halfway through its trace. When `loading` ends, the
// data fades in over REVEAL_MS (the duration-200 below).
const TRACE_MS = 600;
const STAGGER_MS = 400;
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
const DRAWN = '[data-slot=skeleton-drawing]';

const skeletonClassName = cn(
  // behavior: the wrapper holds the drawing. While loading, a marked element keeps its box and shows nothing (opacity
  // 0 hides it and everything in it, its colors, borders, pictures and icons, inline styles included): its skeleton is
  // drawn in its place. The selector (a class, a state, an attribute) outranks any one utility on the element, its
  // hover and focus states too
  'relative data-loading:[&_[data-skeleton]]:opacity-0',
  // behavior: when the data arrives, the marked elements fade in. With reduced motion there's no revealing state, so
  // they appear at once
  'data-revealing:[&_[data-skeleton]]:transition-opacity data-revealing:[&_[data-skeleton]]:duration-200',
);

const drawingClassName = cn(
  // behavior: the drawing lies over the wrapper's padding box, never catching the pointer. Its size (exact, with no
  // viewBox, so nothing is scaled and a 1px line stays 1px) and its color (--skeleton) are inline styles, which a
  // project's own rules for svgs inside it (`[&_svg]:size-4`, `[&_svg]:text-soft`) can't override
  'pointer-events-none absolute top-0 left-0 overflow-visible',
);

const traceClassName = cn(
  // behavior: an outline traces itself in once, from the moment it's drawn: its whole length (pathLength 1) dashed
  // away at first. Reduced motion: drawn at once
  'starting:[stroke-dashoffset:1] transition-[stroke-dashoffset] duration-600 ease-[cubic-bezier(.65,0,.35,1)] motion-reduce:transition-none',
);

const fadeClassName = cn(
  // behavior: a bar, a label or stripes fade in once, from the moment they're drawn. Reduced motion: at once
  'starting:opacity-0 transition-opacity duration-300 ease-out motion-reduce:transition-none',
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

// What a loading draws: the wrapper's padding box (which the drawing covers, at its exact size) and the shapes in it.
type Measured = { width: number; height: number; shapes: Shape[] };

// A change to the drawing itself, not to the content under it.
function ours(record: MutationRecord) {
  const target = record.target instanceof Element ? record.target : record.target.parentElement;
  if (target?.closest(DRAWN)) return true;
  const nodes = [...record.addedNodes, ...record.removedNodes];
  return nodes.length > 0 && nodes.every((node) => node instanceof Element && node.matches(DRAWN));
}

function paddingBox(root: HTMLElement) {
  const rect = root.getBoundingClientRect();
  const style = getComputedStyle(root);
  return {
    width: rect.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth),
    height: rect.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth),
  };
}

// The drawing: every shape where its element is, in --skeleton. Outlines trace in and the rest fades in, each once, as
// it's first drawn: a redraw moves what's there and draws only what's new. `stripes` is the pattern's id.
function Drawing({ width, height, shapes, stripes }: Measured & { stripes: string }) {
  const outlines = shapes.filter((s) => !s.bar).length;
  let i = 0;
  // Outlines start in document order across STAGGER_MS; a plate's stripes once its outline is halfway round.
  const next = () => Math.round((i++ / Math.max(outlines - 1, 1)) * STAGGER_MS);
  const after = (ms: number) => ({ transitionDelay: `${ms}ms` });
  const line = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'square', pathLength: 1, strokeDasharray: 1, className: traceClassName } as const;
  const striped = `url(#${stripes})`;
  return (
    <svg data-slot="skeleton-drawing" aria-hidden="true" className={drawingClassName} style={{ width, height, color: 'var(--skeleton)' }}>
      <defs>
        <pattern id={stripes} width={STRIPES} height={STRIPES} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={1} height={STRIPES} fill="currentColor" />
        </pattern>
      </defs>
      {shapes.map((s, key) => {
        if (s.bar) return <rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} fill="currentColor" className={fadeClassName} />;
        const ms = next();
        // A chart's drawing: its own parts, at its place; it starts as one outline.
        if (s.drawing)
          return (
            <svg key={key} x={s.x} y={s.y} viewBox={s.drawing.viewBox} overflow="visible" style={{ width: s.w, height: s.h }}>
              {s.drawing.parts.map(({ kind, d }, part) =>
                kind === 'line' ? (
                  <path key={part} d={d} {...line} style={after(ms)} />
                ) : kind === 'guide' ? (
                  <path key={part} d={d} fill="none" stroke="currentColor" strokeDasharray={DASH} className={fadeClassName} style={after(ms)} />
                ) : (
                  <path key={part} d={d} fill={kind === 'fill' ? 'currentColor' : striped} className={fadeClassName} style={after(kind === 'fill' ? ms : ms + TRACE_MS / 2)} />
                ),
              )}
            </svg>
          );
        return (
          <React.Fragment key={key}>
            {s.stripes &&
              (s.round ? (
                <path d={outline(s)} fill={striped} className={fadeClassName} style={after(ms + TRACE_MS / 2)} />
              ) : (
                <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={striped} className={fadeClassName} style={after(ms + TRACE_MS / 2)} />
              ))}
            <path d={outline(s)} {...line} style={after(ms)} />
          </React.Fragment>
        );
      })}
    </svg>
  );
}

type SkeletonProps = useRender.ComponentProps<'div'> & {
  /** Draws the marked elements as skeletons. Set it while the content shows placeholder data. */
  loading?: boolean;
};

type State = 'loading' | 'revealing' | 'idle';

export function Skeleton({ loading = false, render, className, ref, children, ...props }: SkeletonProps) {
  // Follows `loading` in the same render, both ways: the render that brings the data is already revealing, so no frame
  // ever paints the old skeletons over the new content.
  const [state, setState] = React.useState<State>(loading ? 'loading' : 'idle');
  if (loading && state !== 'loading') setState('loading');
  if (!loading && state === 'loading') setState(window.matchMedia(REDUCED_MOTION).matches ? 'idle' : 'revealing');
  const [drawn, setDrawn] = React.useState<Measured | null>(null);
  const stripes = `skeleton-stripes-${React.useId().replace(/[^\w-]/g, '')}`;
  const own = React.useRef<HTMLDivElement>(null);

  // While loading: drawn once, where the text really is: measured before the first paint, or once the fonts are in if
  // they're still loading (until then the marked elements are blank, never a guess that moves when the fonts land). Then
  // redrawn only when the wrapper's size or the content moves a skeleton.
  React.useLayoutEffect(() => {
    const root = own.current;
    if (state !== 'loading' || !root) return;
    if (!root.querySelector(MARKED)) console.warn('Skeleton: nothing inside is marked data-skeleton, so no skeleton is drawn.', root);
    let frame = 0;
    let last = '';
    let live = true;
    // The drawing for now, or null if it's the one already drawn. The size counts on its own: the drawing is the
    // wrapper's exact size, so a wrapper that grows around content that stays put needs a new one.
    const fresh = (shapes = measure(root)) => {
      const next = { ...paddingBox(root), shapes };
      const now = JSON.stringify(next);
      if (now === last) return null;
      last = now;
      return next;
    };
    // Measured first: laying the text out is what starts loading a font it needs, so only then is the fonts' status
    // known. Drawn in this effect, so before the first paint (or once the fonts are in).
    const first = measure(root);
    if (document.fonts?.status === 'loading')
      document.fonts.ready.then(() => {
        const next = live && !last ? fresh() : null;
        if (next) setDrawn(next);
      });
    else setDrawn(fresh(first));
    // Later, synchronously, so a redraw lands in the frame its layout does: a resize at once (the observer runs after
    // layout and before paint), a content change in the next frame. The drawing's own changes aren't content.
    const redraw = () => {
      frame = 0;
      const next = last ? fresh() : null;
      if (next) flushSync(() => setDrawn(next));
    };
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      redraw();
    });
    resize.observe(root);
    const change = new MutationObserver((records) => {
      if (!records.every(ours) && !frame) frame = requestAnimationFrame(redraw);
    });
    change.observe(root, { subtree: true, childList: true, characterData: true });
    // When loading ends: no redraw for the new content (the observers stop, their pending records with them); the
    // drawing isn't rendered past this state, and the next loading starts from nothing.
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      resize.disconnect();
      change.disconnect();
      setDrawn(null);
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
      children: (
        <>
          {children}
          {state === 'loading' && drawn && <Drawing {...drawn} stripes={stripes} />}
        </>
      ),
    },
  });
}
