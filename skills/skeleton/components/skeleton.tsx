import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';

/* -------------------------------------------------------------------------- */
/* Skeletons for the parts of a component that wait on data. While `loading`, */
/* the component renders as usual with placeholder data, and every element    */
/* marked `data-skeleton` is painted as its skeleton by skeleton.css (import  */
/* it once in the project's main CSS): its text as bars, one per line; its    */
/* pictures as striped plates with a 1px edge; its icons as 1px circles;      */
/* anything with nothing inside as a 1px outline; a chart's drawing as        */
/* itself. Everything not marked (labels, dividers, buttons, static icons)    */
/* shows as itself. The skeletons pulse, and the data fades in.               */
/*                                                                            */
/* This part only says what state the region is in: `data-loading`, then      */
/* `data-revealing` while the data fades in. Nothing is measured and no       */
/* script draws, so the skeletons are in the server's HTML, there from the    */
/* first frame, and right at every width.                                     */
/* -------------------------------------------------------------------------- */

// When `loading` ends, the data fades in over REVEAL_MS (the 200ms transition in skeleton.css).
const REVEAL_MS = 200;

type SkeletonProps = useRender.ComponentProps<'div'> & {
  /** Paints the marked elements as skeletons. Set it while the content shows placeholder data. */
  loading?: boolean;
};

type State = 'loading' | 'revealing' | 'idle';

export function Skeleton({ loading = false, render, ref, ...props }: SkeletonProps) {
  // Follows `loading` in the same render, both ways: the render that brings the data is already revealing, so the
  // skeletons fade into the data instead of being swapped for it.
  const [state, setState] = React.useState<State>(loading ? 'loading' : 'idle');
  if (loading && state !== 'loading') setState('loading');
  if (!loading && state === 'loading') setState('revealing');

  React.useEffect(() => {
    if (state !== 'revealing') return;
    const done = window.setTimeout(() => setState('idle'), REVEAL_MS);
    return () => window.clearTimeout(done);
  }, [state]);

  return useRender({
    defaultTagName: 'div',
    render,
    ref,
    props: {
      'data-slot': 'skeleton',
      'data-loading': state === 'loading' ? '' : undefined,
      'data-revealing': state === 'revealing' ? '' : undefined,
      'aria-busy': state === 'loading' || undefined,
      // Nothing is clicked or read while the content is placeholder data.
      inert: state === 'loading',
      ...props,
    },
  });
}
