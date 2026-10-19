import * as React from 'react';
import { createPortal } from 'react-dom';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Check, ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { cn } from 'cn';

type WithClassName<P> = Omit<P, 'className'> & { className?: string };

/* -------------------------------------------------------------------------- */
/* Two modes, one API. With a mouse or a trackpad, Base UI's Select: a list   */
/* that opens over the trigger. On phones and tablets, the platform's own     */
/* picker (iOS's wheel or sheet, Android's dialog): a native <select>, laid   */
/* invisibly over the same trigger. Both read and write one value, submit     */
/* under one name (Base UI's hidden input) and validate through one Field,    */
/* so a caller never branches.                                                */
/* -------------------------------------------------------------------------- */

// Decided by the device, never by the window's width: a narrow desktop window keeps the list, an iPad gets the picker.
// - iPhone, iPod and Android name themselves in the user agent.
// - An iPad doesn't: since iPadOS 13 Safari asks for desktop sites and says "Macintosh". Only its touch points tell it
//   from a Mac (Macs report 0). With a trackpad attached it can report a fine pointer that hovers, so it isn't left to
//   the media query.
// - Anything else whose primary input is a finger that can't hover: an Android tablet asking for desktop sites (which
//   drops "Android"), a Windows tablet in tablet mode. A touchscreen laptop's primary pointer is its trackpad, so it
//   keeps the list.
const TOUCH_FIRST = '(pointer: coarse) and (hover: none)';

function prefersNativePicker() {
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad|iPod|Android/i.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ||
    matchMedia(TOUCH_FIRST).matches
  );
}

