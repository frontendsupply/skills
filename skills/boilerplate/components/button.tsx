import * as React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { tv, type VariantProps } from 'tailwind-variants';

// One size. `status` picks the color, `variant` how much of it. Each status only sets four variables
// (--button, --button-on, --button-ink, --button-tint); each variant only reads them, so every
// combination works without a compound variant.
export const buttonVariants = tv({
  base: [
    // behavior
    'relative inline-flex shrink-0 items-center justify-center border border-transparent whitespace-nowrap outline-hidden select-none',
    // Icons are direct `svg` children. An icon alone makes the button square.
    '[&>svg]:shrink-0 has-[>svg:only-child]:aspect-square has-[>svg:only-child]:px-0',
    '*:data-[slot=button-label]:min-w-0 *:data-[slot=button-label]:truncate',
    // Loading: the content stays (it keeps the width and the accessible name) but turns invisible, and a
    // spinner takes its place. The spinner is a pseudo-element, so it never counts as a child.
    'data-loading:*:opacity-0 data-loading:after:absolute data-loading:after:inset-0 data-loading:after:m-auto data-loading:after:animate-spin data-loading:after:rounded-full data-loading:after:border-current data-loading:after:border-r-transparent motion-reduce:data-loading:after:[animation-duration:1.5s]',
    'transition-[background-color,border-color,color,box-shadow,translate,opacity] duration-100 ease-out motion-reduce:transition-none',
    // look. The icon side gets less padding than the text side. Logical sides (start, end), so in a right-to-left
    // page, where a leading icon sits on the right, the right is what tightens.
    'h-8 gap-2 rounded-sm px-3 text-[13px] font-medium [&>svg]:size-4',
    'has-[>svg:first-child:not(:only-child)]:ps-2.5 has-[>svg:last-child:not(:only-child)]:pe-2.5',
    'data-loading:after:size-4 data-loading:after:border-2',
    'focus-visible:ring-2 focus-visible:ring-primary',
    'active:not-data-disabled:translate-y-px data-disabled:not-data-loading:opacity-50',
  ],
  variants: {
    status: {
      // look
      neutral:
        '[--button-ink:var(--text-strong)] [--button-on:var(--text-inverse)] [--button-tint:var(--bg-soft)] [--button:var(--bg-strong)]',
      information:
        '[--button-ink:var(--information-dark)] [--button-on:var(--color-white)] [--button-tint:var(--information-light)] [--button:var(--information)]',
      success:
        '[--button-ink:var(--success-dark)] [--button-on:var(--color-white)] [--button-tint:var(--success-light)] [--button:var(--success)]',
      warning:
        '[--button-ink:var(--warning-dark)] [--button-on:var(--color-white)] [--button-tint:var(--warning-light)] [--button:var(--warning)]',
      danger:
        '[--button-ink:var(--danger-dark)] [--button-on:var(--color-white)] [--button-tint:var(--danger-light)] [--button:var(--danger)]',
    },
    variant: {
      // look. Letterpress: raised buttons sit on a hard 1px edge and press flat when clicked.
      solid:
        'bg-(--button) text-(--button-on) shadow-[0_1px_0_color-mix(in_oklab,var(--button),black_35%)] hover:not-data-disabled:bg-(--button)/90 active:not-data-disabled:shadow-none',
      outline:
        'border-soft bg-base text-(--button-ink) shadow-[0_1px_0_var(--stroke-soft)] hover:not-data-disabled:border-sub active:not-data-disabled:shadow-none [&>svg]:opacity-70',
      ghost: 'text-(--button-ink) hover:not-data-disabled:bg-(--button-tint) [&>svg]:opacity-70',
    },
  },
  defaultVariants: { status: 'neutral', variant: 'outline' },
});

/** Marks content as the button's label when it isn't a plain string: `<ButtonLabel><Trans>…</Trans></ButtonLabel>`. */
export function ButtonLabel(props: React.ComponentProps<'span'>) {
  return <span data-slot="button-label" {...props} />;
}

