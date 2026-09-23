import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { SkillDetail } from '../lib/skillUsage';
import PixelIcon from './PixelIcon';

/** Tooltip body, shared by the floating tooltip and the inline detail row (mobile). */
export function SkillTooltipBody({ detail }: { detail: SkillDetail }) {
  const last = detail.usedIn.length - 1;
  return (
    <>
      <p className="text-label text-ink">{detail.name}</p>
      <p className="mt-1 text-body-s text-ink-muted">{detail.category}</p>
      {detail.usedIn.length > 0 ? (
        <div className="skill-tip__rule mt-3 pt-3 text-hud">
          <p className="uppercase text-ink-muted">
            Used in<span className="sr-only">:</span>
          </p>
          <ul role="list" className="mt-1 space-y-1 text-ink">
            {detail.usedIn.map((title, i) => (
              <li key={title} className="flex items-center gap-2">
                <PixelIcon name="play" size={12} className="shrink-0 text-ink-muted" />
                <span>
                  {title}
                  {i < last && <span className="sr-only">,</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : detail.note ? (
        <p className="skill-tip__rule mt-3 pt-3 text-hud uppercase text-ink-muted">{detail.note}</p>
      ) : null}
    </>
  );
}

export type TooltipSide = 'bottom' | 'top';

export interface Placement {
  /** Horizontal offset from the anchor's left edge, in whole px. */
  x: number;
  side: TooltipSide;
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PlacementOptions {
  /** Minimum distance from the viewport edges. */
  margin?: number;
  /** Space between the anchor and the tooltip (frame included). */
  gap?: number;
  /** Height covered at the top of the viewport (the fixed navbar). */
  topInset?: number;
}

/**
 * Where to put a tooltip of `size` next to `anchor` so it stays inside the viewport:
 * left-aligned with the anchor, else right-aligned (flip left), else clamped to the
 * margins; below the anchor unless only the space above fits it (flip up).
 */
export function placeTooltip(
  anchor: Box,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  { margin = 16, gap = 16, topInset = 72 }: PlacementOptions = {},
): Placement {
  const maxLeft = viewport.width - margin - size.width;
  let left = anchor.left;
  if (left > maxLeft) left = anchor.right - size.width;
  left = Math.min(Math.max(left, margin), Math.max(margin, maxLeft));

  const fitsBelow = anchor.bottom + gap + size.height <= viewport.height - margin;
  const fitsAbove = anchor.top - gap - size.height >= topInset;
  return { x: Math.round(left - anchor.left), side: !fitsBelow && fitsAbove ? 'top' : 'bottom' };
}

export interface SkillTooltipProps {
  id: string;
  detail: SkillDetail;
  /** Shown (and placed) when true; otherwise kept in the DOM, hidden, for `aria-describedby`. */
  open: boolean;
  /** The positioned element the tooltip hangs from (the item's list entry). */
  anchorRef: RefObject<HTMLElement>;
}

/**
 * Stardew-style item tooltip: paper card with a 4px ink frame. Always rendered so the
 * item's `aria-describedby` resolves; visible only while `open`, placed inside the
 * viewport (flips left and up near the edges) and re-placed on scroll and resize.
 */
export function SkillTooltip({ id, detail, open, anchorRef }: SkillTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement>({ x: 0, side: 'bottom' });

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const tip = ref.current;
      const anchor = anchorRef.current;
      if (!tip || !anchor) return;
      const next = placeTooltip(
        anchor.getBoundingClientRect(),
        { width: tip.offsetWidth, height: tip.offsetHeight },
        { width: document.documentElement.clientWidth, height: window.innerHeight },
      );
      setPlacement(prev => (prev.x === next.x && prev.side === next.side ? prev : next));
    };
    place();
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [open, anchorRef]);

  return (
    <div
      ref={ref}
      id={id}
      role="tooltip"
      hidden={!open}
      data-side={placement.side}
      className="skill-tip px-frame px-drop-sm bg-paper px-4 py-3 text-ink"
      style={{ '--tip-x': `${placement.x}px` } as CSSProperties}
    >
      <SkillTooltipBody detail={detail} />
    </div>
  );
}

export default SkillTooltip;
