import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export type ChipTone = 'default' | 'accent';
/** The surface the chip sits on: dark grounds and wood (`dark`) or parchment (`paper`). */
export type ChipSurface = 'dark' | 'paper';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** `accent` gives the brass line used for the top technologies. */
  tone?: ChipTone;
  /** Match the surface underneath so the chip keeps its contrast. Default `dark`. */
  surface?: ChipSurface;
  /** Tech names keep their casing: the chip never uppercases. */
  children: ReactNode;
}

/**
 * Static tag (SPEC §3): HUD mono 13px, 28px tall, sunken fill with a 2px inner
 * line. Not interactive.
 */
export function Chip({ tone = 'default', surface = 'dark', className, children, ...rest }: ChipProps) {
  return (
    <span
      {...rest}
      className={cx(
        'px-chip',
        tone === 'accent' && 'px-chip--accent',
        surface === 'paper' && 'px-chip--paper',
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface ChipListProps extends Omit<HTMLAttributes<HTMLUListElement>, 'children'> {
  /** Labels in display order. */
  items: readonly string[];
  /** The first N items get the `accent` tone. Default 0. */
  accentCount?: number;
  /** Show at most this many chips, then a `+N` chip that names the rest for assistive tech. */
  max?: number;
  /** Passed to every chip. Default `dark`. */
  surface?: ChipSurface;
}

/**
 * A wrapping list of chips with an optional overflow chip.
 *
 * @example
 *   <ChipList items={project.tech} accentCount={3} max={5} surface="paper" />
 */
export function ChipList({
  items,
  accentCount = 0,
  max,
  surface = 'dark',
  className,
  ...rest
}: ChipListProps) {
  const limit = max === undefined ? items.length : Math.max(0, Math.floor(max));
  const shown = items.slice(0, limit);
  const hidden = items.slice(limit);
  const hiddenLabel = hidden.length > 0 ? `and ${hidden.length} more: ${hidden.join(', ')}` : '';

  return (
    // role="list": Safari drops list semantics when list-style is none.
    <ul {...rest} role="list" className={cx('px-chip-list', className)}>
      {shown.map((item, i) => (
        <li key={`${item}-${i}`}>
          <Chip tone={i < accentCount ? 'accent' : 'default'} surface={surface}>
            {item}
          </Chip>
        </li>
      ))}
      {hidden.length > 0 && (
        <li>
          <Chip surface={surface} className="px-chip--more" title={hiddenLabel}>
            <span aria-hidden="true">+{hidden.length}</span>
            <span className="sr-only">{hiddenLabel}</span>
          </Chip>
        </li>
      )}
    </ul>
  );
}