// Fragments are opened, so `{cond ? <>Saving</> : 'Save'}` counts as text too.
function flatten(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).flatMap((child) =>
    React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === React.Fragment
      ? flatten(child.props.children)
      : [child],
  );
}

// Text runs become one <span data-slot="button-label">, so icons are always direct `svg` children at the
// start or the end and CSS can tell a leading icon, a trailing icon and an icon-only button apart.
// Anything else that renders text (an i18n component) has to come in a ButtonLabel.
function withLabel(children: React.ReactNode, id: string) {
  const parts: React.ReactNode[] = [];
  let text: (string | number)[] = [];
  let labels = 0;
  const label = (node: React.ReactNode) => {
    parts.push(node);
    labels++;
  };
  const flush = () => {
    if (text.join('').trim())
      label(
        <span key={`label-${labels}`} id={labels === 0 ? id : undefined} data-slot="button-label">
          {text}
        </span>,
      );
    text = [];
  };
  flatten(children).forEach((child, i) => {
    if (typeof child === 'string' || typeof child === 'number') return text.push(child);
    flush();
    if (React.isValidElement<{ id?: string }>(child) && child.type === ButtonLabel)
      label(React.cloneElement(child, { key: `label-${labels}`, id: child.props.id ?? (labels === 0 ? id : undefined) }));
    else parts.push(React.isValidElement(child) ? React.cloneElement(child, { key: `part-${i}` }) : child);
  });
  flush();
  return { parts, labelled: labels === 1 };
}

export type ButtonProps = Omit<BaseButton.Props, 'className'> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
    /** Shows a spinner in place of the content and disables the button, keeping it focusable. */
    loading?: boolean;
  };

export function Button({
  className,
  status,
  variant,
  loading: loadingProp,
  disabled = false,
  focusableWhenDisabled = false,
  children,
  ref,
  ...props
}: ButtonProps) {
  const id = React.useId();
  // Only a button that can load (it gets a `loading` prop, true or false) holds its width and names itself
  // by its label. Every other button keeps the browser's own name, built from all of its content.
  const canLoad = loadingProp !== undefined;
  const loading = loadingProp ?? false;

  // Loading holds the width the button had before it started, even when the label changes ("Saving…"),
  // so nothing around it shifts. The width is recorded while idle, so it's the one from before the change.
  const nodeRef = React.useRef<HTMLButtonElement | null>(null);
  const idleWidth = React.useRef(0);
  React.useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!canLoad || !node || typeof ResizeObserver === 'undefined') return;
    if (!loading) {
      // Read now, and again whenever it resizes. The observer alone reports on the next frame, so a loading that
      // starts before then (a click right after mount, a background tab) would have no width to hold.
      const measure = () => (idleWidth.current = node.getBoundingClientRect().width);
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      return () => observer.disconnect();
    }
    node.style.width = idleWidth.current ? `${idleWidth.current}px` : '';
    return () => {
      node.style.width = '';
    };
  }, [canLoad, loading]);
  const setRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      nodeRef.current = node;
      if (typeof ref === 'function') return ref(node);
      if (ref) ref.current = node;
    },
    [ref],
  );

  const { parts, labelled } = withLabel(children, id);
  // Base UI's loading pattern: the button stays focusable while it's disabled, and is named by its label,
  // because some screen readers don't announce a focused button's changing text otherwise.
  const named = props['aria-label'] != null || props['aria-labelledby'] != null;

  return (
    <BaseButton
      ref={setRef}
      data-slot="button"
      data-loading={loading || undefined}
      aria-labelledby={canLoad && labelled && !named ? id : undefined}
      disabled={disabled || loading}
      focusableWhenDisabled={focusableWhenDisabled || loading}
      className={buttonVariants({ status, variant, className })}
      {...props}
    >
      {parts}
    </BaseButton>
  );
}
