import type { AnimationEvent, CSSProperties } from 'react';

/** Press Start 2P: every glyph advances exactly 1em. */
const DISPLAY_S_ADVANCE = 16;
/** `text-label`: 12px glyphs plus 0.04em tracking. */
const LABEL_ADVANCE = 12 * 1.04;

/** Round up to the 4px pixel unit, so every step of the slide lands on whole pixels. */
const ceil4 = (px: number) => Math.ceil(px / 4) * 4;

/** Name of the keyframes that end the banner (see components.css). */
const EXIT_ANIMATION = 'zone-banner-out';

/** `1` → `"01"`. */
export function formatZoneNumber(zone: number): string {
  return String(Math.max(0, Math.floor(zone))).padStart(2, '0');
}

export interface ZoneBannerProps {
  /** Zone number, shown zero-padded: `2` → `ZONE 02`. */
  zone: number;
  /** Zone name, e.g. "The Adventurer" (rendered uppercase). */
  name: string;
  /** Called once the banner has faded out; unmount it then. */
  onDone?: () => void;
}

/**
 * "Zone entered" card (SPEC §2.5, signature moment ③): a Celeste-style wood card with
 * `ZONE 0N` and the zone name. It slides in from the left edge of its ZoneHeader in 4 steps
 * (360ms), holds 1.2s, then fades out in 3 steps, all in CSS (`.zone-banner` in
 * components.css). It is absolutely positioned over the eyebrow, so it never moves layout,
 * and `aria-hidden`: the H2 already announces the zone. Render it inside the ZoneHeader's
 * eyebrow; under reduced motion it is not rendered at all (see `useZoneEntered`).
 *
 * The card's widths are computed from the text so that its travel is a multiple of 4px and
 * each of the 4 steps lands on a whole pixel.
 */
export function ZoneBanner({ zone, name, onDone }: ZoneBannerProps) {
  const label = `Zone ${formatZoneNumber(zone)}`;
  const vars = {
    '--zb-label-w': `${ceil4(label.length * LABEL_ADVANCE)}px`,
    '--zb-name-w': `${ceil4(name.length * DISPLAY_S_ADVANCE)}px`,
  } as CSSProperties;

  const handleAnimationEnd = (event: AnimationEvent<HTMLSpanElement>) => {
    if (event.animationName === EXIT_ANIMATION) onDone?.();
  };

  return (
    <span className="zone-banner" aria-hidden="true" data-testid="zone-banner" style={vars}>
      <span className="zone-banner__card px-frame px-drop" onAnimationEnd={handleAnimationEnd}>
        <span className="zone-banner__zone text-label text-fg-subtle">{label}</span>
        <span className="zone-banner__name text-display-s uppercase text-fg">{name}</span>
      </span>
    </span>
  );
}
