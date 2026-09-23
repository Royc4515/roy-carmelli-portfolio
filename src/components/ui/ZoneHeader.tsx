import type { ReactNode } from 'react';
import { cx } from './cx';

export interface ZoneHeaderProps {
  /** Zone number, shown zero-padded: `1` → `ZONE 01`. */
  zone: number;
  /** Zone name for the eyebrow, e.g. "The Library" (rendered uppercase). */
  name: string;
  /** The H2 text, e.g. "Things I've Built". */
  title: ReactNode;
  /** Optional one-line subline (≤ 90 characters). */
  subtitle?: ReactNode;
  /** 36px icon left of the text block, e.g. `<PixelIcon name="book" size={36} />`. Decorative. */
  icon?: ReactNode;
  /** Id of the H2; point the section's `aria-labelledby` at it. */
  id: string;
  /** Extra classes on the root. It carries a 32px bottom margin; override with `mb-*`. */
  className?: string;
}

/** `1` → `"01"`. */
function formatZoneNumber(zone: number): string {
  return String(Math.max(0, Math.floor(zone))).padStart(2, '0');
}

/**
 * Zone header (SPEC §3): icon, `ZONE 0N · NAME` eyebrow, H2 title, optional
 * subline, then a full-width pixel divider. Place it first inside
 * `<section aria-labelledby={id}>`.
 */
export function ZoneHeader({ zone, name, title, subtitle, icon, id, className }: ZoneHeaderProps) {
  return (
    <header className={cx('zone-header', className)}>
      <div className="flex items-start gap-4">
        {icon != null && (
          <span className="zone-header__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-label text-accent-fg">
            Zone {formatZoneNumber(zone)} · {name}
          </p>
          <h2 id={id} className="mt-2 text-display-l text-fg [overflow-wrap:break-word]">
            {title}
          </h2>
          {subtitle != null && (
            <p className="mt-2 max-w-[68ch] text-body text-fg-muted">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="px-divider mt-6" aria-hidden="true" />
    </header>
  );
}
