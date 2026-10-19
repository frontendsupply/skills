import * as React from 'react';
import { flushSync } from 'react-dom';
import { Autocomplete as BaseAutocomplete } from '@base-ui/react/autocomplete';
import { Button as BaseButton } from '@base-ui/react/button';
import { Field as BaseField } from '@base-ui/react/field';
import { Input as BaseInput } from '@base-ui/react/input';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ArrowBigUpDash, Check, Copy, Eye, EyeOff, X } from 'lucide-react';
import { cn } from 'cn';

type WithClassName<P> = Omit<P, 'className'> & { className?: string };

/* -------------------------------------------------------------------------- */
/* Field: the label, description and error around a control. Base UI wires    */
/* them (htmlFor, aria-describedby, aria-invalid) and runs the validation.    */
/* -------------------------------------------------------------------------- */

export function Field({ className, ...props }: WithClassName<BaseField.Root.Props>) {
  return (
    <BaseField.Root
      data-slot="field"
      className={cn(
        // behavior
        'flex min-w-0 flex-col',
        // look
        'gap-1.5',
        className,
      )}
      {...props}
    />
  );
}

export function FieldLabel({ className, ...props }: WithClassName<BaseField.Label.Props>) {
  return (
    <BaseField.Label
      data-slot="field-label"
      className={cn(
        // behavior. Only the text is the label's click target, not the whole row beside it.
        'self-start select-none',
        // look
        'text-[13px] font-medium text-strong data-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function FieldDescription({ className, ...props }: WithClassName<BaseField.Description.Props>) {
  return (
    <BaseField.Description
      data-slot="field-description"
      className={cn(
        // look
        'text-xs text-soft',
        className,
      )}
      {...props}
    />
  );
}

// Shows when the field is invalid: from the browser's own checks (`required`, `type="email"`, `pattern`; pick one
// with `match`), from Field's `validate`, or always with `match` from a form library.
export function FieldError({ className, ...props }: WithClassName<BaseField.Error.Props>) {
  return (
    <BaseField.Error
      data-slot="field-error"
      className={cn(
        // look
        'text-xs text-danger-dark',
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Input: one control, alone or inside an InputGroup. Alone, the input is the */
/* frame. In a group, the group is the frame and the input fills what's left. */
/* -------------------------------------------------------------------------- */

const inputBehavior = cn(
  // behavior. Typed text is 16px on touch screens: iOS zooms the page into any field below that.
  'w-full min-w-0 outline-hidden any-pointer-coarse:text-base',
  'transition-[border-color,box-shadow] duration-100 ease-out motion-reduce:transition-none',
);

const standaloneClassName = cn(
  inputBehavior,
  // look. The height is set once, through --input-height.
  'h-(--input-height) [--input-height:2rem] rounded-sm border border-soft bg-base px-2.5 font-mono text-[13px] text-strong placeholder:text-disabled',
  'not-disabled:hover:border-sub focus-visible:border-sub focus-visible:ring-2 focus-visible:ring-primary',
  'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger',
  'disabled:cursor-not-allowed disabled:opacity-50 [[readonly]]:bg-weak',
);

const groupedClassName = cn(
  inputBehavior,
  // behavior. The group draws the frame, so the browser's own extras inside it go: the search field's clear button
  // and Edge's password reveal (InputClear and InputPasswordToggle replace them), and the autofill fill, which would
  // paint a box inside the frame (the long transition keeps the input transparent).
  // It keeps room to type (min-w-16) however much else is in the frame; addons give way first, truncating.
  'min-w-16 flex-1 self-stretch bg-transparent disabled:cursor-not-allowed',
  '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-ms-clear]:hidden [&::-ms-reveal]:hidden',
  'autofill:[transition:background-color_0s_600000s,color_0s_600000s]',
  // look
  'font-mono text-[13px] text-strong placeholder:text-disabled',
);

type GroupState = {
  /** The value's length, in UTF-16 code units, as `maxLength` counts it. */
  length: number;
  /** The input's `maxLength`, or -1 without one. */
  maxLength: number;
  disabled: boolean;
  readOnly: boolean;
};

type InputGroupContextValue = GroupState & {
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Reads the input's value and state from the DOM. Every way a value can change ends up calling it. */
  sync: () => void;
  revealed: boolean;
  setRevealed: React.Dispatch<React.SetStateAction<boolean>>;
  /** Caps Lock is on while the input has focus (read from key and pointer events: there's no other way). */
  capsLock: boolean;
  /** The `aria-keyshortcuts` an InputKbd gives the input. */
  shortcut: string | undefined;
  setShortcut: (shortcut: string | undefined) => void;
  /** Addons and the count, read out after the label as part of the input's description. */
  descriptions: string[];
  registerDescription: (id: string) => () => void;
};

const InputGroupContext = React.createContext<InputGroupContextValue | null>(null);

function useInputGroup() {
  return React.useContext(InputGroupContext);
}

function assignRef<T>(ref: React.Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}

// Registers an element as part of the input's description, for as long as it's mounted.
function useDescription(id: string) {
  const register = useInputGroup()?.registerDescription;
  React.useEffect(() => register?.(id), [register, id]);
}

// Says something to screen readers without showing it: copied, Caps Lock, characters left. One polite live region
// per container, created on first use and kept. Inside a modal dialog it lives in the dialog, because a modal makes
// everything outside it inert, a region on the body included.
const liveRegions = new WeakMap<Element, HTMLElement>();
function announce(from: Element, message: string) {
  const container = from.closest('dialog, [role=dialog], [role=alertdialog]') ?? from.ownerDocument.body;
  let region = liveRegions.get(container);
  if (!region?.isConnected) {
    region = from.ownerDocument.createElement('div');
    region.setAttribute('role', 'status');
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      clipPath: 'inset(50%)',
      whiteSpace: 'nowrap',
    });
    container.append(region);
    liveRegions.set(container, region);
  }
  const target = region;
  target.textContent = '';
  setTimeout(() => (target.textContent = message), 100); // a new region, or the same text twice, needs a moment
}

// The props Input and AutocompleteInput share: the group's frame or the standalone one, the group's ref and state,
// the password reveal, the shortcut and the description.
function useControlProps({
  ref,
  type,
  className,
  'aria-describedby': describedBy,
}: {
  ref?: React.Ref<HTMLInputElement>;
  type?: string;
  className?: string;
  'aria-describedby'?: string;
}) {
  const group = useInputGroup();
  const inputRef = group?.inputRef;
  const setRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      if (inputRef) inputRef.current = node;
      assignRef(ref, node);
    },
    [inputRef, ref],
  );

  // After every render: a controlled value, `disabled`, `readOnly` or `maxLength` (from props or from Field) may have
  // changed without an input event. `sync` bails out when nothing did.
  React.useLayoutEffect(() => group?.sync());

  const password = type === 'password';
  const describedByIds = [describedBy, ...(group?.descriptions ?? [])].filter(Boolean).join(' ');
  return {
    ref: setRef,
    'data-slot': 'input',
    type: password && group?.revealed ? 'text' : type,
    // A revealed password is a text field: keep the keyboard from capitalizing, correcting or spellchecking it
    // (spellcheck can send the text to a server).
    ...(password && { autoCapitalize: 'off', autoCorrect: 'off', spellCheck: false }),
    ...(group?.shortcut && { 'aria-keyshortcuts': group.shortcut }),
    'aria-describedby': describedByIds || undefined,
    className: cn(group ? groupedClassName : standaloneClassName, className),
  };
}

export type InputProps = WithClassName<BaseInput.Props> & { ref?: React.Ref<HTMLInputElement> };

export function Input({ ref, type, className, 'aria-describedby': describedBy, ...props }: InputProps) {
  return <BaseInput {...props} {...useControlProps({ ref, type, className, 'aria-describedby': describedBy })} />;
}

/* -------------------------------------------------------------------------- */
/* InputGroup: the frame around an input and what sits beside it: icons       */
/* (direct `svg` children), InputAddon text, InputButtons, an InputKbd hint   */
/* and an InputCount. It holds the input's state for all of them, and shows   */
/* it as data-filled, data-disabled and data-readonly for callers' styles     */
/* (its own come from :has(), so they're right before hydration too).         */
/* -------------------------------------------------------------------------- */

const groupClassName = cn(
  // behavior. Clicking anything that isn't a control (an icon, a prefix, the padding) focuses the input.
  'relative flex w-full min-w-0 cursor-text items-center has-[[data-slot=input]:disabled]:cursor-not-allowed [&>svg]:pointer-events-none [&>svg]:shrink-0',
  // Safari draws its own Caps Lock sign in a password field; InputCapsLock replaces it.
  '[&:has([data-slot=input-caps-lock])_[data-slot=input]::-webkit-caps-lock-indicator]:hidden',
  'transition-[border-color,box-shadow] duration-100 ease-out motion-reduce:transition-none',
  // look. The height is set once, through --input-height. One inset (px-2.5) on both sides: whatever comes first starts
  // on it and whatever comes last ends on it, an icon, an addon, the text or a button's icon (see the buttons).
  'h-(--input-height) [--input-height:2rem] gap-2 rounded-sm border border-soft bg-base px-2.5 text-[13px] text-soft [&>svg]:size-4',
  'hover:not-has-[[data-slot=input]:disabled]:border-sub has-[[data-slot=input]:focus-visible]:border-sub has-[[data-slot=input]:focus-visible]:ring-2 has-[[data-slot=input]:focus-visible]:ring-primary',
  'has-[[data-slot=input][aria-invalid=true]]:border-danger has-[[data-slot=input][aria-invalid=true]:focus-visible]:ring-danger',
  'has-[[data-slot=input]:disabled]:opacity-50 has-[[data-slot=input][readonly]]:bg-weak',
);

const EMPTY: GroupState = { length: 0, maxLength: -1, disabled: false, readOnly: false };

export function InputGroup({ render, className, ...props }: useRender.ComponentProps<'div'>) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [state, setState] = React.useState(EMPTY);
  const [revealed, setRevealed] = React.useState(false);
  const [capsLock, setCapsLock] = React.useState(false);
  const [shortcut, setShortcut] = React.useState<string>();
  const [descriptions, setDescriptions] = React.useState<string[]>([]);

  const sync = React.useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const next = { length: input.value.length, maxLength: input.maxLength, disabled: input.disabled, readOnly: input.readOnly };
    setState((prev) =>
      prev.length === next.length &&
      prev.maxLength === next.maxLength &&
      prev.disabled === next.disabled &&
      prev.readOnly === next.readOnly
        ? prev
        : next,
    );
  }, []);

  // A form reset changes the value without an input event, and only after the event. A submit hides a revealed
  // password again, before the browser reads the form: password managers save what was a password field, and the
  // page that stays on screen (an error, a single-page app) shouldn't keep showing it. Listened for on the document,
  // in the capture phase, so it runs before the form's own handlers and whatever form the input moves into.
  React.useEffect(() => {
    const ours = (event: Event) => !!inputRef.current?.form && event.target === inputRef.current.form;
    const onReset = (event: Event) => ours(event) && setTimeout(sync);
    const onSubmit = (event: Event) => ours(event) && flushSync(() => setRevealed(false));
    document.addEventListener('reset', onReset, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('reset', onReset, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [sync]);

  const registerDescription = React.useCallback((id: string) => {
    setDescriptions((ids) => [...ids, id]);
    return () => setDescriptions((ids) => ids.filter((other) => other !== id));
  }, []);

  const context = React.useMemo(
    () => ({ ...state, inputRef, sync, revealed, setRevealed, capsLock, shortcut, setShortcut, descriptions, registerDescription }),
    [state, sync, revealed, capsLock, shortcut, descriptions, registerDescription],
  );

  // Caps Lock can only be read from an event's modifiers, so every key and press in the input reads it again.
  const readCapsLock = (event: React.KeyboardEvent | React.MouseEvent) => {
    if (event.target === inputRef.current) setCapsLock(event.getModifierState('CapsLock'));
  };

  const element = useRender({
    defaultTagName: 'div',
    render,
    props: {
      'data-slot': 'input-group',
      'data-filled': state.length > 0 ? '' : undefined,
      'data-disabled': state.disabled ? '' : undefined,
      'data-readonly': state.readOnly ? '' : undefined,
      ...mergeProps<'div'>(
        {
          className: cn(groupClassName, className),
          // Typing, pasting, autofill and InputClear all fire `input`.
          onInput: sync,
          onKeyDown: readCapsLock,
          onKeyUp: readCapsLock,
          onBlur(event) {
            if (event.target === inputRef.current) setCapsLock(false);
          },
          onMouseDown(event) {
            readCapsLock(event);
            const input = inputRef.current;
            const target = event.target as Element;
            if (!input || event.button !== 0 || target.closest('button, a, input, select, textarea, [tabindex]')) return;
            event.preventDefault(); // keeps the focus (and the caret) where it is if the input already has it
            input.focus();
            // As in a field that's one piece: a click past the end of the text puts the caret at the end, a click
            // before its start at the start. Email and number inputs have no caret API, hence the try.
            const box = input.getBoundingClientRect();
            const rtl = getComputedStyle(input).direction === 'rtl';
            const after = rtl ? event.clientX < box.left : event.clientX > box.right;
            const before = rtl ? event.clientX > box.right : event.clientX < box.left;
            const at = after ? input.value.length : before ? 0 : null;
            try {
              if (at !== null) input.setSelectionRange(at, at);
            } catch {}
          },
        },
        props,
      ),
    },
  });

  return <InputGroupContext.Provider value={context}>{element}</InputGroupContext.Provider>;
}

// Text beside the input, inside the frame: a unit, a currency, a URL's scheme or domain. It's added to the input's
// description, so screen readers hear "Website, https://" and not just "Website".
export function InputAddon({ render, className, id: idProp, ...props }: useRender.ComponentProps<'span'>) {
  const generatedId = React.useId();
  const id = idProp ?? generatedId;
  useDescription(id);

  return useRender({
    defaultTagName: 'span',
    render,
    props: {
      id,
      'data-slot': 'input-addon',
      className: cn(
        // behavior. Before the input (a long domain), it shrinks and truncates in a frame too narrow for it, rather
        // than squeezing the input out or overflowing the frame. After the input (a unit, an extension), it keeps
        // its width: those are short, and only mean something whole.
        'min-w-0 truncate select-none [[data-slot=input]~&]:shrink-0',
        // look. The typed text's font and size, 16px on touch screens included, so a prefix reads as part of the value.
        'font-mono text-[13px] text-soft any-pointer-coarse:text-base',
        className,
      ),
      ...props,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Hints in the frame: a keyboard shortcut, a character count, Caps Lock.     */
/* -------------------------------------------------------------------------- */

const isMac = () => /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

type Shortcut = { meta: boolean; ctrl: boolean; alt: boolean; shift: boolean; key: string };

// `keys` in `aria-keyshortcuts` order, as the menu skill writes them: modifiers first (`meta+ctrl+alt+shift+`), then
// the key. `ctrl` means ⌘ on a Mac, the way shortcuts are usually meant.
function parseShortcut(keys: string, mac: boolean): Shortcut {
  const parts = keys.toLowerCase().split('+');
  const key = parts.pop() ?? '';
  const has = (modifier: string) => parts.includes(modifier);
  return { meta: has('meta') || (mac && has('ctrl')), ctrl: !mac && has('ctrl'), alt: has('alt'), shift: has('shift'), key };
}

function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut) {
  if (event.metaKey !== shortcut.meta || event.ctrlKey !== shortcut.ctrl) return false;
  if (event.altKey !== shortcut.alt || event.shiftKey !== shortcut.shift) return false;
  // With ⌥ held a Mac types another character (⌥K is ˚), so letters and digits are matched by their key's position.
  return event.key.toLowerCase() === shortcut.key || event.code.toLowerCase() === `key${shortcut.key}` || event.code === `Digit${shortcut.key}`;
}

function describeShortcut({ meta, ctrl, alt, shift, key }: Shortcut, mac: boolean) {
  const name = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1);
  const aria = [meta && 'Meta', ctrl && 'Control', alt && 'Alt', shift && 'Shift', name].filter(Boolean).join('+');
  const hint = mac
    ? [ctrl && '⌃', alt && '⌥', shift && '⇧', meta && '⌘', name].filter(Boolean).join('')
    : [ctrl && 'Ctrl', alt && 'Alt', shift && 'Shift', meta && 'Win', name].filter(Boolean).join(' ');
  return { aria, hint };
}

const subscribeNever = () => () => {};

type InputKbdProps = React.ComponentProps<'kbd'> & {
  /** The shortcut that focuses the input, e.g. `ctrl+k` (⌘K on a Mac) or `/`. Its hint is the default content. */
  keys: string;
};

// A shortcut to the input, and its hint. Pressing the keys anywhere on the page focuses the input and selects its
// text, unless the input can't be reached: disabled, hidden, or inert behind a modal. A shortcut without a modifier
// (`/`) waits while another field has focus, so it can still be typed there. The input gets `aria-keyshortcuts`.
// The hint is written for the platform, hidden while the input has focus, and on touch screens, which have no keys.
export function InputKbd({ keys, className, children, ...props }: InputKbdProps) {
  const group = useInputGroup();
  const inputRef = group?.inputRef;
  const setShortcut = group?.setShortcut;

  React.useEffect(() => {
    const mac = isMac();
    const shortcut = parseShortcut(keys, mac);
    setShortcut?.(describeShortcut(shortcut, mac).aria);
    const onKeyDown = (event: KeyboardEvent) => {
      const input = inputRef?.current;
      if (!input || event.defaultPrevented || event.repeat || !matchesShortcut(event, shortcut)) return;
      if (input.disabled || input.closest('[inert], [aria-hidden=true]') || input.getClientRects().length === 0) return;
      const typing = event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]');
      const modified = shortcut.meta || shortcut.ctrl || shortcut.alt;
      if (!modified && typing) return;
      event.preventDefault();
      input.focus();
      input.select();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      setShortcut?.(undefined);
    };
  }, [keys, inputRef, setShortcut]);

  // Depends on the platform, so it renders on the client.
  const hint = React.useSyncExternalStore(
    subscribeNever,
    () => describeShortcut(parseShortcut(keys, isMac()), isMac()).hint,
    () => null,
  );

  return (
    <kbd
      data-slot="input-kbd"
      aria-hidden
      className={cn(
        // behavior
        'shrink-0 whitespace-nowrap select-none pointer-coarse:hidden [[data-slot=input-group]:has([data-slot=input]:focus)_&]:hidden',
        // look
        'font-mono text-[11px] text-soft',
        className,
      )}
      {...props}
    >
      {children ?? hint}
    </kbd>
  );
}

type InputCountProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  /** The limit. Defaults to the input's `maxLength`; set it instead for a soft limit that lets people type past it. */
  max?: number;
  /** What screen readers hear as part of the description. */
  limitLabel?: (max: number) => string;
  /** What screen readers hear once typing pauses near the limit (remaining is negative past a soft limit). */
  remainingLabel?: (remaining: number) => string;
};

const defaultLimitLabel = (max: number) => `Up to ${max} characters`;
const defaultRemainingLabel = (remaining: number) =>
  remaining >= 0 ? `${remaining} characters left` : `${-remaining} characters too many`;

// "12/80". Screen readers hear the limit with the description, not the count on every key: once typing pauses (a
// second) in the last fifth of the limit, or past it, they hear what's left (GOV.UK's character count). Past a soft
// limit it sets `data-over`.
export function InputCount({
  max: maxProp,
  limitLabel = defaultLimitLabel,
  remainingLabel = defaultRemainingLabel,
  className,
  id: idProp,
  ...props
}: InputCountProps) {
  const group = useInputGroup();
  const generatedId = React.useId();
  const id = idProp ?? generatedId;
  useDescription(id);

  const length = group?.length ?? 0;
  const max = maxProp ?? (group && group.maxLength >= 0 ? group.maxLength : undefined);
  const remaining = max === undefined ? undefined : max - length;
  const inputRef = group?.inputRef;
  const label = React.useRef(remainingLabel);
  label.current = remainingLabel;

  React.useEffect(() => {
    const input = inputRef?.current;
    if (remaining === undefined || max === undefined || !input || document.activeElement !== input) return;
    if (remaining > max / 5) return;
    const timeout = setTimeout(() => announce(input, label.current(remaining)), 1000);
    return () => clearTimeout(timeout);
  }, [remaining, max, inputRef]);

  if (max === undefined) return null;
  return (
    <span
      id={id}
      data-slot="input-count"
      data-over={length > max ? '' : undefined}
      className={cn(
        // behavior
        'shrink-0 whitespace-nowrap select-none',
        // look
        'font-mono text-[11px] text-soft tabular-nums data-over:text-danger-dark',
        className,
      )}
      {...props}
    >
      <span aria-hidden>
        {length}/{max}
      </span>
      <span className="sr-only">{limitLabel(max)}</span>
    </span>
  );
}

type InputCapsLockProps = React.ComponentProps<'svg'> & {
  /** What screen readers hear when it turns on. */
  label?: string;
};

// A sign in a password field while Caps Lock is on and the field has focus, and "Caps Lock is on" for screen readers.
// Nothing while it's off.
export function InputCapsLock({ label = 'Caps Lock is on', ...props }: InputCapsLockProps) {
  const group = useInputGroup();
  const on = group?.capsLock ?? false;
  const inputRef = group?.inputRef;
  React.useEffect(() => {
    if (on && inputRef?.current) announce(inputRef.current, label);
  }, [on, inputRef, label]);

  return on ? <ArrowBigUpDash data-slot="input-caps-lock" aria-hidden {...props} /> : null;
}

/* -------------------------------------------------------------------------- */
/* Buttons inside the frame. InputButton is the plain one (a search submit, a */
/* menu, a text action); InputClear, InputPasswordToggle and InputCopy are    */
/* the three that need the input's value or type. With an icon alone, those  */
/* three name themselves ("Clear", "Show password", "Copy"); with text of     */
/* their own, the text is the name.                                           */
/* -------------------------------------------------------------------------- */

const buttonClassName = cn(
  // behavior. An icon alone makes it square.
  'inline-flex shrink-0 cursor-default items-center justify-center outline-hidden select-none [&>svg]:shrink-0 has-[>svg:only-child]:aspect-square has-[>svg:only-child]:px-0',
  'data-hidden:invisible data-disabled:pointer-events-none',
  // look. 8px shorter than the frame. Its negative margin equals its padding, and both equal the space around its
  // icon ((height - 8px - 16px icon) / 2), so its icon or text sits on the frame's inset like any other icon or addon,
  // and only the hover fill reaches past it. The margins also cancel the gap between two buttons: they touch.
  '-mx-[calc((var(--input-height)-24px)/2)] h-[calc(var(--input-height)-8px)] min-w-[calc(var(--input-height)-8px)] gap-1 rounded-xs px-[calc((var(--input-height)-24px)/2)] font-sans text-xs font-medium text-soft [&>svg]:size-4',
  'hover:bg-soft hover:text-strong focus-visible:ring-2 focus-visible:ring-primary [[data-slot=input-group]:not(:has([data-slot=input]:disabled))>&[data-disabled]]:opacity-50',
);

export type InputButtonProps = WithClassName<BaseButton.Props>;

// Disabled with the input, so nothing in a disabled field can be pressed.
export function InputButton({ className, disabled, ...props }: InputButtonProps) {
  const group = useInputGroup();
  return (
    <BaseButton
      data-slot="input-button"
      disabled={disabled || group?.disabled}
      className={cn(buttonClassName, className)}
      {...props}
    />
  );
}

// Typing into the input from code: the native setter, then an `input` event, so React's onChange, Base UI's
// onValueChange, Field's validation and form libraries all see the change as if it had been typed.
function setInputValue(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

// Shows only while there's something to clear and the input can be changed. Hidden, it keeps its place, so the
// input's width never jumps while typing.
export function InputClear({ className, children, onClick, ...props }: InputButtonProps) {
  const group = useInputGroup();
  const visible = !!group && group.length > 0 && !group.disabled && !group.readOnly;
  return (
    <BaseButton
      data-slot="input-clear"
      data-hidden={visible ? undefined : ''}
      aria-label={children == null ? 'Clear' : undefined}
      className={cn(buttonClassName, className)}
      // The input keeps the focus (and a phone its keyboard) while the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        onClick?.(event);
        const input = group?.inputRef.current;
        if (event.defaultPrevented || !input) return;
        setInputValue(input, '');
        input.focus();
      }}
      {...props}
    >
      {children ?? <X />}
    </BaseButton>
  );
}

// Toggles a password input between hidden and shown. The label stays the same; `aria-pressed` says which.
export function InputPasswordToggle({ className, children, onClick, disabled, ...props }: InputButtonProps) {
  const group = useInputGroup();
  const revealed = group?.revealed ?? false;
  return (
    <BaseButton
      data-slot="input-password-toggle"
      aria-label={children == null ? 'Show password' : undefined}
      aria-pressed={revealed}
      disabled={disabled || group?.disabled}
      className={cn(buttonClassName, className)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        onClick?.(event);
        const input = group?.inputRef.current;
        if (event.defaultPrevented || !input) return;
        // Switching the type drops the caret and selection; put them back. Chrome drops them once more after the
        // switch, before the next paint, hence the second time.
        const { selectionStart, selectionEnd } = input;
        const restore = () => document.activeElement === input && input.setSelectionRange(selectionStart, selectionEnd);
        flushSync(() => group.setRevealed((value) => !value));
        restore();
        requestAnimationFrame(restore);
      }}
      {...props}
    >
      {children ?? (revealed ? <EyeOff /> : <Eye />)}
    </BaseButton>
  );
}

type InputCopyProps = InputButtonProps & {
  /** What screen readers hear after copying. */
  copiedLabel?: string;
};

// Copies the input's value; disabled while there's nothing to copy. For two seconds after each copy it sets
// `data-copied` and the icon turns into a check. Where the clipboard is missing or blocked (an insecure origin, a
// denied permission), it selects the text instead, ready for ⌘C.
export function InputCopy({ className, children, onClick, disabled, copiedLabel = 'Copied', ...props }: InputCopyProps) {
  const group = useInputGroup();
  // When it last copied (0: not lately), so a second copy restarts the two seconds.
  const [copiedAt, setCopiedAt] = React.useState(0);
  React.useEffect(() => {
    if (!copiedAt) return;
    const timeout = setTimeout(() => setCopiedAt(0), 2000);
    return () => clearTimeout(timeout);
  }, [copiedAt]);

  return (
    <BaseButton
      data-slot="input-copy"
      data-copied={copiedAt ? '' : undefined}
      aria-label={children == null ? 'Copy' : undefined}
      disabled={disabled || !group || group.disabled || group.length === 0}
      className={cn(buttonClassName, className)}
      onClick={(event) => {
        onClick?.(event);
        const input = group?.inputRef.current;
        if (event.defaultPrevented || !input) return;
        // Inside the promise, so a missing clipboard (it throws) is caught too.
        Promise.resolve()
          .then(() => navigator.clipboard.writeText(input.value))
          .then(() => {
            setCopiedAt(Date.now());
            announce(input, copiedLabel);
          })
          .catch(() => input.select());
      }}
      {...props}
    >
      {children ?? (copiedAt ? <Check /> : <Copy />)}
    </BaseButton>
  );
}

/* -------------------------------------------------------------------------- */
/* Autocomplete: free text with suggestions. Base UI's Autocomplete handles   */
/* filtering, the keyboard and the ARIA; these parts put it in the same frame */
/* and anchor the list to the whole group, not just the text inside it.       */
/* -------------------------------------------------------------------------- */

type AutocompleteContextValue = {
  anchor: Element | null;
  setAnchor: (anchor: Element | null) => void;
  /** Changes whenever the value does, so AutocompleteInput re-renders and its group re-reads the value. */
  value: unknown;
};

const AutocompleteContext = React.createContext<AutocompleteContextValue | null>(null);

export type AutocompleteProps<ItemValue> = BaseAutocomplete.Root.Props<ItemValue>;

export function Autocomplete<ItemValue>({ onValueChange, ...props }: AutocompleteProps<ItemValue>) {
  const [anchor, setAnchor] = React.useState<Element | null>(null);
  const [value, setValue] = React.useState<unknown>(props.value ?? props.defaultValue);
  const context = React.useMemo(() => ({ anchor, setAnchor, value: props.value ?? value }), [anchor, props.value, value]);
  const Root = BaseAutocomplete.Root as React.ComponentType<AutocompleteProps<ItemValue>>;
  return (
    <AutocompleteContext.Provider value={context}>
      <Root
        {...props}
        // Choosing a suggestion sets the input's value from code, without an input event.
        onValueChange={(next, details) => {
          onValueChange?.(next, details);
          setValue(next);
        }}
      />
    </AutocompleteContext.Provider>
  );
}

export type AutocompleteInputProps = WithClassName<BaseAutocomplete.Input.Props> & {
  ref?: React.Ref<HTMLInputElement>;
};

// The input, in a group or alone. In a group, the list opens under the whole frame and matches its width.
export function AutocompleteInput({
  ref,
  className,
  'aria-describedby': describedBy,
  ...props
}: AutocompleteInputProps) {
  const autocomplete = React.useContext(AutocompleteContext);
  const setAnchor = autocomplete?.setAnchor;
  const anchorRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      assignRef(ref, node);
      setAnchor?.(node?.closest('[data-slot=input-group]') ?? null);
    },
    [ref, setAnchor],
  );
  return (
    <BaseAutocomplete.Input
      {...props}
      {...useControlProps({ ref: anchorRef, className, 'aria-describedby': describedBy })}
    />
  );
}

