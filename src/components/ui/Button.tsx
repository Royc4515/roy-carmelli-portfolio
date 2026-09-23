import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ForwardedRef,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';
export type ButtonSize = 'md' | 'lg';

interface CommonProps {
  /** `md` is 48px tall with a 12px pixel label; `lg` is 56px with a 16px label. Ghost ignores it. */
  size?: ButtonSize;
  /** Extra classes (Tailwind utilities win over the component styles). */
  className?: string;
  /**
   * Disables the control. A `<button>` gets the native `disabled` attribute; a link loses
   * its `href` and gets `aria-disabled="true"`, so it cannot navigate.
   */
  disabled?: boolean;
}

/** A button with a visible text label. */
interface LabelledProps extends CommonProps {
  /** `primary` (brass, default), `secondary` (wood with a brass frame) or `ghost` (underlined HUD text). */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** The label. Pixel variants render it uppercase via CSS; pass normal casing. */
  children: ReactNode;
  /** Icon before the label (e.g. `<PixelIcon name="play" size={12} />`). Decorative. */
  leadingIcon?: ReactNode;
  /** Icon after the label (e.g. `<PixelIcon name="external" size={12} />`). Decorative. */
  trailingIcon?: ReactNode;
  'aria-label'?: string;
}

/** An icon-only square button: the accessible name must come from `aria-label`. */
interface IconOnlyProps extends CommonProps {
  variant: 'icon';
  /** The icon (24px), e.g. `<PixelIcon name="copy" size={24} />`. */
  children: ReactNode;
  /** Required: an icon-only control has no visible text. */
  'aria-label': string;
  leadingIcon?: never;
  trailingIcon?: never;
}

type OwnKeys = 'children' | 'className' | 'aria-label' | 'disabled';

/** Rendered as `<a>`. */
interface AsLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, OwnKeys | 'href' | 'download' | 'target'> {
  href: string;
  /** Opens in a new tab: adds `target="_blank"` and `rel="noreferrer"`. */
  external?: boolean;
  /** Adds the `download` attribute (`true`, or a suggested file name). */
  download?: boolean | string;
}

/** Rendered as `<button>` (`type="button"` unless set). */
interface AsButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, OwnKeys> {
  href?: undefined;
  external?: never;
  download?: never;
}

export type ButtonProps = (LabelledProps | IconOnlyProps) & (AsLinkProps | AsButtonProps);

/** Flat view of ButtonProps for the implementation. */
interface LooseProps extends CommonProps {
  variant?: ButtonVariant;
  children: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  href?: string;
  external?: boolean;
  download?: boolean | string;
  rel?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  [attribute: string]: unknown;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className="px-btn__icon" aria-hidden="true">
      {children}
    </span>
  );
}

/**
 * Arcade button (SPEC §3). Renders an `<a>` when `href` is set, otherwise a
 * `<button type="button">`. Hover is a half press, active a full press, both
 * pure CSS (see `src/styles/components.css`); reduced motion keeps the colour
 * change and drops the travel.
 *
 * @example
 *   <Button href="#projects" leadingIcon={<PixelIcon name="play" size={12} />}>View projects</Button>
 *   <Button href={cv} download variant="secondary" size="lg">Resume</Button>
 *   <Button variant="icon" aria-label="Copy email" onClick={copy}><PixelIcon name="copy" size={24} /></Button>
 */
export const Button = forwardRef<HTMLAnchorElement | HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = 'primary',
      size = 'md',
      className,
      disabled = false,
      children,
      leadingIcon,
      trailingIcon,
      href,
      external = false,
      download,
      rel,
      type,
      onClick,
      ...rest
    } = props as LooseProps;

    const classes = cx(
      'px-btn',
      `px-btn--${variant}`,
      size === 'lg' && variant !== 'ghost' && 'px-btn--lg',
      className,
    );

    const content =
      variant === 'icon' ? (
        <Icon>{children}</Icon>
      ) : (
        <>
          {leadingIcon != null && <Icon>{leadingIcon}</Icon>}
          <span className="px-btn__label">{children}</span>
          {trailingIcon != null && <Icon>{trailingIcon}</Icon>}
        </>
      );

    if (href !== undefined) {
      const anchorRef = ref as ForwardedRef<HTMLAnchorElement>;
      if (disabled) {
        // No href: nothing to follow, and the link leaves the tab order like a disabled button.
        return (
          <a {...rest} ref={anchorRef} role="link" aria-disabled="true" className={classes}>
            {content}
          </a>
        );
      }
      return (
        <a
          {...rest}
          ref={anchorRef}
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? cx('noreferrer', rel) : rel}
          download={download === true ? '' : download || undefined}
          onClick={onClick}
          className={classes}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        {...rest}
        ref={ref as ForwardedRef<HTMLButtonElement>}
        type={type ?? 'button'}
        disabled={disabled}
        onClick={onClick}
        className={classes}
      >
        {content}
      </button>
    );
  },
);
