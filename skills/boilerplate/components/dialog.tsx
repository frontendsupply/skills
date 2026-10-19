import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import { cn } from 'cn';

type WithClassName<P> = Omit<P, 'className'> & { className?: string };

/* -------------------------------------------------------------------------- */
/* A dialog on desktop, a bottom drawer below 768px. Same parts either way:   */
/* Base UI's Drawer reuses Dialog's Trigger, Close, Title and Description, so */
/* only the root and the popup stack switch.                                  */
/* -------------------------------------------------------------------------- */

const MOBILE_QUERY = '(max-width: 767px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false, // Server render: desktop. Only the closed trigger renders then, which is the same in both modes.
  );
}

/* -------------------------------------------------------------------------- */
/* State shared by the whole stack (owned by the root dialog).                */
/* -------------------------------------------------------------------------- */

type StackRoot = {
  /** Set by closeAll: the wrapper animates out and every card holds still inside it. */
  closingAll: boolean;
  setClosingAll: (value: boolean) => void;
  /** The wrapper element every nested dialog portals into. */
  container: HTMLElement | null;
  setContainer: (node: HTMLElement | null) => void;
};

type ChangeDetails = BaseDialog.Root.ChangeEventDetails;

// Details for a close that comes from code (useDialog, closeAll), shaped like Base UI's own, so an
// `onOpenChange` that calls `details.cancel()` (an unsaved-changes guard) can stop it too.
function codeDetails(): ChangeDetails {
  const details = {
    reason: 'imperative-action',
    event: new Event('close'),
    trigger: undefined,
    isCanceled: false,
    isPropagationAllowed: false,
    cancel: () => void (details.isCanceled = true),
    allowPropagation: () => void (details.isPropagationAllowed = true),
  };
  return details as unknown as ChangeDetails;
}

type DialogContextValue = {
  inDialog: boolean;
  /** The outermost dialog of a stack: it owns the stack wrapper. */
  isRoot: boolean;
  drawer: boolean;
  open: boolean;
  /** Closes this dialog. */
  close: () => void;
  /** Closes this dialog and every dialog it's nested in, at once. */
  closeAll: () => void;
  /**
   * Closes this dialog, then the ones it's nested in, nearest first. Stops at the first that cancels
   * (`details.cancel()` in its onOpenChange) and returns whether the whole stack closed.
   */
  closeUp: () => boolean;
  /** Called by `DialogClose closeAll` right before Base UI closes this level. */
  requestCloseAll: () => void;
  stack: StackRoot | null;
};

const noop = () => {};
const DialogContext = React.createContext<DialogContextValue>({
  inDialog: false,
  isRoot: false,
  drawer: false,
  open: false,
  close: noop,
  closeAll: noop,
  closeUp: () => true,
  requestCloseAll: noop,
  stack: null,
});

/**
 * Close the current dialog, or the whole stack, from code (e.g. after an async action succeeds).
 * Call it inside `DialogContent`: it acts on the dialog it's rendered in.
 */
export function useDialog() {
  const { close, closeAll } = React.useContext(DialogContext);
  return { close, closeAll };
}

/** For a trigger outside the dialog (e.g. one per table row): pass it to `Dialog` and `DialogTrigger` as `handle`. */
export const createDialogHandle = BaseDrawer.createHandle;

type DialogProps = Pick<
  BaseDialog.Root.Props,
  'disablePointerDismissal' | 'onOpenChangeComplete' | 'actionsRef' | 'triggerId' | 'defaultTriggerId' | 'handle'
> & {
  open?: boolean;
  defaultOpen?: boolean;
  /**
   * Base UI's `eventDetails` (reason, `cancel()`, …), on every close: from code too (reason
   * `'imperative-action'`), so `details.cancel()` can always keep it open.
   */
  onOpenChange?: (open: boolean, eventDetails: ChangeDetails) => void;
  /** Content, or with a `handle`, a function of the payload its trigger was given. */
  children?: BaseDialog.Root.Props['children'];
};

