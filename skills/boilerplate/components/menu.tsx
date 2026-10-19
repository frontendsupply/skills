import * as React from 'react';
import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { Menubar as BaseMenubar } from '@base-ui/react/menubar';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from 'cn';
import { getHotKeyHint, hotkeyMacCompat, likelyWithKeyboard } from 'keyux';

type WithClassName<P> = Omit<P, 'className'> & { className?: string };

export const Menu = BaseMenu.Root;

export function MenuGroup(props: BaseMenu.Group.Props) {
  return <BaseMenu.Group data-slot="menu-group" {...props} />;
}

// Unstyled on purpose: render it into the button that opens the menu.
export function MenuTrigger(props: BaseMenu.Trigger.Props) {
  return <BaseMenu.Trigger data-slot="menu-trigger" {...props} />;
}

// Shared by every panel. While a submenu is open (a trigger inside has `data-popup-open`), the panel's
// rows stop taking pointer input and dim, and the panel stops scrolling, so the stack can't drift out
// from under the open child. That's what turns open panels into a stack.
const popupClassName = cn(
  // behavior
  'max-h-(--available-height) overflow-x-hidden overflow-y-auto overscroll-contain outline-hidden *:transition-opacity has-data-popup-open:overflow-hidden has-data-popup-open:*:pointer-events-none',
  // look. The radius is set once, through --menu-radius: the submenu's open animation clips to it.
  // Padding + border must add up to PANEL_INSET.
  '[--menu-radius:4px] rounded-(--menu-radius) border border-soft bg-base p-1 text-[13px] text-strong has-data-popup-open:*:opacity-40',
);

const itemClassName = cn(
  // behavior. Rows never wrap: a long label widens the panel instead of spilling into the next row.
  'flex w-full cursor-default items-center text-left whitespace-nowrap outline-hidden select-none [&_svg]:shrink-0',
  // look. The gap after the icon equals the padding before it, so the icon sits in the middle of the row's first
  // square and the label starts where that square ends. Change them together.
  'h-8 gap-2 rounded-xs px-2 data-highlighted:bg-soft data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:text-soft data-highlighted:[&_svg]:text-strong',
);

const separatorClassName = cn(
  // look. Full bleed: the negative margin cancels the panel's padding.
  '-mx-1 my-1 h-px bg-sub',
);

type MenuContentProps = WithClassName<BaseMenu.Popup.Props> &
  Pick<BaseMenu.Positioner.Props, 'side' | 'align' | 'sideOffset' | 'alignOffset'> & {
    /**
     * Keeps the closed menu in the DOM (hidden), so its rows' shortcuts work without opening it. On by default;
     * turn it off for a menu repeated many times on a page, like one per table row.
     */
    keepMounted?: boolean;
    /** Where the portal renders (default: document.body). */
    container?: BaseMenu.Portal.Props['container'];
  };

