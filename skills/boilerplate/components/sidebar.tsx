import * as React from 'react';
import { createPortal } from 'react-dom';
import { Drawer as BaseDrawer } from '@base-ui/react/drawer';
import { ScrollArea } from '@base-ui/react/scroll-area';
import { Tooltip } from '@base-ui/react/tooltip';
import { useRender } from '@base-ui/react/use-render';
import { PanelLeft, PanelRight, X } from 'lucide-react';
import { cn } from 'cn';

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* Desktop: the sidebar sits beside the page, expanded or collapsed to an    */
/* icon rail (`open`). Below 768px: a drawer over the page, closed until      */
/* asked (`openMobile`), always expanded.                                     */
/* -------------------------------------------------------------------------- */

// Matches Tailwind's `md` breakpoint, which hides the desktop sidebar before hydration (see `Sidebar`).
const MOBILE_QUERY = '(max-width: 767px)';
const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const useIsMobile = () =>
  React.useSyncExternalStore(subscribe, () => window.matchMedia(MOBILE_QUERY).matches, () => false);

type Side = 'left' | 'right';

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  /** Toggles whichever applies: the desktop sidebar, or the drawer on mobile. */
  toggle: () => void;
  id: string;
  triggerRef: React.RefObject<HTMLElement | null>;
  /** The provider's element: the mobile drawer portals into it, so it keeps --sidebar-width and the app's styles. */
  root: HTMLDivElement | null;
  /** Mobile: the open drawer, which SidebarPanel portals into, and whether the panel covers the sidebar there. */
  drawer: HTMLElement | null;
  setDrawer: (drawer: HTMLElement | null) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  /** The expanded width in px set by SidebarResizer (or the app); undefined: --sidebar-width's default. */
  width: number | undefined;
  setWidth: (width: number | undefined) => void;
  /** Which edge the Sidebar sits on, for the trigger's icon and the panel's border. */
  side: Side;
  setSide: (side: Side) => void;
  /** The `aria-keyshortcuts` of the toggle shortcut, for the trigger. */
  shortcut: string | undefined;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

// For rows inside the desktop sidebar. `rail`: the sidebar is the icon rail and rows show as icons. `tooltips`: they
// name themselves beside it (not in peek mode, where hovering shows the whole sidebar instead). Rows anywhere else (a
// SidebarPanel, the drawer) stay ordinary rows even while the sidebar is collapsed.
// What a row needs, apart from the provider's context: whether it sits in the rail, and the way to expand the sidebar.
// Rows read only this, so a change elsewhere in the sidebar (its width, the drawer, the shortcut) never re-renders them.
const RailContext = React.createContext({ rail: false, tooltips: false, side: 'left' as Side, setOpen: (_open: boolean) => {} });

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within <SidebarProvider>.');
  return context;
}

/* -------------------------------------------------------------------------- */
/* A keyboard shortcut, in `aria-keyshortcuts` order like the menu and input  */
/* skills: modifiers first (`meta+ctrl+alt+shift+`), then the key. `ctrl` is  */
/* ⌘ on a Mac.                                                                */
/* -------------------------------------------------------------------------- */

const isMac = () => /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

function parseShortcut(keys: string, mac: boolean) {
  const parts = keys.toLowerCase().split('+');
  const key = parts.pop() ?? '';
  const has = (modifier: string) => parts.includes(modifier);
  const shortcut = { meta: has('meta') || (mac && has('ctrl')), ctrl: !mac && has('ctrl'), alt: has('alt'), shift: has('shift'), key };
  const name = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1);
  const aria = [shortcut.meta && 'Meta', shortcut.ctrl && 'Control', shortcut.alt && 'Alt', shortcut.shift && 'Shift', name];
  return { ...shortcut, aria: aria.filter(Boolean).join('+') };
}

type SidebarProviderProps = React.ComponentProps<'div'> & {
  /** Desktop only: expanded (true) or collapsed (false). The mobile drawer always starts closed. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The expanded width in px (SidebarResizer changes it). Leave it out for --sidebar-width's default. */
  width?: number;
  defaultWidth?: number;
  onWidthChange?: (width: number | undefined) => void;
  /** A shortcut that toggles the sidebar (or the drawer), e.g. `ctrl+b` (⌘B on a Mac). */
  keys?: string;
};

