import { createElement, type HTMLAttributes, type ReactNode } from 'react';
import { cx } from './ui/cx';

/**
 * `wood` (default, `surface`), `paper` (parchment + ink; focus ring and links
 * switch to ink), `inset` (sunken well with a 2px inner line, no frame),
 * `ghost` (frame only, transparent).
 *
 * Legacy aliases kept for the current sections: `parchment` → `paper`,
 * `dark` → the page ground (`bg`) with a subtle frame.
 */
export type PixelPanelVariant = 'wood' | 'paper' | 'inset' | 'ghost' | 'parchment' | 'dark';
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
   * 4px notched frame colour. Default `accent` (brass); `subtle` for `dark`;
   * `inset` has no frame unless you ask for one (it then replaces the inner line).
   */
  frame?: PixelPanelFrame;
  /** Small brass title plate on the top frame (pixel `label` text). Leave ~20px above the panel. */
  tab?: ReactNode;
  className?: string;
  children?: ReactNode;
}

type Surface = 'wood' | 'paper' | 'inset' | 'ghost' | 'dark';

const surfaceOf: Record<PixelPanelVariant, Surface> = {
  wood: 'wood',
  paper: 'paper',
  parchment: 'paper',
  inset: 'inset',
  ghost: 'ghost',
  dark: 'dark',
};

const defaultFrame: Record<Surface, PixelPanelFrame> = {
  wood: 'accent',
  paper: 'accent',
  inset: 'none',
  ghost: 'accent',
  dark: 'subtle',
};

// With a tab the top padding grows so content clears the plate.
const paddingClasses: Record<PixelPanelPadding, { plain: string; tab: string }> = {
  sm: { plain: 'p-4', tab: 'px-4 pb-4 pt-8' },
  md: { plain: 'p-4 md:p-6', tab: 'px-4 pb-4 pt-8 md:px-6 md:pb-6 md:pt-10' },
  lg: { plain: 'p-6 md:p-8', tab: 'px-6 pb-6 pt-10 md:px-8 md:pb-8 md:pt-12' },
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
  const surface = surfaceOf[variant];
  const resolvedFrame = frame ?? defaultFrame[surface];
  const hasTab = tab != null && tab !== false;

  const frameClass =
    resolvedFrame === 'none'
      ? surface === 'inset'
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
        `px-panel--${surface}`,
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
