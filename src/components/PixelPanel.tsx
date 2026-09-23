import { createElement, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from './ui/cx';

/**
 * `wood` (default, `surface`), `paper` (parchment + ink; focus ring and links
 * switch to ink), `inset` (sunken well with a 2px inner line, no frame),
 * `ghost` (frame only, transparent).
 */
export type PixelPanelVariant = 'wood' | 'paper' | 'inset' | 'ghost';
export type PixelPanelPadding = 'sm' | 'md' | 'lg';
export type PixelPanelFrame = 'accent' | 'subtle' | 'none';
export type PixelPanelElement =
  | 'div'
  | 'section'
  | 'article'
  | 'aside'
  | 'li'
  | 'header'
  | 'footer'
  | 'figure'
  | 'details';

export interface PixelPanelProps extends HTMLAttributes<HTMLElement> {
  /** Surface. Default `wood`. */
  variant?: PixelPanelVariant;
  /** Element to render. Default `div`. */
  as?: PixelPanelElement;
  /** `sm` 16 · `md` 16 → 24 at md (default) · `lg` 24 → 32 at md. */
  padding?: PixelPanelPadding;
  /** 0 flat (default) · 1 `px-drop-sm` (4px) · 2 `px-drop` (8px). */
  elevation?: 0 | 1 | 2;
  /**
   * 4px notched frame colour. Default `accent` (brass); `inset` has no frame
   * unless you ask for one (it then replaces the inner line).
   */
  frame?: PixelPanelFrame;
  /** Small brass title plate on the top frame (pixel `label` text). Leave ~20px above the panel. */
  tab?: ReactNode;
  className?: string;
  children?: ReactNode;
}

const defaultFrame: Record<PixelPanelVariant, PixelPanelFrame> = {
  wood: 'accent',
  paper: 'accent',
  inset: 'none',
  ghost: 'accent',
};

// With a tab the top padding grows so content clears the plate.
const paddingClasses: Record<PixelPanelPadding, { plain: string; tab: string }> = {
  sm: { plain: 'p-4', tab: 'px-4 pb-4 pt-8' },
  md: { plain: 'p-4 md:p-5', tab: 'px-4 pb-4 pt-8 md:px-5 md:pb-5 md:pt-9' },
  lg: { plain: 'p-5 md:p-7', tab: 'px-5 pb-5 pt-9 md:px-7 md:pb-7 md:pt-11' },
};

const elevationClasses = { 0: '', 1: 'px-drop-sm', 2: 'px-drop' } as const;

/**
 * Pixel panel (SPEC §3): a surface with a 4px notched frame, optional hard
 * drop and optional title plate. Frame and drop use the `px-frame` /
 * `px-drop*` utilities; surfaces live in `src/styles/components.css`.
 *
 * @example
 *   <PixelPanel variant="paper" as="article" padding="lg" elevation={2} tab="Main quest">…</PixelPanel>
 */
export function PixelPanel({
  variant = 'wood',
  as = 'div',
  padding = 'md',
  elevation = 0,
  frame,
  tab,
  className,
  children,
  ...rest
}: PixelPanelProps) {
  const resolvedFrame = frame ?? defaultFrame[variant];
  const hasTab = tab != null && tab !== false;

  const frameClass =
    resolvedFrame === 'none'
      ? variant === 'inset'
        ? '' // the inset surface draws its own line and drop
        : 'px-panel--frameless'
      : resolvedFrame === 'subtle'
        ? 'px-frame px-frame-subtle'
        : 'px-frame';

  return createElement(
    as,
    {
      ...rest,
      className: cx(
        'px-panel',
        `px-panel--${variant}`,
        frameClass,
        elevationClasses[elevation],
        hasTab ? paddingClasses[padding].tab : paddingClasses[padding].plain,
        className,
      ),
    },
    hasTab && <div className="px-panel__tab">{tab}</div>,
    children,
  );
}

export default PixelPanel;