export function Dialog({ open: openProp, defaultOpen = false, onOpenChange, children, ...rootProps }: DialogProps) {
  const parent = React.useContext(DialogContext);
  const isRoot = !parent.inDialog;
  const isMobile = useIsMobile();

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const latest = React.useRef({ openProp, onOpenChange });
  React.useLayoutEffect(() => {
    latest.current = { openProp, onOpenChange };
  });

  // The mode is locked while open: swapping the popup parts would remount the content (typed input,
  // focus and nested dialogs lost). Nested dialogs always follow their parent, so a stack never mixes
  // modes. The first client render takes the real viewport, even for a dialog that hydrates open.
  const [lockedDrawer, setLockedDrawer] = React.useState(isMobile);
  if (isRoot && !open && lockedDrawer !== isMobile) setLockedDrawer(isMobile);
  React.useLayoutEffect(() => {
    if (isRoot) setLockedDrawer(window.matchMedia(MOBILE_QUERY).matches);
  }, [isRoot]);
  const drawer = isRoot ? lockedDrawer : parent.drawer;

  // Stack-wide state lives on the root; nested dialogs use their parent's.
  const [closingAll, setClosingAll] = React.useState(false);
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  if (isRoot && open && closingAll) setClosingAll(false); // A fresh stack each time the root opens.
  const ownStack = React.useMemo<StackRoot>(
    () => ({ closingAll, setClosingAll, container, setContainer }),
    [closingAll, container],
  );
  const stack = isRoot ? ownStack : parent.stack;
  const setRootClosingAll = stack?.setClosingAll;
  const parentCloseUp = parent.closeUp;

  // Set by `DialogClose closeAll` just before Base UI closes this level, cleared after the event.
  const closeAllRequested = React.useRef(false);

  // Returns whether the change went through.
  const setOpen = React.useCallback(
    (next: boolean, eventDetails: ChangeDetails) => {
      latest.current.onOpenChange?.(next, eventDetails);
      // Base UI's close-confirmation pattern: `eventDetails.cancel()` in onOpenChange keeps it open.
      if (eventDetails.isCanceled) {
        closeAllRequested.current = false;
        return false;
      }
      if (latest.current.openProp === undefined) setUncontrolledOpen(next);
      // `DialogClose closeAll`: this level closed, so close the ones behind it, in the same render.
      if (!next && closeAllRequested.current) {
        closeAllRequested.current = false;
        if (parentCloseUp()) setRootClosingAll?.(true);
      }
      return true;
    },
    [parentCloseUp, setRootClosingAll],
  );

  const close = React.useCallback(() => void setOpen(false, codeDetails()), [setOpen]);
  const closeUp = React.useCallback(() => setOpen(false, codeDetails()) && parentCloseUp(), [setOpen, parentCloseUp]);
  // One event, one batched render: the whole stack leaves together, as one piece. If a level cancels,
  // the ones in front of it still close, but the stack isn't frozen, so they leave one by one.
  const closeAll = React.useCallback(() => {
    if (closeUp()) setRootClosingAll?.(true);
  }, [closeUp, setRootClosingAll]);
  const requestCloseAll = React.useCallback(() => {
    closeAllRequested.current = true;
    queueMicrotask(() => (closeAllRequested.current = false));
  }, []);

  const value = React.useMemo<DialogContextValue>(
    () => ({ inDialog: true, isRoot, drawer, open, close, closeAll, closeUp, requestCloseAll, stack }),
    [isRoot, drawer, open, close, closeAll, closeUp, requestCloseAll, stack],
  );

  // Always Base UI's Drawer root, in both modes: it's the Dialog root plus swipe support, so crossing the
  // breakpoint only swaps the popup parts (in DialogContent) and never remounts triggers or state.
  const Root = BaseDrawer.Root as unknown as typeof BaseDialog.Root;
  return (
    <DialogContext.Provider value={value}>
      <Root {...rootProps} open={open} onOpenChange={setOpen}>
        {children}
      </Root>
    </DialogContext.Provider>
  );
}

// Unstyled on purpose: render them into whatever button opens or closes the dialog.
export function DialogTrigger(props: BaseDialog.Trigger.Props) {
  return <BaseDialog.Trigger data-slot="dialog-trigger" {...props} />;
}

type DialogCloseProps = BaseDialog.Close.Props & {
  /**
   * Close every dialog in the stack, not just this one. Use it on the final action of a nested
   * flow (e.g. "Delete" in a confirmation), so the user lands back on the page in one step.
   */
  closeAll?: boolean;
};