type AutocompleteContentProps = WithClassName<BaseAutocomplete.Popup.Props> &
  Pick<BaseAutocomplete.Positioner.Props, 'side' | 'align' | 'sideOffset' | 'alignOffset'> & {
    /** Where the portal renders (default: document.body). */
    container?: BaseAutocomplete.Portal.Props['container'];
  };

// Portal + Positioner + Popup in one part. As wide as the frame; scrolls past 20rem or the room it has. A popup
// with nothing to show (no item, no empty or status text) stays hidden instead of showing an empty box.
export function AutocompleteContent({
  className,
  container,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  alignOffset = 0,
  ...props
}: AutocompleteContentProps) {
  const anchor = React.useContext(AutocompleteContext)?.anchor ?? undefined;
  return (
    <BaseAutocomplete.Portal container={container}>
      <BaseAutocomplete.Positioner
        className="z-50 outline-hidden"
        anchor={anchor}
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
      >
        <BaseAutocomplete.Popup
          data-slot="autocomplete-content"
          className={cn(
            // behavior
            'w-(--anchor-width) max-w-(--available-width) max-h-[min(20rem,var(--available-height))] overflow-y-auto overscroll-contain outline-hidden',
            '[&:not(:has([data-slot=autocomplete-item],[data-slot=autocomplete-empty]:not(:empty),[data-slot=autocomplete-status]:not(:empty)))]:hidden',
            'origin-(--transform-origin) transition-[scale,opacity] duration-100 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none',
            // look
            'scroll-py-1 rounded-sm border border-soft bg-base p-1 text-[13px] text-strong',
            className,
          )}
          {...props}
        />
      </BaseAutocomplete.Positioner>
    </BaseAutocomplete.Portal>
  );
}

