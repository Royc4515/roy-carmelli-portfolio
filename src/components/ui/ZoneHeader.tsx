import { useRef, useState, type ReactNode } from 'react';
import { useInView } from 'framer-motion';
import { cx } from './cx';
import { ZoneBanner, formatZoneNumber } from './ZoneBanner';
import { useZoneEntered } from '../../hooks/useZoneEntered';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

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

const NBSP = ' ';
/** Names up to this length never break inside (they fit a 320px screen on one line). */
const UNBREAKABLE_NAME_MAX = 16;

/**
 * `ZONE 02 · THE ADVENTURER`, with a single break opportunity after the dot on narrow
 * screens: "ZONE 02 ·" / "THE ADVENTURER", never "ZONE 02 · THE" / "ADVENTURER".
 */
function eyebrowText(zone: number, name: string): string {
  const joinedName = name.length <= UNBREAKABLE_NAME_MAX ? name.replace(/ /g, NBSP) : name;
  return `Zone${NBSP}${formatZoneNumber(zone)}${NBSP}· ${joinedName}`;
}


/**
 * Zone header (SPEC §3): icon, `ZONE 0N · NAME` eyebrow, H2 title, optional
 * subline, then a full-width pixel divider. Place it first inside
 * `<section aria-labelledby={id}>`.
 *
 * Signature moment ③ lives here, so every zone gets it: the divider draws in (8 steps) the
 * first time it comes into view, and the first time the header crosses 35% of the viewport
 * while scrolling down a "zone entered" card (`ZoneBanner`) slides over the eyebrow, holds and
 * fades back into it. Both are off under reduced motion.
 */
export function ZoneHeader({ zone, name, title, subtitle, icon, id, className }: ZoneHeaderProps) {
  const reduced = usePrefersReducedMotion();
  const entered = useZoneEntered(id);
  const [bannerDone, setBannerDone] = useState(false);
  const showBanner = entered && !bannerDone;
  // Divider "draw in" (CSS, components.css): pending until the rule is fully in view, then an
  // 8-step clip-path wipe. Watched on the unclipped wrapper: IntersectionObserver counts the
  // target's own clip-path, so a fully clipped divider would never be "in view".
  const ruleRef = useRef<HTMLDivElement>(null);
  const ruleInView = useInView(ruleRef, { once: true, amount: 'all' });

  const hasIcon = icon != null;

  // Grid: ≥ 640px the 36px icon is a column beside the text; below it the icon drops to 24px
  // inline with the eyebrow and the H2 and subline take the full width.
  return (
    <header className={cx('zone-header', hasIcon && 'zone-header--icon', className)}>
      <div
        className={cx(
          'grid items-center gap-x-3 sm:gap-x-4',
          hasIcon
            ? 'grid-cols-[24px_minmax(0,1fr)] sm:grid-cols-[36px_minmax(0,1fr)]'
            : 'grid-cols-[minmax(0,1fr)]',
        )}
      >
        {hasIcon && (
          <span className="zone-header__icon col-start-1 row-start-1 sm:row-span-3 sm:self-start" aria-hidden="true">
            {icon}
          </span>
        )}
        {/* leading-5 + -my-0.5: 16px lines with a 4px gap when the eyebrow wraps. */}
        <p
          className={cx(
            'zone-header__eyebrow relative -my-0.5 text-balance text-label leading-5 text-fg-subtle sm:text-accent-fg',
            hasIcon && 'col-start-2 row-start-1',
          )}
          data-banner={showBanner || undefined}
        >
          {eyebrowText(zone, name)}
          {showBanner && <ZoneBanner zone={zone} name={name} onDone={() => setBannerDone(true)} />}
        </p>
        {/* tabIndex -1: the pause menu moves focus here after a jump (no extra tab stop). */}
        <h2
          id={id}
          tabIndex={-1}
          className={cx(
            'zone-header__title mt-1 text-balance text-display-l text-fg [overflow-wrap:break-word] sm:mt-2',
            hasIcon && 'col-span-2 sm:col-span-1 sm:col-start-2',
          )}
        >
          {title}
        </h2>
        {subtitle != null && (
          <p
            className={cx(
              'mt-2 max-w-[68ch] text-balance text-body text-fg-muted',
              hasIcon && 'col-span-2 sm:col-span-1 sm:col-start-2',
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      <div
        ref={ruleRef}
        className="zone-header__rule mt-4 md:mt-5 short:mt-3 low:mt-3"
        data-draw={reduced ? undefined : ruleInView ? 'run' : 'pending'}
      >
        <div className="px-divider" aria-hidden="true" />
      </div>
    </header>
  );
}