export function DialogClose({ closeAll = false, onClick, ...props }: DialogCloseProps) {
  const dialog = React.useContext(DialogContext);
  return (
    <BaseDialog.Close
      data-slot="dialog-close"
      {...props}
      onClick={(event) => {
        onClick?.(event);
        // `event.preventDefault()` in your onClick cancels the close (e.g. validation failed).
        if (event.defaultPrevented) return event.preventBaseUIHandler();
        // This level closes through Base UI as usual (one onOpenChange, with real event details); only once
        // it has, the levels behind it close too.
        if (closeAll) dialog.requestCloseAll();
      }}
    />
  );
}

const backdropClassName = cn(
  // behavior
  'fixed inset-0 transition-opacity data-starting-style:opacity-0 data-ending-style:opacity-0',
  // look. A scrim, like a shadow, stays dark in both themes.
  'bg-black/30',
);

const surfaceClassName = cn(
  // behavior
  'outline-hidden',
  // look. The radius is set once, through --dialog-radius: the stack trims cards with a clip-path
  // rounded to it. The popup takes focus when its content is taller than the screen (see
  // initialFocus), so it needs a focus ring.
  '[--dialog-radius:4px] border-soft bg-base text-sm text-strong focus-visible:ring-2 focus-visible:ring-primary',
);

/* -------------------------------------------------------------------------- */
/* Nesting: a card stack. Open another <Dialog> inside DialogContent and:     */
/*  - the new card rises from below into place, 12px under the top edge of    */
/*    the card behind, so every level peeks out like a staircase;             */
/*  - the card behind recedes a little, hides its content, is trimmed where   */
/*    the stack ends, and slides just enough to keep the stack centered.      */
/*                                                                            */
/* Every card lives in one wrapper (`dialog-stack`), owned by the root dialog. */
/* closeAll animates only that wrapper; the cards freeze in place inside it.  */
/*                                                                            */
/* Only transform, translate, clip-path and opacity animate. Sizes never      */
/* change, so there is no layout per frame.                                   */
/* -------------------------------------------------------------------------- */

// Easing curves (written out literally in each class: Tailwind can't read interpolated strings).
// Dialog: cubic-bezier(0.23,1,0.32,1). Drawer: cubic-bezier(0.32,0.72,0,1), Base UI's sheet curve.

// Desktop and mobile: each dialog reports to the one it's nested in: the front card's height and
// how many cards sit on top. These are our own values, not Base UI's `--nested-*` variables, so
// they can be held still while closeAll animates the wrapper.
type StackReport = { height: number; depth: number };
type StackContextValue = { report: (value: StackReport | null) => void; level: number };
const StackContext = React.createContext<StackContextValue | null>(null);