export function AutocompleteList({ className, ...props }: WithClassName<BaseAutocomplete.List.Props>) {
  return <BaseAutocomplete.List data-slot="autocomplete-list" className={cn('outline-hidden', className)} {...props} />;
}

// A suggestion. Long text wraps instead of widening the list past the frame; the row grows, a line at a time.
export function AutocompleteItem({ className, ...props }: WithClassName<BaseAutocomplete.Item.Props>) {
  return (
    <BaseAutocomplete.Item
      data-slot="autocomplete-item"
      className={cn(
        // behavior. Highlight comes from data-highlighted (keyboard and pointer alike), never :hover.
        'flex cursor-default items-start outline-hidden select-none [&>svg]:shrink-0',
        // look. One line is 32px: 20px of line plus 6px above and below. The icon's 2px top margin centers it on
        // the first line ((20px line - 16px icon) / 2). Change them together.
        'min-h-8 gap-2 rounded-xs px-2 py-1.5 leading-5 data-highlighted:bg-soft data-disabled:opacity-50 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:text-soft data-highlighted:[&>svg]:text-strong',
        className,
      )}
      {...props}
    />
  );
}

// The two messages share a look. Both stay mounted so screen readers hear them change; empty, they take no space.
const messageClassName = cn(
  // look
  'px-2 py-1.5 leading-5 text-soft empty:p-0',
);