function subscribeToPointer(onChange: () => void) {
  const query = matchMedia(TOUCH_FIRST);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

// The server can't know the device, so it renders the Base UI trigger, and the native picker takes over right after
// hydration. Both modes draw the same trigger, so nothing on screen changes, and React sees no mismatch.
function useNativePicker() {
  return React.useSyncExternalStore(subscribeToPointer, prefersNativePicker, () => false);
}

type ChangeDetails = BaseSelect.Root.ChangeEventDetails;

// What Base UI passes to onValueChange, for a change made in the native picker.
function changeDetails(event: Event) {
  let canceled = false;
  return {
    reason: 'none',
    event,
    trigger: undefined,
    cancel: () => void (canceled = true),
    allowPropagation: () => {},
    get isCanceled() {
      return canceled;
    },
    isPropagationAllowed: false,
  } as unknown as ChangeDetails;
}

type SelectContextValue = {
  native: boolean;
  value: unknown;
  setValue: (value: unknown, details: ChangeDetails) => void;
  multiple: boolean;
  readOnly: boolean;
  autoComplete: string | undefined;
  isSelected: (itemValue: unknown) => boolean;
  /** Every label in `items`, so the trigger can be as wide as the longest one. */
  labels: React.ReactNode[];
  /** The trigger's element: a <select> in native mode, where SelectContent renders the options. */
  control: Element | null;
  setControl: (control: Element | null) => void;
  /** How far the value starts past the trigger's inset: a leading icon and its gap, or 0. The rows indent their text by it. */
  indent: number;
  setIndent: (indent: number) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect() {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('Select parts must be inside a <Select>.');
  return context;
}

function labelsOf(items: unknown): React.ReactNode[] {
  if (!items) return [];
  if (!Array.isArray(items)) return Object.values(items as Record<string, React.ReactNode>);
  const label = (item: unknown) =>
    item && typeof item === 'object' && 'label' in item ? (item.label as React.ReactNode) : (item as React.ReactNode);
  return items.flatMap((item) => (Array.isArray(item?.items) ? (item.items as unknown[]).map(label) : [label(item)]));
}

export type SelectProps<Value, Multiple extends boolean | undefined = false> = BaseSelect.Root.Props<Value, Multiple> & {
  /**
   * Leave it out: the device decides. `false` keeps the list everywhere, for items a native <option> can't hold (an
   * avatar, a second line, a swatch); `true` always uses the native picker.
   */
  native?: boolean;
};

// Base UI's Select Root. It holds the value itself (controlled or not, as you like), because in native mode the
// value is set from the native picker, which Base UI can't hear.
export function Select<Value, Multiple extends boolean | undefined = false>(props: SelectProps<Value, Multiple>) {
  const {
    native: nativeProp,
    value: valueProp,
    defaultValue,
    onValueChange,
    multiple = false,
    readOnly = false,
    items,
    autoComplete,
    ...rest
  } = props;
  const isItemEqualToValue = props.isItemEqualToValue as ((item: unknown, value: unknown) => boolean) | undefined;
  const detected = useNativePicker();
  const native = nativeProp ?? detected;
  const [uncontrolled, setUncontrolled] = React.useState<unknown>(() => defaultValue ?? (multiple ? [] : null));
  const value = valueProp !== undefined ? valueProp : uncontrolled;
  const [control, setControl] = React.useState<Element | null>(null);
  const [indent, setIndent] = React.useState(0);

  const onChange = React.useRef(onValueChange);
  React.useLayoutEffect(() => {
    onChange.current = onValueChange;
  });
  const setValue = React.useCallback((next: unknown, details: ChangeDetails) => {
    (onChange.current as ((value: unknown, details: ChangeDetails) => void) | undefined)?.(next, details);
    if (!details.isCanceled) setUncontrolled(next);
  }, []);

  const context = React.useMemo<SelectContextValue>(() => {
    const equal = (item: unknown, selected: unknown) =>
      item == null || selected == null || !isItemEqualToValue ? Object.is(item, selected) : isItemEqualToValue(item, selected);
    return {
      native,
      value,
      setValue,
      multiple,
      readOnly,
      autoComplete,
      isSelected: (item) => (Array.isArray(value) ? value.some((selected) => equal(item, selected)) : equal(item, value)),
      labels: labelsOf(items),
      control,
      setControl,
      indent,
      setIndent,
    };
  }, [native, value, setValue, multiple, readOnly, autoComplete, isItemEqualToValue, items, control, indent]);

  const Root = BaseSelect.Root as React.ComponentType<SelectProps<unknown, boolean>>;
  return (
    <SelectContext.Provider value={context}>
      <Root
        {...(rest as SelectProps<unknown, boolean>)}
        multiple={multiple}
        readOnly={readOnly}
        items={items}
        autoComplete={autoComplete}
        value={value}
        onValueChange={setValue}
      />
    </SelectContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Trigger: the frame. It looks like the Input skill's field (one height, one */
/* inset, the same placeholder, focus, invalid and disabled states), so the   */
/* two sit together in a form. Icons are direct `svg` children; the chevron   */
/* is added at the end.                                                       */
/* -------------------------------------------------------------------------- */

const triggerClassName = cn(
  // behavior. As wide as its field, like an input; with `w-auto` it's as wide as its longest option (see SelectValue).
  'relative inline-flex w-full min-w-0 cursor-default items-center text-left outline-hidden select-none data-disabled:cursor-not-allowed [&>svg]:pointer-events-none [&>svg]:shrink-0',
  'transition-[border-color,box-shadow] duration-100 ease-out motion-reduce:transition-none',
  // 16px text on touch screens, as the Input's: iOS zooms the page into a smaller control on focus.
  'any-pointer-coarse:text-base',
  // look. The height is set once, through --select-height. One inset (px-2.5) on both sides, the Input's: a leading
  // icon or the value starts on it, the chevron ends on it. The panel's rows are built on the same numbers (see
  // SelectItem), so the open list lands exactly on the trigger.
  'h-(--select-height) [--select-height:2rem] gap-2 rounded-sm border border-soft bg-base px-2.5 font-mono text-[13px] text-strong [&>svg]:size-4 [&>svg]:text-soft',
  'not-data-disabled:hover:border-sub focus-visible:border-sub focus-visible:ring-2 focus-visible:ring-primary data-popup-open:border-sub',
  'data-invalid:border-danger data-invalid:focus-visible:ring-danger data-disabled:opacity-50 data-readonly:bg-weak',
  // look. In native mode the <select> inside has the focus, so the frame shows it through :has().
  'has-[>select:focus-visible]:border-sub has-[>select:focus-visible]:ring-2 has-[>select:focus-visible]:ring-primary data-invalid:has-[>select:focus-visible]:border-danger data-invalid:has-[>select:focus-visible]:ring-danger',
);

// Laid over the whole trigger, transparent, so a tap anywhere opens the platform's picker. 16px: iOS zooms the page
// into any control smaller than that when it gets focus.
const nativeSelectClassName = cn(
  // behavior
  'absolute inset-0 size-full cursor-default appearance-none rounded-[inherit] text-base opacity-0 outline-hidden disabled:cursor-not-allowed',
);

const assignRef = <T,>(ref: React.Ref<T> | undefined, node: T | null) => {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
};

// Puts each option's selectedness back to the current value. A change in the picker is undone at once, and the new
// value comes back through React if it's taken: not when the select is read-only, or `onValueChange` cancels it, or a
// controlled value stays put.
function syncOptions(select: HTMLSelectElement, isSelected: (value: unknown) => boolean, value: unknown) {
  for (const option of Array.from(select.options)) {
    option.selected = optionValues.has(option) ? isSelected(optionValues.get(option)) : value == null;
  }
}

export type SelectTriggerProps = WithClassName<BaseSelect.Trigger.Props> & { ref?: React.Ref<HTMLElement> };

export function SelectTrigger({ ref, className, children, 'aria-invalid': ariaInvalid, ...props }: SelectTriggerProps) {
  const select = useSelect();
  const { native, setControl, setIndent } = select;
  const node = React.useRef<HTMLElement | null>(null);
  const setRef = React.useCallback(
    (element: HTMLElement | null) => {
      node.current = element;
      assignRef(ref, element);
      setControl(element);
    },
    [ref, setControl],
  );

  // Measures what comes before the value, past the trigger's inset: a leading icon and its gap, an avatar, a flag.
  // The rows indent their text by as much, so a list opened over the trigger lands with its edges on the trigger's
  // and the chosen text on the value (Base UI lines up the texts, which would otherwise shift the whole panel).
  // After every render: an icon can come and go with the children.
  React.useLayoutEffect(() => {
    const trigger = node.current;
    const value = trigger?.querySelector('[data-slot=select-value]');
    if (!trigger || !value || native) return;
    const style = getComputedStyle(trigger);
    const box = trigger.getBoundingClientRect();
    const at = value.getBoundingClientRect();
    const indent =
      style.direction === 'rtl'
        ? box.right - at.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight)
        : at.left - box.left - parseFloat(style.borderLeftWidth) - parseFloat(style.paddingLeft);
    setIndent(Math.max(0, Math.round(indent * 100) / 100));
  });

  return (
    <BaseSelect.Trigger
      ref={setRef}
      data-slot="select-trigger"
      // Base UI sets data-invalid inside an invalid Field; this covers an aria-invalid set by hand (a form library).
      // Only when set: an undefined one would override Base UI's.
      {...((ariaInvalid === true || ariaInvalid === 'true') && { 'data-invalid': '' })}
      aria-invalid={ariaInvalid}
      className={cn(triggerClassName, className)}
      nativeButton={!native}
      render={
        native
          ? (triggerProps, state) => {
              // The frame keeps the look and the state attributes. The <select> takes what makes it the control: its
              // id (for the label), its name and description, validity, and focus and blur (touched, validation on
              // blur). Base UI's press and key handlers stay off it: the platform's picker opens instead.
              const {
                ref: controlRef,
                id,
                onFocus,
                onBlur,
                'aria-label': label,
                'aria-labelledby': labelledBy,
                'aria-describedby': describedBy,
                'aria-invalid': invalid,
                'aria-required': required,
                children: content,
                className: frameClassName,
                style,
                ...rest
              } = triggerProps as React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLSelectElement> };
              const data = Object.fromEntries(Object.entries(rest).filter(([key]) => key.startsWith('data-')));
              return (
                <div {...data} className={frameClassName} style={style}>
                  {content}
                  <select
                    ref={controlRef}
                    id={id}
                    aria-label={label}
                    aria-labelledby={labelledBy}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    aria-required={required}
                    multiple={select.multiple}
                    disabled={state.disabled}
                    autoComplete={select.autoComplete}
                    onFocus={onFocus as React.FocusEventHandler<HTMLSelectElement>}
                    onBlur={onBlur as React.FocusEventHandler<HTMLSelectElement>}
                    className={nativeSelectClassName}
                    onChange={(event) => {
                      const node = event.currentTarget;
                      const picked = Array.from(node.selectedOptions)
                        .filter((option) => optionValues.has(option))
                        .map((option) => optionValues.get(option));
                      syncOptions(node, select.isSelected, select.value);
                      if (select.readOnly) return;
                      select.setValue(select.multiple ? picked : (picked[0] ?? null), changeDetails(event.nativeEvent));
                    }}
                  />
                </div>
              );
            }
          : undefined
      }
      {...props}
    >
      {children}
      <BaseSelect.Icon
        data-slot="select-icon"
        className={cn(
          // behavior
          'ml-auto flex shrink-0',
          // look
          'text-soft [&>svg]:size-4',
        )}
      >
        <ChevronsUpDown />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

type SelectValueProps = WithClassName<BaseSelect.Value.Props>;

// The chosen item's label, or the placeholder. Give Select `items` and it shows their labels (a raw value otherwise),
// and stacks every label invisibly under the value, so a trigger narrower than its field (`w-auto`) is as wide as its
// longest option and never changes width as the value does. That's what a native <select> does.
export function SelectValue({ className, placeholder, ...props }: SelectValueProps) {
  const { labels, multiple, native } = useSelect();
  const sizers = multiple ? [] : [placeholder, ...labels];
  return (
    <span
      data-slot="select-value"
      // In native mode the <select> reads out its own value; this copy would be heard twice.
      aria-hidden={native || undefined}
      className={cn(
        // behavior. One grid cell holds the value and every sizer; the cell can shrink, and the value truncates.
        'grid min-w-0 flex-1 grid-cols-1 *:col-start-1 *:row-start-1',
        className,
      )}
    >
      <BaseSelect.Value
        placeholder={placeholder}
        className={cn(
          // behavior
          'truncate',
          // look
          'data-placeholder:text-disabled',
        )}
        {...props}
      />
      {sizers.map((label, index) => (
        <span key={index} aria-hidden className="invisible h-0 overflow-hidden whitespace-nowrap">
          {label}
        </span>
      ))}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Content: the list. With a mouse it opens over the trigger with the chosen  */
/* item on the value (a single select; a multiple one opens below, so the     */
/* choices stay in view), scrolls with arrows at its ends and locks the       */
/* page's scroll. In native mode it renders its items as <option>s into the   */
/* trigger's <select> instead.                                                */
/* -------------------------------------------------------------------------- */

const scrollArrowClassName = cn(
  // behavior. Base UI positions it over the list's end, and scrolls while the pointer rests on it. Its ::before
  // reaches past the panel when the list is over the trigger, so resting just outside the panel scrolls too.
  'z-10 flex w-full cursor-default items-center justify-center before:absolute before:inset-x-0 before:h-full before:content-[""]',
  // look. As tall as the list's scroll padding (scroll-py-5), so a row moved into view by the keyboard is never under
  // it; its corners follow the panel's radius less its border.
  'h-5 bg-base text-soft [&>svg]:size-4',
);

type SelectContentProps = WithClassName<BaseSelect.Popup.Props> &
  Pick<BaseSelect.Positioner.Props, 'alignItemWithTrigger' | 'side' | 'align' | 'sideOffset' | 'alignOffset'> & {
    /** Where the portal renders (default: document.body). */
    container?: BaseSelect.Portal.Props['container'];
  };

export function SelectContent({
  className,
  children,
  container,
  alignItemWithTrigger,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  alignOffset = 0,
  ...props
}: SelectContentProps) {
  const { native, control, multiple, value, indent } = useSelect();

  if (native) {
    if (!(control instanceof HTMLSelectElement)) return null;
    return createPortal(
      <>
        {/* Selected while there's no value, so the picker doesn't show the first option as if it were chosen. */}
        {!multiple && <NativeOption selected={value == null} value="" disabled hidden />}
        {children}
      </>,
      control,
    );
  }

  return (
    <BaseSelect.Portal container={container}>
      <BaseSelect.Positioner
        className="z-50 outline-hidden select-none"
        alignItemWithTrigger={alignItemWithTrigger ?? !multiple}
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
      >
        <BaseSelect.Popup
          data-slot="select-content"
          className={cn(
            // behavior. At least as wide as the trigger. Over the trigger (data-side=none) it appears in place, with
            // no scale: it's already where it belongs. Base UI places it 1px high there; translate-y-px lands the
            // chosen row on the trigger to the pixel (Base UI's own demo does the same).
            'relative min-w-(--anchor-width) max-w-(--available-width) outline-hidden data-[side=none]:translate-y-px',
            'origin-(--transform-origin) transition-[scale,opacity] duration-100 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-[side=none]:transition-none motion-reduce:transition-none',
            // look. The radius is set once, through --select-radius: the scroll arrows' corners follow it.
            '[--select-radius:4px] rounded-(--select-radius) border border-soft bg-base text-[13px] text-strong',
            className,
          )}
          style={{ '--select-indent': `${indent}px` } as React.CSSProperties}
          {...props}
        >
          <BaseSelect.ScrollUpArrow
            data-slot="select-scroll-arrow"
            className={cn(
              scrollArrowClassName,
              // behavior
              'top-0 data-[side=none]:before:-top-full',
              // look
              'rounded-t-[calc(var(--select-radius)-1px)]',
            )}
          >
            <ChevronUp />
          </BaseSelect.ScrollUpArrow>
          <BaseSelect.List
            data-slot="select-list"
            className={cn(
              // behavior
              'max-h-(--available-height) overflow-y-auto overscroll-contain outline-hidden scroll-py-5',
              // look. Padding + border is the rows' first 5px of inset (see SelectItem).
              'p-1',
            )}
          >
            {children}
          </BaseSelect.List>
          <BaseSelect.ScrollDownArrow
            data-slot="select-scroll-arrow"
            className={cn(
              scrollArrowClassName,
              // behavior
              'bottom-0 data-[side=none]:before:-bottom-full',
              // look
              'rounded-b-[calc(var(--select-radius)-1px)]',
            )}
          >
            <ChevronDown />
          </BaseSelect.ScrollDownArrow>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

/* -------------------------------------------------------------------------- */
/* Items, groups and separators: rows in the list, or <option>, <optgroup>    */
/* (and nothing, for a separator) in native mode.                             */
/* -------------------------------------------------------------------------- */

// The value each <option> stands for, so a pick in the native picker maps back to it (objects included).
const optionValues = new WeakMap<HTMLOptionElement, unknown>();

type NativeOptionProps = Omit<React.ComponentProps<'option'>, 'selected'> & { selected: boolean; itemValue?: unknown; hasValue?: boolean };

// Sets its own selectedness, after every change of it. Not React's `value` on the <select>: the options arrive
// through a portal, after the <select> has been set up.
function NativeOption({ selected, itemValue, hasValue, ...props }: NativeOptionProps) {
  const ref = React.useRef<HTMLOptionElement>(null);
  React.useLayoutEffect(() => {
    if (ref.current) ref.current.selected = selected;
  }, [selected]);
  return (
    <option
      ref={(node) => {
        ref.current = node;
        if (node && hasValue) optionValues.set(node, itemValue);
      }}
      {...props}
    />
  );
}

// An <option> holds text only: an item's text is its `label`, or the text inside it.
function textOf(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return '';
}

export function SelectItem({ className, children, ...props }: WithClassName<BaseSelect.Item.Props>) {
  const { native, isSelected } = useSelect();

  if (native) {
    const label = (props.label ?? textOf(children)).replace(/\s+/g, ' ').trim();
    return (
      <NativeOption selected={isSelected(props.value ?? null)} itemValue={props.value ?? null} hasValue disabled={props.disabled}>
        {label}
      </NativeOption>
    );
  }

  return (
    <BaseSelect.Item
      data-slot="select-item"
      className={cn(
        // behavior. Rows never wrap: a long label widens the panel, up to the room it has, then truncates. Highlight
        // comes from data-highlighted (keyboard and pointer alike), never :hover.
        'flex w-full cursor-default items-center outline-hidden select-none whitespace-nowrap',
        // look. One row is as tall as the trigger (h-8 = --select-height), and its text and check sit on the trigger's
        // inset: border 1px + panel padding 4px + row padding 6px = the trigger's border 1px + padding 10px. Its text
        // starts --select-indent further in (the trigger's leading icon and gap, measured), where the value does. So
        // the open list lands with its edges on the trigger's, the chosen item on the value and its check where the
        // chevron was. Change them together.
        'h-8 gap-2 rounded-xs px-1.5 ps-[calc(--spacing(1.5)+var(--select-indent,0px))] font-mono data-highlighted:bg-soft data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <BaseSelect.ItemText
        className={cn(
          // behavior
          'flex min-w-0 flex-1 items-center truncate',
          // look
          'gap-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-soft',
        )}
      >
        {children}
      </BaseSelect.ItemText>
      {/* Always there, so a row is as wide checked as not, and the panel's width doesn't depend on the value. */}
      <span className="flex size-4 shrink-0 items-center justify-center">
        <BaseSelect.ItemIndicator data-slot="select-item-indicator" className="flex [&>svg]:size-4">
          <Check />
        </BaseSelect.ItemIndicator>
      </span>
    </BaseSelect.Item>
  );
}

export function SelectGroup({ className, children, ...props }: WithClassName<BaseSelect.Group.Props>) {
  const { native } = useSelect();

  if (native) {
    // The group's label is its SelectGroupLabel's text.
    const label = React.Children.toArray(children).find(
      (child) => React.isValidElement(child) && child.type === SelectGroupLabel,
    );
    return (
      <optgroup label={textOf(React.isValidElement(label) ? (label.props as { children?: React.ReactNode }).children : null).trim()}>
        {children}
      </optgroup>
    );
  }

  return (
    <BaseSelect.Group
      data-slot="select-group"
      className={cn(
        // look
        'not-first:mt-1',
        className,
      )}
      {...props}
    >
      {children}
    </BaseSelect.Group>
  );
}

export function SelectGroupLabel({ className, ...props }: WithClassName<BaseSelect.GroupLabel.Props>) {
  const { native } = useSelect();
  if (native) return null;
  return (
    <BaseSelect.GroupLabel
      data-slot="select-group-label"
      className={cn(
        // behavior
        'flex items-center select-none',
        // look. On the rows' inset, as their text is.
        'h-7 px-1.5 font-sans text-[10.5px] font-medium tracking-[0.14em] text-soft uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function SelectSeparator({ className, ...props }: WithClassName<BaseSelect.Separator.Props>) {
  const { native } = useSelect();
  if (native) return null;
  return (
    <BaseSelect.Separator
      data-slot="select-separator"
      className={cn(
        // look. Full bleed: the negative margin cancels the list's padding.
        '-mx-1 my-1 h-px bg-soft',
        className,
      )}
      {...props}
    />
  );
}