function useStack(open: boolean, frozen: boolean, drawer: boolean) {
  const parent = React.useContext(StackContext);
  const level = parent ? parent.level + 1 : 0;
  const [ownHeight, setOwnHeight] = React.useState<number | null>(null);
  const [front, setFront] = React.useState<StackReport | null>(null);
  const [layoutFix, setLayoutFix] = React.useState(0);
  const nodeRef = React.useRef<HTMLElement | null>(null);
  const observerRef = React.useRef<ResizeObserver | null>(null);

  // A fresh stack each time this dialog opens (the last one may have been frozen by closeAll).
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setFront(null);
  }

  // A ref callback, not an effect: the popup only mounts when the dialog opens. The first
  // reading happens during commit, so it's there before the first paint.
  const measureRef = React.useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
    observerRef.current?.disconnect();
    if (!node) return;
    setOwnHeight(node.offsetHeight);
    observerRef.current = new ResizeObserver(([entry]) => setOwnHeight(entry.borderBoxSize[0].blockSize));
    observerRef.current.observe(node);
  }, []);

  // Report up while open. Stop as soon as this dialog starts closing, so the cards behind
  // un-stack together, unless closeAll is running: then everything holds still.
  const report = parent?.report;
  const frozenRef = React.useRef(frozen);
  React.useLayoutEffect(() => {
    frozenRef.current = frozen;
  });
  // Only clear what this dialog reported: a closed sibling must never wipe an open sibling's report.
  const reportingRef = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!report) return;
    if (!open) {
      if (!frozen && reportingRef.current) {
        reportingRef.current = false;
        report(null);
      }
      return;
    }
    const height = front?.height ?? ownHeight;
    if (height == null) return;
    reportingRef.current = true;
    report({ height, depth: (front?.depth ?? 0) + 1 });
  }, [report, open, frozen, front, ownHeight]);
  React.useLayoutEffect(
    () => () => {
      if (reportingRef.current && !frozenRef.current) report?.(null);
    },
    [report],
  );

  const stacked = front != null;

  // Stack changes (a card arriving or leaving) animate. Anything else that moves the stack while it
  // stands still (content growing, the window resizing) corrects instantly: the front card's own
  // layout jumps, so a card behind that eased after it would drift off its 12px step.
  const depth = front?.depth ?? 0;
  const [settledDepth, setSettledDepth] = React.useState(depth);
  const [settling, setSettling] = React.useState(false);
  if (depth !== settledDepth) {
    setSettledDepth(depth);
    setSettling(true);
  }
  React.useEffect(() => {
    if (!settling) return;
    const timeout = window.setTimeout(() => setSettling(false), 320);
    return () => window.clearTimeout(timeout);
  }, [settling, settledDepth]);

  // Desktop: the stack math assumes every card is centered in its viewport. A card taller than the
  // screen is top-aligned and may be scrolled instead, so measure how far off it is once, when the
  // first card opens on top of it (it's at rest then, and covered, so it can't scroll after).
  React.useLayoutEffect(() => {
    const node = nodeRef.current;
    const viewport = node?.offsetParent as HTMLElement | null;
    if (!stacked || drawer || !node || !viewport) return;
    setLayoutFix(node.offsetTop - viewport.scrollTop - (viewport.clientHeight - node.offsetHeight) / 2);
  }, [stacked, drawer]);

  const context = React.useMemo<StackContextValue>(() => ({ report: setFront, level }), [level]);

  const style = {
    '--level': level,
    '--stack-m': front?.depth ?? 0,
    ...(ownHeight != null && { '--own-height': `${ownHeight}px` }),
    ...(stacked && { '--front-height': `${front.height}px`, '--layout-fix': `${layoutFix}px` }),
  } as React.CSSProperties;

  return { measureRef, context, style, stacked, settling };
}

// Everything from here to DialogContent (stack wrapper, card motion, drawer motion) is behavior: keep it
// as written.

// The wrapper holding every card of the stack. closeAll sets `data-closing-all` on it: the wrapper
// drops and fades as one piece, and these variables tell every card inside to hold still (no exit
// offset, opacity held at 0.9999 for as long as the wrapper moves, so Base UI keeps it mounted).
const stackHoldVars =
  // behavior
  'data-closing-all:[--exit-k:0] data-closing-all:[--exit-opacity:0.9999] data-closing-all:pointer-events-none';
const dialogStackClassName = cn(
  // behavior
  'fixed inset-0',
  '[transition:translate_200ms_cubic-bezier(0.23,1,0.32,1),opacity_150ms_ease-out]',
  'data-closing-all:translate-y-6 data-closing-all:opacity-0',
  stackHoldVars,
  'data-closing-all:[--exit-move:220ms] data-closing-all:[--exit-fade:220ms]',
  'motion-reduce:transition-none',
);
const drawerStackClassName = cn(
  // behavior
  'fixed inset-0',
  '[transition:translate_320ms_cubic-bezier(0.32,0.72,0,1)]',
  'data-closing-all:translate-y-full',
  stackHoldVars,
  'data-closing-all:[--exit-move:340ms] data-closing-all:[--exit-fade:340ms]',
  'motion-reduce:transition-none',
);

