import type { ReactNode } from 'react';
import { CHOOSER_HREF, type OptionKey } from '../route';
import { useOptionReady } from './ready';

interface OptionShellProps {
  optionKey: OptionKey;
  /** Extra class on the root, e.g. the option's own scope class. */
  className?: string;
  /** Where "Skip to content" lands. */
  mainId?: string;
  /** The "back to options" chip. Off when an option is the live site, where there is no review. */
  review?: boolean;
  children: ReactNode;
}

/**
 * The frame every option shares: the `.opt` scope (shared/base.css), a skip link as the first
 * focusable element, and the review chip back to the chooser. The chip is marked
 * `data-review-chrome`: it exists for comparing options and is left out of the measurements.
 */
export function OptionShell({ optionKey, className, mainId = 'main', review = true, children }: OptionShellProps) {
  useOptionReady();
  return (
    <div className={`opt opt-${optionKey}${className ? ` ${className}` : ''}`}>
      <a className="opt-skip" href={`#${mainId}`}>
        Skip to content
      </a>
      {children}
      {review && (
        <a className="opt-review" href={CHOOSER_HREF} data-review-chrome="">
          <span aria-hidden="true">&larr;</span> Options
          <span className="opt-sr">: back to the list of design options</span>
        </a>
      )}
    </div>
  );
}