export function SidebarProvider({
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  width: widthProp,
  defaultWidth,
  onWidthChange,
  keys,
  className,
  style,
  ...props
}: SidebarProviderProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;
  const [uncontrolledWidth, setUncontrolledWidth] = React.useState(defaultWidth);
  const width = widthProp ?? uncontrolledWidth;
  const [openMobile, setOpenMobile] = React.useState(false);
  const isMobile = useIsMobile();
  const id = React.useId();
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const [root, setRoot] = React.useState<HTMLDivElement | null>(null);
  const [drawer, setDrawer] = React.useState<HTMLElement | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [side, setSide] = React.useState<Side>('left');
  const [shortcut, setShortcut] = React.useState<string>();

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );
  const setWidth = React.useCallback(
    (next: number | undefined) => {
      if (widthProp === undefined) setUncontrolledWidth(next);
      onWidthChange?.(next);
    },
    [widthProp, onWidthChange],
  );
  const toggle = React.useCallback(
    () => (isMobile ? setOpenMobile((value) => !value) : setOpen(!open)),
    [isMobile, open, setOpen],
  );

  // Widening the window past the breakpoint leaves the drawer behind: forget it was open, or it would be open again
  // the next time the window narrows.
  React.useEffect(() => {
    if (!isMobile) setOpenMobile(false);
  }, [isMobile]);

  // The toggle shortcut. Not while typing: ⌘B is bold in a text editor.
  React.useEffect(() => {
    if (!keys) return;
    const parsed = parseShortcut(keys, isMac());
    setShortcut(parsed.aria);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.metaKey !== parsed.meta || event.ctrlKey !== parsed.ctrl) return;
      if (event.altKey !== parsed.alt || event.shiftKey !== parsed.shift) return;
      if (event.key.toLowerCase() !== parsed.key && event.code.toLowerCase() !== `key${parsed.key}`) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return;
      if (root?.closest('[inert], [aria-hidden=true]')) return;
      event.preventDefault();
      toggle();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      setShortcut(undefined);
    };
  }, [keys, toggle, root]);

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggle,
      id,
      triggerRef,
      root,
      drawer,
      setDrawer,
      panelOpen,
      setPanelOpen,
      width,
      setWidth,
      side,
      setSide,
      shortcut,
    }),
    [open, setOpen, openMobile, isMobile, toggle, id, root, drawer, panelOpen, width, setWidth, side, shortcut],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        ref={setRoot}
        data-slot="sidebar-provider"
        className={cn(
          // behavior
          'flex min-h-svh w-full',
          className,
        )}
        // --sidebar-width-icon: the rail. It's a row (2rem, square in the rail) plus the group padding on both sides,
        // so icons sit centered. Change it with the row height and the group padding.
        // --sidebar-top: what sits above the sidebar (an app bar), so it sticks below it and fills the rest.
        style={
          {
            '--sidebar-width': width === undefined ? '16rem' : `${width}px`,
            '--sidebar-width-icon': '3rem',
            '--sidebar-panel-width': '15rem',
            '--sidebar-top': '0px',
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {/* One provider for every rail tooltip: once one is showing, moving to the next row shows its own at once. */}
        <Tooltip.Provider delay={300} closeDelay={0}>
          {props.children}
        </Tooltip.Provider>
      </div>
    </SidebarContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

type SidebarProps = React.ComponentProps<'div'> & {
  /** Names the navigation landmark inside. */
  label?: string;
  /**
   * What collapsing does on desktop. `icon` (default): the sidebar narrows to a rail of icons, each row's `tooltip`
   * naming it. `peek`: the same rail, and hovering it (or tabbing into it) shows the whole sidebar over the page until
   * the pointer and focus leave. `offcanvas`: it slides away completely.
   */
  collapsible?: 'icon' | 'peek' | 'offcanvas';
  /** The edge it sits on. Place it after SidebarInset for `right`. On phones its drawer slides in from that edge. */
  side?: Side;
};

// look. The border is on the edge that faces the page.
const sidebarLook = 'border-soft bg-weak text-[13px] text-strong data-[side=left]:border-r data-[side=right]:border-l';

// Peek opens the moment the pointer reaches the rail, and closes this long after it leaves (and focus has left, and
// no menu opened from inside is still open), so overshooting the edge by a few pixels doesn't start it closing.
const PEEK_CLOSE_DELAY = 150;

// The peek's motion. Opening and closing are each their own animation, both on an ease-out cubic: moving from the
// first frame, the distance spread evenly over the frames (no leap, no long crawl at the end). Closing is shorter, as
// exits are. Not a reversed opening: played backwards, an ease-out is an ease-in, which stalls first and snaps last.
const PEEK_OPEN_DURATION = 240;
const PEEK_CLOSE_DURATION = 180;
const PEEK_EASING = 'cubic-bezier(0.33, 1, 0.68, 1)';

type PeekState = 'closed' | 'open' | 'closing';

export function Sidebar({
  className,
  children,
  label = 'Sidebar',
  collapsible = 'icon',
  side = 'left',
  onClick,
  ...props
}: SidebarProps) {
  const { open, setOpen, openMobile, setOpenMobile, isMobile, id, triggerRef, root, setDrawer, panelOpen, setSide } = useSidebar();
  const ref = React.useRef<HTMLDivElement>(null);
  const navRef = React.useRef<HTMLElement>(null);

  React.useLayoutEffect(() => setSide(side), [side, setSide]);

  // Collapsing hides things that may have focus: the whole sidebar (offcanvas, made inert) or a label, badge or
  // action (the rail). Then move focus to the trigger instead of letting it drop to <body>, where the next Tab
  // would start from the top of the page. The new styles already apply when this runs.
  React.useLayoutEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    if (open || !active || !ref.current?.contains(active)) return;
    if (collapsible === 'offcanvas' || !active.checkVisibility()) triggerRef.current?.focus();
  }, [open, collapsible, triggerRef]);

  /* Peek ------------------------------------------------------------------ */

  const canPeek = collapsible === 'peek' && !open && !isMobile;
  const [peek, setPeek] = React.useState<PeekState>('closed');
  const peeking = canPeek && peek !== 'closed';
  const peekRef = React.useRef(peek);
  peekRef.current = peek;
  const innerRef = React.useRef<HTMLDivElement>(null);
  const animations = React.useRef<Animation[]>([]);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  // Stays open while the pointer is on it, keyboard focus is in it, or a menu opened from it is open.
  const held = () => {
    const sidebar = ref.current;
    if (!sidebar) return false;
    const active = document.activeElement;
    const keyboardFocus = !!active && sidebar.contains(active) && active.matches(':focus-visible');
    return sidebar.matches(':hover') || keyboardFocus || !!sidebar.querySelector('[data-popup-open]');
  };
  const openPeek = () => {
    clearTimeout(timer.current);
    setPeek('open');
  };
  const closePeek = (delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => !held() && setPeek((state) => (state === 'open' ? 'closing' : state)), delay);
  };

  // A menu opened from the peeking sidebar holds it open; when the menu closes, check again.
  React.useEffect(() => {
    const sidebar = ref.current;
    if (!peeking || !sidebar) return;
    const observer = new MutationObserver(() => closePeek(PEEK_CLOSE_DELAY));
    observer.observe(sidebar, { subtree: true, attributeFilter: ['data-popup-open'] });
    return () => observer.disconnect();
  });

  React.useEffect(() => {
    if (!canPeek) setPeek('closed');
  }, [canPeek]);

  // The motion. The full sidebar lies over the page; its panel (the nav, which clips) slides out from under the rail
  // while its contents slide the other way by exactly as much, so the panel's edge sweeps across the page while every
  // row stays where it is. Two opposite transforms on one timing: both run on the compositor, so no frame waits for
  // layout or paint. Each change of direction starts a new animation from where the panel is at that moment, so
  // hovering again while it closes (or leaving while it opens) turns it around without a jump. The layout effect
  // starts it before the first frame of the peeking layout paints.
  React.useLayoutEffect(() => {
    const outer = ref.current;
    const nav = navRef.current;
    const inner = innerRef.current;
    if (!peeking || !outer || !nav || !inner) {
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [];
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (peek === 'closing') setPeek('closed');
      return;
    }
    // Tucked: the panel behind the rail, `tucked` px toward the screen's edge.
    const tucked = (nav.offsetWidth - outer.offsetWidth) * (side === 'left' ? -1 : 1);
    // From where it is: mid-animation, wherever the running one has it; the first time, tucked.
    const from = animations.current.length ? new DOMMatrixReadOnly(getComputedStyle(nav).transform).m41 : tucked;
    const to = peek === 'open' ? 0 : tucked;
    animations.current.forEach((animation) => animation.cancel());
    const timing: KeyframeAnimationOptions = {
      duration: peek === 'open' ? PEEK_OPEN_DURATION : PEEK_CLOSE_DURATION,
      easing: PEEK_EASING,
      fill: 'forwards',
    };
    const panel = nav.animate({ transform: [`translateX(${from}px)`, `translateX(${to}px)`] }, timing);
    const contents = inner.animate({ transform: [`translateX(${-from}px)`, `translateX(${-to}px)`] }, timing);
    if (peek === 'closing') panel.onfinish = () => peekRef.current === 'closing' && setPeek('closed');
    animations.current = [panel, contents];
  }, [peeking, peek, side]);

  const inRail = !isMobile && !open && collapsible !== 'offcanvas' && !peeking;
  const tooltips = collapsible === 'icon';
  const rail = React.useMemo(() => ({ rail: inRail, tooltips, side, setOpen }), [inRail, tooltips, side, setOpen]);

  const nav = (
    // On a phone, an open SidebarPanel covers the sidebar inside the drawer: what's under it can't take focus.
    <nav
      ref={navRef}
      aria-label={label}
      inert={isMobile && panelOpen}
      className={cn(
        // behavior. A fixed width, so rows never reflow while the outer box animates; in the drawer, no wider than the
        // screen allows. It clips its contents, which the peek slides against it. Peeking, the full-width sidebar lies
        // over the page from the rail's edge, on its own compositor layer.
        'h-full w-(--sidebar-width) overflow-hidden',
        isMobile && 'max-w-full',
        'group-data-peek/sidebar:absolute group-data-peek/sidebar:inset-y-0 group-data-peek/sidebar:will-change-transform group-data-[side=left]/sidebar:group-data-peek/sidebar:left-0 group-data-[side=right]/sidebar:group-data-peek/sidebar:right-0',
        // look. Peeking, the panel repeats the sidebar's own surface and border (the outer box is only as wide as the
        // rail).
        'group-data-peek/sidebar:border-soft group-data-peek/sidebar:bg-weak group-data-[side=left]/sidebar:group-data-peek/sidebar:border-r group-data-[side=right]/sidebar:group-data-peek/sidebar:border-l',
      )}
    >
      <div ref={innerRef} className="flex h-full w-full flex-col group-data-peek/sidebar:will-change-transform">
        <RailContext.Provider value={rail}>{children}</RailContext.Provider>
      </div>
    </nav>
  );

  if (isMobile) {
    return (
      <BaseDrawer.Root open={openMobile} onOpenChange={setOpenMobile} swipeDirection={side}>
        <BaseDrawer.Portal container={root}>
          <BaseDrawer.Backdrop
            className={cn(
              // behavior. The scrim fades with the swipe. z-50: use the project's z-index scale if it has one.
              'fixed inset-0 z-50 opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-300 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none',
              // look. A scrim, like a shadow, stays dark in both themes.
              'bg-black/30',
            )}
          />
          <BaseDrawer.Viewport
            className={cn(
              // behavior
              'fixed inset-0 z-50 flex',
              side === 'right' && 'justify-end',
            )}
          >
            <BaseDrawer.Popup
              ref={setDrawer}
              id={id}
              data-slot="sidebar"
              data-state="expanded"
              data-side={side}
              aria-label={label}
              className={cn(
                'group/sidebar',
                // behavior. Slides in from its edge and follows the finger when swiped closed. Leaves a 3rem strip
                // of page visible, to tap the sidebar shut.
                'relative h-full w-(--sidebar-width) max-w-[calc(100vw-3rem)] overflow-hidden outline-hidden [transform:translateX(var(--drawer-swipe-movement-x,0px))] transition-[transform,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 motion-reduce:transition-none',
                'data-[side=left]:data-starting-style:-translate-x-full data-[side=left]:data-ending-style:-translate-x-full data-[side=right]:data-starting-style:translate-x-full data-[side=right]:data-ending-style:translate-x-full',
                // look
                sidebarLook,
                className,
              )}
              // A row that goes somewhere closes the drawer, so the page it opens isn't left behind it: a link, or a
              // row that navigates on click (a router's push). Rows that open something in place stay: a section's
              // disclosure (`aria-expanded`) or a menu (`aria-haspopup`).
              onClick={(event) => {
                onClick?.(event as React.MouseEvent<HTMLDivElement>);
                const row = (event.target as Element).closest('a[href], [data-slot=sidebar-menu-button]');
                if (!row || event.defaultPrevented) return;
                if (row.hasAttribute('aria-expanded') || row.hasAttribute('aria-haspopup')) return;
                setOpenMobile(false);
              }}
            >
              {nav}
            </BaseDrawer.Popup>
          </BaseDrawer.Viewport>
        </BaseDrawer.Portal>
      </BaseDrawer.Root>
    );
  }

  // The outer box animates its width; the inner box keeps a fixed width so rows never reflow. Collapsed, the outer
  // box is the rail (or nothing, offcanvas) and the parts below switch to their rail form; peeking, they show expanded
  // while the outer box keeps the rail's width, so the page doesn't move. Below `md` it's hidden by CSS too, so a
  // server-rendered page never flashes the desktop sidebar on a phone.
  return (
    <div
      ref={ref}
      id={id}
      data-slot="sidebar"
      data-state={open || peeking ? 'expanded' : 'collapsed'}
      data-collapsed={open ? undefined : ''}
      data-collapsible={collapsible}
      data-side={side}
      data-peek={peeking ? peek : undefined}
      inert={!open && collapsible === 'offcanvas'}
      onPointerEnter={(event) => canPeek && event.pointerType !== 'touch' && openPeek()}
      onPointerLeave={() => canPeek && closePeek(PEEK_CLOSE_DELAY)}
      // Keyboard users peek by tabbing in; a tap or click on a row doesn't (`:focus-visible` only).
      onFocus={(event) => canPeek && (event.target as Element).matches(':focus-visible') && openPeek()}
      onBlur={(event) => canPeek && !ref.current?.contains(event.relatedTarget as Node | null) && closePeek(0)}
      onKeyDown={(event) => {
        if (peeking && event.key === 'Escape' && !event.defaultPrevented) setPeek('closing');
      }}
      onClick={onClick}
      className={cn(
        // behavior
        'group/sidebar sticky top-(--sidebar-top) h-[calc(100svh-var(--sidebar-top))] w-(--sidebar-width) shrink-0 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none in-data-resizing:transition-none max-md:hidden',
        'data-collapsed:w-(--sidebar-width-icon) data-collapsed:data-[collapsible=offcanvas]:w-0 data-collapsed:data-[collapsible=offcanvas]:border-x-0',
        // Peeking, it lets the panel out over the page on its own side only: the panel's far end, tucked behind the
        // screen's edge while it slides, stays hidden.
        'data-peek:z-40 data-peek:overflow-visible data-peek:data-[side=left]:[clip-path:inset(0_-100vw_0_0)] data-peek:data-[side=right]:[clip-path:inset(0_0_0_-100vw)]',
        // look
        sidebarLook,
        className,
      )}
      {...props}
    >
      {nav}
    </div>
  );
}