// One transform for every state. Enter and exit only change the offset variables (`--shift-*`),
// so the browser interpolates plain values, and closeAll can zero the exit offsets to freeze a card.
//
// Where a card sits so the visible stack is centered. Every card is centered by its own viewport;
// the visible stack is `front height + 12px per level`, each level 12px below the one behind.
// For card k with m cards on top:   y = (own − (k + m)·12 − front) / 2 + k·12 − layoutFix
// A card m levels back sits 16·m px deeper, so perspective(1200px) shrinks its travel by
// 1200 / (1200 + 16·m); multiplying by (1 + m/75) undoes that, so it lands exactly at any distance.
// The front card (m = 0, front = own) reduces to k·6px: it needs no measurement, so its first frame
// is already in place. Written out in full: Tailwind only generates classes it can read literally.
const dialogMotionClassName = cn(
  // behavior
  'origin-top',
  '[--ease:cubic-bezier(0.23,1,0.32,1)]',
  '[transition:transform_var(--move,250ms)_var(--ease),clip-path_var(--move,250ms)_var(--ease),opacity_var(--fade,120ms)_ease-out]',
  'motion-reduce:transition-none',
  '[transform:perspective(1200px)_translateY(calc(((var(--own-height,0px)_-_(var(--level)_+_var(--stack-m))_*_12px_-_var(--front-height,var(--own-height,0px)))_/_2_+_var(--level)_*_12px_-_var(--layout-fix,0px))_*_(1_+_var(--stack-m)_/_75)_+_var(--shift-y,0px)))_translateZ(calc(var(--stack-m)_*_-16px_+_var(--shift-z,0px)))]',
  // Negative insets keep the shadow (it must fit in 48px); rounded to match the card.
  '[clip-path:inset(-48px_-48px_-48px_-48px_round_var(--dialog-radius))]',
  // Arriving: nested cards rise 64px from below, the root 16px from just behind. Never from 0 opacity.
  'data-starting-style:opacity-50',
  'not-data-nested:data-starting-style:[--shift-y:16px] not-data-nested:data-starting-style:[--shift-z:-16px]',
  'data-nested:data-starting-style:[--shift-y:64px]',
  // Leaving: the same offsets, scaled by --exit-k (0 while closeAll holds the card still).
  'data-ending-style:opacity-(--exit-opacity,0) data-ending-style:[--move:var(--exit-move,180ms)] data-ending-style:[--fade:var(--exit-fade,100ms)]',
  'not-data-nested:data-ending-style:[--shift-y:calc(16px_*_var(--exit-k,1))] not-data-nested:data-ending-style:[--shift-z:calc(-16px_*_var(--exit-k,1))]',
  'data-nested:data-ending-style:[--shift-y:calc(64px_*_var(--exit-k,1))]',
  // A nested card never outgrows the screen: it scrolls inside, so the stack always fits.
  'data-nested:max-h-[calc(100dvh-6rem)] data-nested:overflow-y-auto data-nested:overscroll-contain',
  // Behind: hides its content and is trimmed where the stack ends (front height + 12px per level on top).
  // While the stack stands still, corrections are instant (see `settling` in useStack).
  'data-stacked:shadow-none data-stacked:not-data-settling:[--move:0ms]',
  'data-stacked:[clip-path:inset(-48px_-48px_calc(var(--own-height,0px)_-_var(--front-height,var(--own-height,0px))_-_var(--stack-m)_*_12px)_-48px_round_var(--dialog-radius))]',
  '*:transition-opacity *:duration-150 *:ease-out data-stacked:*:opacity-0 motion-reduce:*:transition-none',
);

// Mobile: a sheet behind moves down by the height difference, so its top edge peeks 12px above the
// sheet in front and the rest slides below the screen. As the front sheet is swiped away
// (`--drawer-swipe-progress`), the one behind comes back with the finger.
const drawerMotionStyle = {
  '--stack-depth': 'max(0, var(--stack-m, 0) - clamp(0, var(--drawer-swipe-progress), 1))',
  '--shrink': 'calc(var(--own-height, 0px) - var(--front-height, var(--own-height, 0px)))',
  transform:
    // (1 + depth · 0.024) undoes the shrink perspective(1000px) applies to a sheet 24px·depth back.
    'perspective(1000px) translateY(calc(var(--drawer-swipe-movement-y) + (min(var(--stack-depth), 1) * var(--shrink) - var(--stack-depth) * 12px) * (1 + var(--stack-depth) * 0.024))) translateZ(calc(var(--stack-depth) * -24px))',
} as React.CSSProperties;