// Portal + Positioner + Popup in one part. To match the trigger's width, add
// `w-(--anchor-width) data-[side=bottom]:origin-top data-[side=top]:origin-bottom`: a menu as wide as its trigger grows
// from the trigger's middle edge, not from a corner (Base UI's --transform-origin follows `align`).
export function MenuContent({
  className,
  container,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  alignOffset = 0,
  keepMounted = true,
  ...props
}: MenuContentProps) {
  return (
    <BaseMenu.Portal keepMounted={keepMounted} container={container}>
      <BaseMenu.Positioner
        className="z-50 outline-hidden"
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
      >
        <BaseMenu.Popup data-slot="menu-content" className={cn(contentClassName, className)} {...props} />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

// The popup's own classes, shared by MenuContent and ContextMenuContent.
const contentClassName = cn(
  popupClassName,
  // behavior
  'origin-(--transform-origin) transition-[scale,opacity] duration-100 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
  // look
  'min-w-52',
);

/* -------------------------------------------------------------------------- */
/* Context menu: the same rows, opened at the pointer by a right click or a   */
/* long press. Base UI's Context Menu is built from the Menu's own parts, so  */
/* MenuItem, checkbox and radio items, shortcuts and stacked submenus all     */
/* work inside it.                                                            */
/* -------------------------------------------------------------------------- */

export const ContextMenu = BaseContextMenu.Root;

// The area that opens it. Unstyled on purpose: wrap the card, row or canvas it belongs to.
export function ContextMenuTrigger({ className, ...props }: WithClassName<BaseContextMenu.Trigger.Props>) {
  return (
    <BaseContextMenu.Trigger
      data-slot="context-menu-trigger"
      className={cn(
        // behavior. A long press opens the menu, so it mustn't also select text or open the system callout.
        'select-none [-webkit-touch-callout:none]',
        className,
      )}
      {...props}
    />
  );
}

// Portal + Positioner + Popup in one part, placed at the pointer.
export function ContextMenuContent({ className, ...props }: WithClassName<BaseMenu.Popup.Props>) {
  return (
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner className="z-50 outline-hidden">
        <BaseContextMenu.Popup data-slot="context-menu-content" className={cn(contentClassName, className)} {...props} />
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  );
}

/* -------------------------------------------------------------------------- */
/* Menubar: a row of menus, as in a desktop app. Put a Menu per entry inside, */
/* each opened by a MenubarTrigger. Its keyboard and hover behavior is Base   */
/* UI's: https://base-ui.com/react/components/menubar                         */
/* -------------------------------------------------------------------------- */

export function Menubar({ className, ...props }: WithClassName<BaseMenubar.Props>) {
  return (
    <BaseMenubar
      data-slot="menubar"
      className={cn(
        // behavior
        'flex items-center data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
        // look
        'gap-0.5 rounded-sm border border-soft bg-base p-1 shadow-[0_1px_0_var(--stroke-soft)]',
        className,
      )}
      {...props}
    />
  );
}

export function MenubarTrigger({ className, ...props }: WithClassName<BaseMenu.Trigger.Props>) {
  return (
    <BaseMenu.Trigger
      data-slot="menubar-trigger"
      className={cn(
        // behavior
        'inline-flex items-center outline-hidden select-none',
        // look
        'h-7 rounded-xs px-2.5 text-[13px] font-medium text-strong hover:bg-soft data-popup-open:bg-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset data-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Shortcuts. A MenuShortcut with `keys` tells its row which keys it answers  */
/* to, as `aria-keyshortcuts`; KeyUX (started once in the app) clicks the row */
/* when they're pressed, even with the menu closed.                           */
/* -------------------------------------------------------------------------- */

const ShortcutContext = React.createContext<((keys: string | undefined) => void) | null>(null);

// A row that can take a shortcut: holds the keys its MenuShortcut reports.
function useShortcutRow() {
  const [keys, setKeys] = React.useState<string>();
  const provide = (row: React.ReactNode) => <ShortcutContext.Provider value={setKeys}>{row}</ShortcutContext.Provider>;
  return [keys, provide] as const;
}

export function MenuItem({ className, ...props }: WithClassName<BaseMenu.Item.Props>) {
  const [keys, provide] = useShortcutRow();
  return provide(
    <BaseMenu.Item data-slot="menu-item" aria-keyshortcuts={keys} className={cn(itemClassName, className)} {...props} />,
  );
}

// Checkbox and radio rows show a check at the end of the row when checked (`data-checked`).
const indicatorClassName = cn(
  // behavior
  'ml-auto flex shrink-0',
  // look
  '[&_svg]:text-strong',
);

export function MenuCheckboxItem({ className, children, ...props }: WithClassName<BaseMenu.CheckboxItem.Props>) {
  const [keys, provide] = useShortcutRow();
  return provide(
    <BaseMenu.CheckboxItem data-slot="menu-checkbox-item" aria-keyshortcuts={keys} className={cn(itemClassName, className)} {...props}>
      {children}
      <BaseMenu.CheckboxItemIndicator data-slot="menu-item-indicator" className={indicatorClassName}>
        <Check />
      </BaseMenu.CheckboxItemIndicator>
    </BaseMenu.CheckboxItem>,
  );
}

export function MenuRadioGroup(props: BaseMenu.RadioGroup.Props) {
  return <BaseMenu.RadioGroup data-slot="menu-radio-group" {...props} />;
}

export function MenuRadioItem({ className, children, ...props }: WithClassName<BaseMenu.RadioItem.Props>) {
  const [keys, provide] = useShortcutRow();
  return provide(
    <BaseMenu.RadioItem data-slot="menu-radio-item" aria-keyshortcuts={keys} className={cn(itemClassName, className)} {...props}>
      {children}
      <BaseMenu.RadioItemIndicator data-slot="menu-item-indicator" className={indicatorClassName}>
        <Check />
      </BaseMenu.RadioItemIndicator>
    </BaseMenu.RadioItem>,
  );
}

export function MenuLinkItem({ className, ...props }: WithClassName<BaseMenu.LinkItem.Props>) {
  const [keys, provide] = useShortcutRow();
  return provide(
    <BaseMenu.LinkItem data-slot="menu-item" aria-keyshortcuts={keys} className={cn(itemClassName, className)} {...props} />,
  );
}

export function MenuGroupLabel({ className, ...props }: WithClassName<BaseMenu.GroupLabel.Props>) {
  return (
    <BaseMenu.GroupLabel
      data-slot="menu-group-label"
      className={cn(
        // behavior
        'flex items-center',
        // look
        'h-7 px-2 text-[10.5px] font-medium tracking-[0.14em] text-soft uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator({ className, ...props }: WithClassName<BaseMenu.Separator.Props>) {
  return (
    <BaseMenu.Separator
      data-slot="menu-separator"
      className={cn(separatorClassName, className)}
      {...props}
    />
  );
}

// ⌘ on a Mac, Ctrl elsewhere: write `ctrl+…` and a Mac user presses ⌘. The app's KeyUX setup uses the same.
const macCompat = [hotkeyMacCompat()];
const subscribeNever = () => () => {};

type MenuShortcutProps = React.ComponentProps<'kbd'> & {
  /**
   * The keys, in `aria-keyshortcuts` order: modifiers first (`meta+ctrl+alt+shift+`), then the key, e.g.
   * `ctrl+shift+p`. Pressing them clicks the row. Without `keys`, the children are shown as a plain hint.
   */
  keys?: string;
};

// A row's end, for when it holds more than one thing (a badge and a shortcut): one group at the trailing edge with a
// small gap, instead of two auto margins splitting the free space between them.
export function MenuItemEnd({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="menu-item-end"
      className={cn(
        // behavior
        'ml-auto flex shrink-0 items-center',
        // look
        'gap-1.5',
        className,
      )}
      {...props}
    />
  );
}

export function MenuShortcut({ keys, className, children, ...props }: MenuShortcutProps) {
  const register = React.useContext(ShortcutContext);
  React.useEffect(() => {
    if (!keys || !register) return;
    register(keys);
    return () => register(undefined);
  }, [keys, register]);

  // The hint depends on the platform, so it renders on the client; on touch screens, with no keyboard, it's hidden
  // (the shortcut still works with an external keyboard). It's aria-hidden: the row's aria-keyshortcuts says it.
  const hint = React.useSyncExternalStore(
    subscribeNever,
    () => (keys && likelyWithKeyboard(window) ? getHotKeyHint(window, keys, macCompat) : null),
    () => null,
  );
  const content = children ?? hint;
  if (content == null) return null;

  return (
    <kbd
      data-slot="menu-shortcut"
      aria-hidden={keys ? true : undefined}
      className={cn(
        // behavior
        'ml-auto',
        // look
        'font-mono text-[11px] text-soft',
        className,
      )}
      {...props}
    >
      {content}
    </kbd>
  );
}

/* -------------------------------------------------------------------------- */
/* Submenus: stacked drill-down, no depth limit.                              */
/* A submenu opens as a new panel whose header sits exactly on the row that   */
/* opened it, covering the parent below. Parents stay behind, dimmed.         */
/* -------------------------------------------------------------------------- */

const SubmenuContext = React.createContext<{ close: () => void } | null>(null);

// A thin pass-through: Base UI's own open state stays in charge (controlling it here breaks the
// keyboard focus hand-off into the panel). The header closes it through Base UI's `actionsRef`.
export function MenuSubmenu({ actionsRef: actionsRefProp, ...props }: BaseMenu.SubmenuRoot.Props) {
  const internalRef = React.useRef<BaseMenu.Root.Actions | null>(null);
  const actionsRef = actionsRefProp ?? internalRef;
  const context = React.useMemo(() => ({ close: () => actionsRef.current?.close() }), [actionsRef]);

  return (
    <SubmenuContext.Provider value={context}>
      <BaseMenu.SubmenuRoot actionsRef={actionsRef} {...props} />
    </SubmenuContext.Provider>
  );
}

// A row that drills into its submenu. Opens on click, → or Enter; ←, Esc or the header goes back.
export function MenuSubmenuTrigger({
  className,
  children,
  openOnHover = false,
  ...props
}: WithClassName<BaseMenu.SubmenuTrigger.Props>) {
  return (
    <BaseMenu.SubmenuTrigger
      data-slot="menu-submenu-trigger"
      openOnHover={openOnHover}
      className={cn(
        itemClassName,
        // look
        'data-popup-open:bg-soft',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto" />
    </BaseMenu.SubmenuTrigger>
  );
}

// The panel's padding + border (p-1 + 1px). The submenu opens this far above and to the left of its
// trigger row, so its header lands exactly on the row. Change it together with the panel's look.
const PANEL_INSET = 5;

export function MenuSubmenuContent({ className, ...props }: WithClassName<BaseMenu.Popup.Props>) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner
        className="z-50 outline-hidden"
        side="bottom"
        align="start"
        sideOffset={({ anchor }) => -(anchor.height + PANEL_INSET)}
        alignOffset={-PANEL_INSET}
        // Never flip: the stack only works if every panel opens downward from its row. Near the bottom of the
        // screen it shifts up instead (still covering its parent), so it never collapses to a sliver.
        collisionAvoidance={{ side: 'shift', align: 'shift' }}
      >
        <BaseMenu.Popup
          data-slot="menu-submenu-content"
          className={cn(
            popupClassName,
            // behavior. At least as wide as the parent panel (trigger row + PANEL_INSET on both sides), wider for
            // long labels. Opens by unclipping downward from the header row (--anchor-height is the trigger row's
            // height).
            'max-w-(--available-width) min-w-[calc(var(--anchor-width)+10px)] [clip-path:inset(-3rem)] transition-[clip-path,opacity] duration-200 ease-out data-starting-style:[clip-path:inset(0_0_calc(100%-var(--anchor-height)-5px)_0_round_var(--menu-radius))] data-ending-style:opacity-0 data-ending-style:duration-100',
            className,
          )}
          {...props}
        />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

// The panel's title row. Repeat the trigger's icon and label so the row appears to become the header.
// It stays pinned while the panel scrolls, so the way back is always there. A pointer shortcut only:
// keyboard users have ← and Esc, and screen readers already hear the panel named after its trigger, so
// it's hidden from them and pressing it never takes focus from the rows.
export function MenuSubmenuHeader({ className, children, onClick, ...props }: React.ComponentProps<'div'>) {
  const submenu = React.useContext(SubmenuContext);

  return (
    <div
      data-slot="menu-submenu-header"
      aria-hidden
      className={cn(
        // behavior
        'sticky z-10',
        // look. The negative margins and padding cancel the panel's padding (p-1), so rows scroll under it
        // cleanly; `-top-1` matches it too, because sticky offsets count from the panel's content edge.
        '-top-1 -mx-1 -mt-1 bg-base px-1 pt-1',
      )}
    >
      <div
        className={cn(
          itemClassName,
          // look
          'font-medium hover:bg-soft',
          className,
        )}
        onPointerDown={(event) => event.preventDefault()}
        onClick={(event) => {
          onClick?.(event);
          submenu?.close();
        }}
        {...props}
      >
        {children}
      </div>
      <div role="presentation" className={separatorClassName} />
    </div>
  );
}