// Shown when no suggestion matches (needs `items` on Autocomplete).
export function AutocompleteEmpty({ className, ...props }: WithClassName<BaseAutocomplete.Empty.Props>) {
  return <BaseAutocomplete.Empty data-slot="autocomplete-empty" className={cn(messageClassName, className)} {...props} />;
}

// A status for suggestions that load: "Searching…", "3 results", an error.
export function AutocompleteStatus({ className, ...props }: WithClassName<BaseAutocomplete.Status.Props>) {
  return (
    <BaseAutocomplete.Status data-slot="autocomplete-status" className={cn(messageClassName, className)} {...props} />
  );
}

// Suggestions in sections ("Recent", "Serif"): give Autocomplete `items` as groups, `{ value, items }[]`, and map
// them in AutocompleteList to an AutocompleteGroup each, with a label and its items in an AutocompleteCollection.
export function AutocompleteGroup({ className, ...props }: WithClassName<BaseAutocomplete.Group.Props>) {
  return (
    <BaseAutocomplete.Group
      data-slot="autocomplete-group"
      className={cn(
        // look
        'not-first:mt-1',
        className,
      )}
      {...props}
    />
  );
}

export function AutocompleteGroupLabel({ className, ...props }: WithClassName<BaseAutocomplete.GroupLabel.Props>) {
  return (
    <BaseAutocomplete.GroupLabel
      data-slot="autocomplete-group-label"
      className={cn(
        // behavior. Pinned while its section scrolls under it.
        'sticky z-10 flex items-center select-none',
        // look. `-top-1` cancels the panel's padding (p-1): sticky offsets count from inside it. The fill hides the rows
        // scrolling under it.
        '-top-1 h-7 bg-base px-2 text-[10.5px] font-medium tracking-[0.14em] text-soft uppercase',
        className,
      )}
      {...props}
    />
  );
}

// Renders a group's items, as AutocompleteList does the top level's: `{(item) => <AutocompleteItem … />}`.
export const AutocompleteCollection = BaseAutocomplete.Collection;