const drawerMotionClassName = cn(
  // behavior
  'origin-top',
  '[--ease:cubic-bezier(0.32,0.72,0,1)]',
  '[transition:transform_var(--move,450ms)_var(--ease),translate_var(--move,450ms)_var(--ease),opacity_var(--fade,0ms)_linear]',
  'motion-reduce:transition-none',
  'data-starting-style:translate-y-full',
  // Leaving: slides out, unless closeAll holds it still (--exit-k: 0) while the wrapper slides.
  'data-ending-style:[translate:0_calc(100%_*_var(--exit-k,1))] data-ending-style:opacity-(--exit-opacity,1)',
  'data-ending-style:[--move:var(--exit-move,calc(var(--drawer-swipe-strength)*400ms))] data-ending-style:[--fade:var(--exit-fade,0ms)]',
  'data-swiping:[--move:0ms] data-nested-drawer-swiping:[--move:0ms]',
  '*:transition-opacity *:duration-150 *:ease-out data-stacked:*:opacity-0 data-nested-drawer-swiping:*:opacity-100 motion-reduce:*:transition-none',
);

type DialogContentProps = WithClassName<BaseDialog.Popup.Props> & {
  ref?: React.Ref<HTMLDivElement>;
  style?: React.CSSProperties;
  /** Where the root dialog's portal renders (default: document.body). Nested dialogs always join the root's stack. */
  container?: BaseDialog.Portal.Props['container'];
};