type SidebarPanelProps = React.ComponentProps<'div'> & {
  /** Shown or not. The app decides, usually from which section is active. */
  open?: boolean;
  /** Names the navigation landmark inside. */
  label?: string;
};

// A second column next to the sidebar, for one section's own navigation (a Reports section's reports). It slides open
// and closed like the offcanvas sidebar and takes the same parts: SidebarHeader, SidebarContent, SidebarGroup, … .
// On a phone it opens inside the drawer instead, sliding in over the sidebar from the right, so give it a way back
// (a button that closes it) where it's shown there.
const panelLook = 'bg-base text-[13px] text-strong';

export function SidebarPanel({ open = true, label, className, children, ...props }: SidebarPanelProps) {
  const { isMobile, drawer, setPanelOpen, side } = useSidebar();
  const ref = React.useRef<HTMLDivElement>(null);
  const inDrawer = isMobile && drawer != null;

  // Tell the drawer's sidebar it's covered, so it goes inert. A layout effect: the sidebar re-renders before the next
  // frame, which is when focus moves back to it on close.
  React.useLayoutEffect(() => {
    if (!inDrawer) return;
    setPanelOpen(open);
    return () => setPanelOpen(false);
  }, [inDrawer, open, setPanelOpen]);

  // Closing makes it inert: if focus was inside, move it to the sidebar's current row rather than <body>. Opening in
  // the drawer covers the row that opened it, so focus follows into the panel, to its current row if it has one.
  React.useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    if (!open) {
      // In the drawer, the browser may already have dropped focus to <body> as the panel went inert; focus on <body>
      // is never right while the drawer is open, so that counts as having been inside.
      const lost = inDrawer && (document.activeElement == null || document.activeElement === document.body);
      if (!lost && !panel.contains(document.activeElement)) return;
      const root = panel.closest('[data-slot=sidebar-provider]');
      const row = () => root?.querySelector<HTMLElement>('[data-slot=sidebar] > nav [data-active]')?.focus();
      // In the drawer the sidebar is still inert until it re-renders uncovered, so wait a frame there.
      if (inDrawer) requestAnimationFrame(row);
      else row();
      return;
    }
    if (inDrawer && drawer?.contains(document.activeElement) && !panel.contains(document.activeElement)) {
      (panel.querySelector<HTMLElement>('[data-active]') ?? panel.querySelector<HTMLElement>('button, a[href]'))?.focus({
        preventScroll: true,
      });
    }
  }, [open, inDrawer, drawer]);

  const nav = (
    <nav aria-label={label} className="flex h-full w-full flex-col">
      {children}
    </nav>
  );

  if (isMobile) {
    if (!drawer) return null;
    return createPortal(
      <div
        ref={ref}
        data-slot="sidebar-panel"
        data-state={open ? 'open' : 'closed'}
        inert={!open}
        className={cn(
          // behavior. Over the sidebar, inside the drawer (which clips it while it's out to the right). Opening, it's
          // visible at once (so focus can move into it); closing, it hides only once it has slid out.
          'absolute inset-0 z-10 translate-x-full data-[state=open]:translate-x-0 data-[state=closed]:invisible',
          '[transition:translate_300ms_cubic-bezier(0.32,0.72,0,1),visibility_0s] data-[state=closed]:[transition:translate_300ms_cubic-bezier(0.32,0.72,0,1),visibility_0s_300ms] motion-reduce:transition-none',
          // look
          panelLook,
          className,
        )}
        {...props}
      >
        {nav}
      </div>,
      drawer,
    );
  }

  return (
    <div
      ref={ref}
      data-slot="sidebar-panel"
      data-state={open ? 'open' : 'closed'}
      data-side={side}
      inert={!open}
      className={cn(
        // behavior
        'sticky top-(--sidebar-top) h-[calc(100svh-var(--sidebar-top))] w-(--sidebar-panel-width) shrink-0 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none data-[state=closed]:w-0 data-[state=closed]:border-x-0 max-md:hidden',
        // look. The border faces the page, like the sidebar's.
        'border-soft data-[side=left]:border-r data-[side=right]:border-l',
        panelLook,
        className,
      )}
      {...props}
    >
      <nav aria-label={label} className="flex h-full w-(--sidebar-panel-width) flex-col">
        {children}
      </nav>
    </div>
  );
}