// Portal + Backdrop + Viewport + Popup in one part.
export function DialogContent({ className, children, initialFocus, ref, style, container, ...props }: DialogContentProps) {
  const { isRoot, drawer, open, stack } = React.useContext(DialogContext);
  const closingAll = stack?.closingAll ?? false;
  // A nested Dialog has to sit inside its parent's DialogContent to join the stack's motion; one placed
  // beside it still portals into the stack, it just doesn't step the cards behind it back.
  const nest = useStack(open, closingAll, drawer);

  const popupRef = React.useRef<HTMLDivElement | null>(null);
  const userRef = React.useRef(ref);
  React.useLayoutEffect(() => {
    userRef.current = ref;
  });
  const setPopupRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      popupRef.current = node;
      nest.measureRef(node);
      const forwarded = userRef.current;
      if (typeof forwarded === 'function') forwarded(node);
      else if (forwarded) forwarded.current = node;
    },
    [nest.measureRef],
  );
  // Initial focus: the first focusable control, as WAI-ARIA recommends; put the least destructive
  // action first (Cancel before Delete). Two exceptions focus the popup itself: content taller than
  // the screen, so it opens at the top instead of scrolling to that control, and touch, where moving
  // to a control would pop up the keyboard or highlight a button. Pass `initialFocus` to override.
  const defaultInitialFocus = React.useCallback((openType: string) => {
    const popup = popupRef.current;
    if (!popup) return true;
    const viewport = popup.closest<HTMLElement>('[data-slot=dialog-viewport]');
    const tall = popup.scrollHeight > popup.clientHeight + 1 || (viewport != null && viewport.scrollHeight > viewport.clientHeight + 1);
    return openType === 'touch' || tall ? popup : true;
  }, []);
  const popupProps = {
    'data-slot': 'dialog-content',
    'data-stacked': nest.stacked || undefined,
    'data-settling': nest.settling || undefined,
    ref: setPopupRef,
    initialFocus: initialFocus ?? defaultInitialFocus,
    style: { ...nest.style, ...(drawer && drawerMotionStyle), ...style },
  };

  // The root renders the stack wrapper; nested dialogs portal into it.
  const portalProps = { container: isRoot ? container : stack?.container };
  const wrap = (node: React.ReactNode) =>
    isRoot ? (
      <div
        ref={stack?.setContainer}
        data-slot="dialog-stack"
        data-closing-all={closingAll || undefined}
        className={drawer ? drawerStackClassName : dialogStackClassName}
      >
        {node}
      </div>
    ) : (
      node
    );

  if (drawer) {
    return (
      // Keeps focused fields above the software keyboard on mobile.
      <BaseDrawer.VirtualKeyboardProvider>
        <BaseDrawer.Portal {...portalProps}>
          <BaseDrawer.Backdrop
            data-slot="dialog-backdrop"
            className={cn(
              backdropClassName,
              // behavior: the scrim fades with the swipe.
              'opacity-[calc(1-var(--drawer-swipe-progress))] duration-450 data-swiping:duration-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]',
              'ease-[cubic-bezier(0.32,0.72,0,1)]',
            )}
          />
          {wrap(
            <BaseDrawer.Viewport data-slot="dialog-viewport" className="fixed inset-0 flex items-end">
              <BaseDrawer.Popup
                className={cn(
                  surfaceClassName,
                  drawerMotionClassName,
                  // behavior. Swipe down to dismiss. Content past 100dvh - 3rem scrolls inside the sheet; the
                  // bottom padding clears the home indicator. Relative, like the desktop popup, so a close button
                  // can sit in its corner in both modes.
                  'relative flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-y-auto overscroll-contain pb-[calc(1rem+env(safe-area-inset-bottom))] data-swiping:select-none',
                  // look
                  'rounded-t-(--dialog-radius) border-t px-5 pt-2',
                  className,
                )}
                {...(props as BaseDrawer.Popup.Props)}
                {...popupProps}
              >
                {/* The drag handle. */}
                <div
                  aria-hidden
                  className={cn(
                    // behavior
                    'shrink-0',
                    // look
                    'mx-auto mb-3 h-1 w-10 rounded-full bg-sub',
                  )}
                />
                {/* Lets mouse users select text without starting a swipe. */}
                {/* Inherits the popup's flex layout, so layout classes on DialogContent (gap, align)
                    behave the same here as on desktop, where the children sit in the popup directly. */}
                <BaseDrawer.Content className="flex flex-col [align-items:inherit] gap-[inherit] [justify-content:inherit]">
                  <StackContext.Provider value={nest.context}>{children}</StackContext.Provider>
                </BaseDrawer.Content>
              </BaseDrawer.Popup>
            </BaseDrawer.Viewport>,
          )}
        </BaseDrawer.Portal>
      </BaseDrawer.VirtualKeyboardProvider>
    );
  }

  return (
    <BaseDialog.Portal {...portalProps}>
      <BaseDialog.Backdrop
        data-slot="dialog-backdrop"
        className={cn(
          backdropClassName,
          // behavior
          'duration-200 ease-out data-ending-style:duration-150',
        )}
      />
      {wrap(
        // behavior. The viewport scrolls, not the popup: a tall dialog grows past the screen and the page behind
        // stays put.
        <BaseDialog.Viewport
          data-slot="dialog-viewport"
          className="group/viewport fixed inset-0 overflow-y-auto overscroll-contain"
        >
          {/* The 3rem gutter above and below is what nested cards' max-h-[calc(100dvh-6rem)] leaves room for. */}
          <div className="flex min-h-full items-center justify-center px-4 py-12 group-data-ending-style/viewport:pointer-events-none">
            <BaseDialog.Popup
              className={cn(
                surfaceClassName,
                dialogMotionClassName,
                // behavior
                'relative flex w-full flex-col',
                // look
                // A plate: a hairline border with a second rule 4px inside it, lifted off the page.
                'max-w-md rounded-(--dialog-radius) border p-6 shadow-[inset_0_0_0_4px_var(--bg-base),inset_0_0_0_5px_var(--stroke-soft),0_1px_0_var(--stroke-soft),0_20px_40px_-20px_rgb(0_0_0/0.3)]',
                className,
              )}
              {...props}
              {...popupProps}
            >
              <StackContext.Provider value={nest.context}>{children}</StackContext.Provider>
            </BaseDialog.Popup>
          </div>
        </BaseDialog.Viewport>,
      )}
    </BaseDialog.Portal>
  );
}

export function DialogTitle({ className, ...props }: WithClassName<BaseDialog.Title.Props>) {
  return (
    <BaseDialog.Title
      data-slot="dialog-title"
      className={cn(
        // look
        'font-serif text-[22px] leading-7 font-medium tracking-[-0.01em] text-strong',
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: WithClassName<BaseDialog.Description.Props>) {
  return (
    <BaseDialog.Description
      data-slot="dialog-description"
      className={cn(
        // look
        'mt-1.5 text-pretty text-soft',
        className,
      )}
      {...props}
    />
  );
}