const iconButtonClassName = cn(
  // behavior
  'inline-flex items-center justify-center outline-hidden [&>svg]:shrink-0',
  // look
  'size-8 rounded-sm text-soft hover:bg-soft hover:text-strong focus-visible:ring-2 focus-visible:ring-primary [&>svg]:size-4',
);

export function SidebarTrigger({ render, className, onClick, children, ...props }: useRender.ComponentProps<'button'>) {
  const { open, openMobile, isMobile, toggle, id, triggerRef, side, shortcut } = useSidebar();

  return useRender({
    defaultTagName: 'button',
    render,
    ref: triggerRef,
    props: {
      type: render ? undefined : 'button',
      'data-slot': 'sidebar-trigger',
      'aria-label': 'Toggle sidebar',
      'aria-expanded': isMobile ? openMobile : open,
      'aria-controls': id,
      'aria-keyshortcuts': shortcut,
      className: cn(iconButtonClassName, className),
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) toggle();
      },
      children: children ?? (side === 'right' ? <PanelRight /> : <PanelLeft />),
      ...props,
    },
  });
}

// Closes the drawer on a phone, and renders nothing on desktop. The drawer closes with a swipe, Escape or a tap on the
// page beside it, but screen reader and switch users need a button. Put it in the SidebarHeader.
export function SidebarClose({ render, className, onClick, children, ...props }: useRender.ComponentProps<'button'>) {
  const { isMobile, setOpenMobile } = useSidebar();
  const element = useRender({
    defaultTagName: 'button',
    render,
    props: {
      type: render ? undefined : 'button',
      'data-slot': 'sidebar-close',
      'aria-label': children == null ? 'Close sidebar' : undefined,
      className: cn(iconButtonClassName, className),
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpenMobile(false);
      },
      children: children ?? <X />,
      ...props,
    },
  });
  return isMobile ? element : null;
}

type SidebarResizerProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  /** The narrowest the sidebar can be dragged to, in px. Dragging past half of it collapses the sidebar. */
  min?: number;
  /** The widest, in px. */
  max?: number;
  /** One arrow key press, in px. */
  step?: number;
};

// A handle on the sidebar's inner edge. Drag it to resize (the rows follow, live); drag it most of the way in to
// collapse the sidebar, and out from the rail to expand it again. Double-click goes back to the default width. With
// the keyboard it's a separator: ← and → resize, Home and End go to min and max, Enter collapses and expands. The
// width goes through SidebarProvider's `onWidthChange`, to keep. Not on phones. Put it inside Sidebar.
export function SidebarResizer({ min = 192, max = 480, step = 16, className, ...props }: SidebarResizerProps) {
  const { open, setOpen, width, setWidth, isMobile, id, side, root } = useSidebar();
  const ref = React.useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = React.useState<number>();
  // The width it's showing now, for aria-valuenow: the set one, or the default's, measured.
  const current = width ?? measured;
  React.useLayoutEffect(() => {
    if (width === undefined) setMeasured(ref.current?.closest('[data-slot=sidebar]')?.querySelector('nav')?.offsetWidth);
  }, [width]);

  if (isMobile) return null;

  const clamp = (value: number) => Math.round(Math.min(max, Math.max(min, value)));
  // Toward the page is wider: right for a left sidebar, left for a right one.
  const outward = side === 'left' ? 1 : -1;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const handle = event.currentTarget;
    // From the width it shows: the sidebar's, or the rail's when collapsed.
    const start = { x: event.clientX, width: handle.closest<HTMLElement>('[data-slot=sidebar]')?.offsetWidth ?? min };
    let expanded = open;
    const expand = (next: boolean) => next !== expanded && setOpen((expanded = next));
    handle.setPointerCapture(event.pointerId);
    // No width transition while dragging, a resize cursor everywhere, and no text selection.
    root?.setAttribute('data-resizing', '');
    const previous = document.documentElement.style.cursor;
    document.documentElement.style.cursor = 'col-resize';
    document.documentElement.style.userSelect = 'none';

    // Live, the width goes straight to the variable the rows follow, with no render per move; it's set (and
    // onWidthChange called) once, on release.
    let last: number | undefined;
    const onMove = (move: PointerEvent) => {
      const next = start.width + (move.clientX - start.x) * outward;
      if (next < min / 2) return expand(false);
      expand(true);
      last = clamp(next);
      root?.style.setProperty('--sidebar-width', `${last}px`);
    };
    const onUp = () => {
      if (last !== undefined) setWidth(last);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      root?.removeAttribute('data-resizing');
      document.documentElement.style.cursor = previous;
      document.documentElement.style.userSelect = '';
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const now = current ?? min;
    const by = { ArrowRight: step * outward, ArrowLeft: -step * outward }[event.key];
    if (by !== undefined) setWidth(clamp(now + by));
    else if (event.key === 'Home') setWidth(min);
    else if (event.key === 'End') setWidth(max);
    else if (event.key === 'Enter') setOpen(!open);
    else return;
    event.preventDefault();
    if (event.key !== 'Enter' && !open) setOpen(true);
  };

  return (
    <div
      ref={ref}
      data-slot="sidebar-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-controls={id}
      // Collapsed, it's at the rail, below `min`: a separator's value has to stay in its range, so it reports `min`
      // and says what it means.
      aria-valuenow={open ? current : min}
      aria-valuetext={open ? undefined : 'Collapsed'}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={() => {
        setWidth(undefined);
        setOpen(true);
      }}
      onKeyDown={onKeyDown}
      className={cn(
        // behavior. A strip along the inner edge, over the border; its line shows on hover, while dragging and on
        // keyboard focus. Hidden in the offcanvas sidebar's collapsed state with the rest of it (inert, width 0).
        'absolute inset-y-0 z-20 w-2 cursor-col-resize touch-none outline-hidden select-none group-data-[side=left]/sidebar:-right-px group-data-[side=right]/sidebar:-left-px',
        'after:absolute after:inset-y-0 after:w-px after:transition-colors group-data-[side=left]/sidebar:after:right-0 group-data-[side=right]/sidebar:after:left-0',
        // look
        'hover:after:w-0.5 hover:after:bg-sub active:after:bg-strong focus-visible:after:w-0.5 focus-visible:after:bg-primary',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarContent({ className, children, ...props }: ScrollArea.Root.Props & { className?: string }) {
  const viewport = React.useRef<HTMLDivElement>(null);

  // The current row is in view: on load, whenever another row becomes current (`data-active`) and whenever the
  // sidebar turns into the rail or back, it scrolls just far enough to show it. The viewport scrolls, never the page.
  React.useLayoutEffect(() => {
    const scroller = viewport.current;
    if (!scroller) return;
    const reveal = () => {
      const row = scroller.querySelector('[data-active]');
      if (!row) return;
      const box = scroller.getBoundingClientRect();
      const rect = row.getBoundingClientRect();
      const margin = 8; // a group's padding, so the row isn't flush with the edge
      if (rect.top < box.top) scroller.scrollTop -= box.top - rect.top + margin;
      else if (rect.bottom > box.bottom) scroller.scrollTop += rect.bottom - box.bottom + margin;
    };
    reveal();
    const observer = new MutationObserver(reveal);
    observer.observe(scroller, { subtree: true, attributeFilter: ['data-active'] });
    // Collapsing to the rail and expanding again (or peeking) hides and shows section labels and nested rows, which
    // moves the current row; keep it in view across that too.
    const sidebar = scroller.closest('[data-slot=sidebar]');
    if (sidebar) observer.observe(sidebar, { attributeFilter: ['data-state'] });
    return () => observer.disconnect();
  }, []);

  return (
    <ScrollArea.Root
      data-slot="sidebar-content"
      className={cn(
        // behavior
        'min-h-0 flex-1',
        className,
      )}
      {...props}
    >
      {/* The viewport is a focus stop when it can scroll, so it shows a ring. Content lets the scrollbar
          follow the rows growing (a section expanding) instead of only the viewport's own size. */}
      <ScrollArea.Viewport
        ref={viewport}
        className={cn(
          // behavior
          'h-full outline-hidden',
          // look
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
        )}
      >
        {/* Base UI sizes the content to fit its widest child (`min-width: fit-content`, for sideways scrolling). A
            sidebar never scrolls sideways: held to the viewport's width, a long label truncates instead of widening
            every row past the edge and pushing badges and actions out of sight. */}
        <ScrollArea.Content className="min-w-0!">{children}</ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        className={cn(
          // behavior
          'flex opacity-0 transition-opacity data-hovering:opacity-100 data-scrolling:opacity-100',
          // look
          'w-1.5 p-px',
        )}
      >
        <ScrollArea.Thumb
          className={cn(
            // behavior
            'w-full',
            // look
            'rounded-full bg-sub',
          )}
        />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Static parts                                                               */
/* Every part takes `render` (Base UI's composition prop) and `className`.    */
/* -------------------------------------------------------------------------- */

function part<T extends React.ElementType>(defaultTagName: T, slot: string, behavior: string, look = '') {
  function Part({ render, className, ...props }: useRender.ComponentProps<T>) {
    return useRender({
      defaultTagName: defaultTagName as keyof React.JSX.IntrinsicElements,
      render,
      props: { 'data-slot': slot, className: cn(behavior, look, className), ...props },
    });
  }
  Part.displayName = slot;
  return Part;
}

// Rows and the small icon buttons on them. Both are used by several parts below.
// In the rail a row becomes a square showing only its first child (the icon, or a logo). The rest stays in the DOM,
// visually hidden, so the row keeps its accessible name.
const rowBehavior = cn(
  'flex w-full min-w-0 items-center text-left outline-hidden select-none [&>svg]:shrink-0 [&>span]:truncate',
  'group-data-[state=collapsed]/sidebar:size-8 group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:p-0! group-data-[state=collapsed]/sidebar:[&>:not(:first-child)]:sr-only',
);
// Hidden in the rail: there's no room, and the rail shows one icon per row.
const hiddenInRail = 'group-data-[state=collapsed]/sidebar:hidden';
// Peek mode: while the peeking panel slides back under the rail, everything the rail doesn't show (labels, badges,
// actions, section labels, nested rows) fades out first, faster than the panel's edge gets to it, so the edge never
// slices through text; a badge's dot fades in as it lands. Icons and the current row's fill, which the rail keeps too,
// stay solid throughout. Opacity only, on the compositor like the slide.
const fadeOnPeekClose =
  'group-data-[collapsible=peek]/sidebar:transition-opacity group-data-[collapsible=peek]/sidebar:duration-100 group-data-[collapsible=peek]/sidebar:ease-out group-data-[peek=closing]/sidebar:opacity-0';
// The ring is inset: rows sit inside collapsible panels (Base UI's Collapsible), which clip an outer ring.
// The gap after the icon equals the row's padding before it, so the icon sits in the middle of the row's first square
// (the square the row becomes in the rail) and the label starts where that square ends. Change them together.
const rowLook = 'h-8 gap-2 rounded-sm px-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset [&>svg]:size-4';
const iconButtonBehavior = 'flex items-center justify-center outline-hidden';
const iconButtonLook =
  'size-6 rounded-sm text-soft hover:bg-sub hover:text-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset [&>svg]:size-4';

// Trailing badges and actions sit 4px in from the row's top-right: (row height − button size) / 2.
// Change it together with the row height and the icon button size.

// A div: most layouts already have a <main>. Render it as one (`render={<main />}`) if yours doesn't.
export const SidebarInset = part('div', 'sidebar-inset', 'flex min-w-0 flex-1 flex-col');
// A hairline under the header while rows scroll under it, and over the footer while more rows are below: Base UI's
// ScrollArea marks those ends (`data-overflow-y-start` / `-end`). A shadow, not a border, so nothing moves by a pixel.
export const SidebarHeader = part(
  'div',
  'sidebar-header',
  'relative z-10 flex flex-col transition-shadow motion-reduce:transition-none',
  'gap-1 p-2 has-[~[data-slot=sidebar-content][data-overflow-y-start]]:shadow-[0_1px_0_var(--stroke-soft)]',
);
export const SidebarFooter = part(
  'div',
  'sidebar-footer',
  'relative z-10 flex flex-col transition-shadow motion-reduce:transition-none',
  'gap-1 p-2 [[data-slot=sidebar-content][data-overflow-y-end]~&]:shadow-[0_-1px_0_var(--stroke-soft)]',
);
export const SidebarSeparator = part('hr', 'sidebar-separator', '', 'mx-2 border-soft');

// gap-px: the label sits off the first row by the same 1px rows keep between them (SidebarMenu's gap).
export const SidebarGroup = part('div', 'sidebar-group', 'relative flex flex-col', 'gap-px p-2');
// Followed by a SidebarGroupAction, it stops short of it, like a row before its badge: the action's 24px, its 4px
// inset, a 4px gap (pr-8). Matched on its own next siblings.
export const SidebarGroupLabel = part(
  'div',
  'sidebar-group-label',
  cn(rowBehavior, hiddenInRail, fadeOnPeekClose, 'has-[~[data-slot=sidebar-group-action]]:pr-8'),
  cn(rowLook, 'text-[10.5px] font-medium tracking-[0.14em] text-soft uppercase [button]:hover:text-strong'),
);
// Sits on the label row (top-right of the group): group padding + the trailing inset above.
// Kept outside the label so it never nests in a trigger.
export const SidebarGroupAction = part(
  'button',
  'sidebar-group-action',
  cn(iconButtonBehavior, 'absolute top-3 right-3', hiddenInRail, fadeOnPeekClose),
  iconButtonLook,
);


export const SidebarMenu = part('ul', 'sidebar-menu', 'flex flex-col', 'gap-px');
export const SidebarMenuItem = part('li', 'sidebar-menu-item', 'group/menu-item relative');
// A nested SidebarMenu: same rows, indented with a guide line. The line hangs from the parent's icon (ml-4 = the row
// padding + half an icon, from the item's edge), and the line plus pl-1.75 make the row's gap (8px), so nested icons
// start exactly where the parent's label does. Change them with the row padding, icon size and gap. pt-px keeps the
// rows' 1px rhythm from the parent row; the list after it adds its own.
export const SidebarMenuSub = part('ul', 'sidebar-menu-sub', cn('flex flex-col', hiddenInRail, fadeOnPeekClose), 'ml-4 gap-px border-l border-dotted border-sub pt-px pl-1.75');

// Trailing slot: either a badge or an action per row, not both. In the rail a badge becomes a dot on its row's icon,
// so a count (unread mail) isn't lost when the sidebar collapses; its text stays for screen readers, clipped.
// It tells its row how wide it is (--sidebar-menu-badge-width, on the item), so the row's label stops short of it
// however long the count gets ("999+").
const badgeClassName = cn(
  cn(
    // behavior
    'pointer-events-none absolute top-1 right-1 flex items-center justify-center tabular-nums',
    'group-data-[state=collapsed]/sidebar:right-auto group-data-[state=collapsed]/sidebar:overflow-hidden group-data-[state=collapsed]/sidebar:text-transparent',
    fadeOnPeekClose,
  ),
  cn(
    // look
    'h-6 min-w-6 px-1 font-mono text-[11px] text-soft',
    // The dot is centered on the icon's top-right corner: the icon spans 8–24px of the 32px row (row padding, 16px
    // icon), so a 6px dot sits 5px in from the top and 21px from the left. Change it with the row padding and icon.
    'group-data-[state=collapsed]/sidebar:top-1.25 group-data-[state=collapsed]/sidebar:left-5.25 group-data-[state=collapsed]/sidebar:size-1.5 group-data-[state=collapsed]/sidebar:min-w-0 group-data-[state=collapsed]/sidebar:rounded-full group-data-[state=collapsed]/sidebar:bg-primary group-data-[state=collapsed]/sidebar:p-0',
  ),
);

export function SidebarMenuBadge({ render, className, ...props }: useRender.ComponentProps<'span'>) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const badge = ref.current;
    const item = badge?.parentElement;
    if (!badge || !item) return;
    const measure = () => item.style.setProperty('--sidebar-menu-badge-width', `${badge.offsetWidth}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(badge);
    return () => {
      observer.disconnect();
      item.style.removeProperty('--sidebar-menu-badge-width');
    };
  }, []);
  return useRender({
    defaultTagName: 'span',
    render,
    ref,
    props: { 'data-slot': 'sidebar-menu-badge', className: cn(badgeClassName, className), ...props },
  });
}

type SidebarMenuActionProps = useRender.ComponentProps<'button'> & { showOnHover?: boolean };

export function SidebarMenuAction({ render, className, showOnHover = false, ...props }: SidebarMenuActionProps) {
  return useRender({
    defaultTagName: 'button',
    render,
    props: {
      type: 'button',
      'data-slot': 'sidebar-menu-action',
      className: cn(
        // behavior
        iconButtonBehavior,
        'absolute top-1 right-1',
        hiddenInRail,
        fadeOnPeekClose,
        // Shown while its own row is hovered or focused (the row is its `peer`, so a nested row's hover doesn't
        // reveal its parent's action), and always on touch screens, which can't hover.
        showOnHover &&
          '[@media(hover:hover)]:opacity-0 peer-hover/menu-button:opacity-100 peer-focus-visible/menu-button:opacity-100 hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100',
        // look
        iconButtonLook,
        className,
      ),
      ...props,
    },
  });
}

type SidebarMenuButtonProps = useRender.ComponentProps<'button'> & {
  isActive?: boolean;
  /** Names the row in the rail, where only its icon shows. Shown beside it while the sidebar is collapsed. */
  tooltip?: React.ReactNode;
};

export function SidebarMenuButton({
  render,
  className,
  isActive = false,
  tooltip,
  onClick,
  ...props
}: SidebarMenuButtonProps) {
  const { rail: inRail, tooltips, side, setOpen } = React.useContext(RailContext);
  const row = useRender({
    defaultTagName: 'button',
    render,
    props: {
      type: render ? undefined : 'button',
      'data-slot': 'sidebar-menu-button',
      'data-active': isActive || undefined,
      'aria-current': isActive ? 'page' : undefined,
      className: cn(
        // behavior. Leaves room for a trailing badge or action: its width + the trailing inset (4px) + a 4px gap, and
        // at least pr-8. A badge reports its own width, so a long count still clears the label. Matched on the
        // button's own next siblings, never an ancestor's, so nested rows don't inherit it.
        rowBehavior,
        'peer/menu-button has-[~[data-slot=sidebar-menu-action]]:pr-8 has-[~[data-slot=sidebar-menu-badge]]:pr-[max(2rem,calc(var(--sidebar-menu-badge-width,1.5rem)+0.5rem))]',
        // Peek mode (see fadeOnPeekClose): closing, the row's content but its first child (the icon) fades out. Its
        // fill stays (the current row's slip), shrinking with the panel's edge as it grew with it on opening.
        'group-data-[collapsible=peek]/sidebar:*:transition-opacity group-data-[collapsible=peek]/sidebar:*:duration-100 group-data-[peek=closing]/sidebar:[&>:not(:first-child)]:opacity-0',
        // look
        rowLook,
        // The current page is a slip of paper on the page. Its edge is drawn inside the row (an inset ring), like a
        // field's border, so it spans exactly the row's width: an outer ring would make it look 2px wider than the
        // fields and rows beside it.
        'text-sub hover:bg-soft hover:text-strong data-popup-open:bg-soft [&>svg]:text-soft',
        'data-active:bg-base data-active:text-strong data-active:shadow-[inset_0_0_0_1px_var(--stroke-soft)] data-active:[&>svg]:text-strong',
        className,
      ),
      // In the rail, a row that opens nested rows (a disclosure: `aria-expanded`, not a menu's `aria-haspopup`) has
      // nowhere to show them, so it expands the sidebar instead, with its section open. If the section was already
      // open, the click keeps it open rather than closing it out of sight. Base UI runs a caller's handler before
      // its own, so `preventBaseUIHandler` stops the toggle. A row that opens a SidebarPanel (its `aria-controls`)
      // isn't one: the panel opens beside the rail, so it's left to do that.
      onClick: (event: React.MouseEvent<HTMLButtonElement> & { preventBaseUIHandler?: () => void }) => {
        onClick?.(event);
        const button = event.currentTarget;
        if (event.defaultPrevented || !inRail) return;
        if (!button.hasAttribute('aria-expanded') || button.hasAttribute('aria-haspopup')) return;
        const controls = button.getAttribute('aria-controls');
        if (controls && document.getElementById(controls)?.matches('[data-slot=sidebar-panel]')) return;
        if (button.getAttribute('aria-expanded') === 'true') event.preventBaseUIHandler?.();
        setOpen(true);
      },
      ...props,
    },
  });
  // Tooltips only in an icon rail; other sidebars never show one, so they mount none.
  if (tooltip == null || !tooltips) return row;

  return (
    <Tooltip.Root disabled={!inRail}>
      <Tooltip.Trigger render={row} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side === 'right' ? 'left' : 'right'} sideOffset={8} className="z-50">
          <Tooltip.Popup
            data-slot="sidebar-tooltip"
            className={cn(
              // behavior
              'origin-(--transform-origin) transition-[opacity,scale] duration-100 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0 data-instant:transition-none motion-reduce:transition-none',
              // look
              'rounded-sm bg-strong px-2 py-1 text-[12px] font-medium text-inverse shadow-[0_8px_24px_-12px_rgb(0_0_0/0.3)]',
            )}
          >
            {tooltip}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
