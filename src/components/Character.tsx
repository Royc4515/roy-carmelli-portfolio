import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { Pose } from '../theme/tokens';
import { pixelSprites } from '../theme/pixelSprites';
import './Character.css';

export interface CharacterProps {
  pose: Pose;
  /** Integer display scale, 1-4. Other values are rounded and clamped (with a dev warning). */
  scale?: number;
  /** Mirror horizontally. */
  flip?: boolean;
  /** Hide from assistive tech (use when the sprite is purely decorative). */
  decorative?: boolean;
  /** Accessible name when not decorative. */
  label?: string;
  className?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function toIntegerScale(scale: number): number {
  const s = Number.isFinite(scale) ? Math.round(scale) : MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

/** True while the element is (near) the viewport and the tab is visible. */
function useRunning(ref: RefObject<HTMLElement>, enabled: boolean): boolean {
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      entries => setInView(entries.some(e => e.isIntersecting)),
      { rootMargin: '64px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, ref]);

  useEffect(() => {
    if (!enabled) return;
    const onChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, [enabled]);

  return inView && pageVisible;
}

/**
 * Roy as a pixel-art sprite. Renders one element whose background is the pose's native
 * resolution sprite sheet, sized to frame x `scale` (integer) and stepped with CSS `steps()`.
 * The animation pauses off-screen and in hidden tabs, and rests on frame 0 under
 * `prefers-reduced-motion: reduce`.
 */
export default function Character({
  pose,
  scale = 1,
  flip = false,
  decorative = false,
  label = 'Roy, pixel-art character',
  className = '',
}: CharacterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const sheet = pixelSprites[pose];
  const s = toIntegerScale(scale);
  const animated = sheet.frames > 1 && sheet.frameMs > 0;
  const running = useRunning(ref, animated);

  useEffect(() => {
    if (import.meta.env.DEV && s !== scale) {
      console.warn(`[Character] scale must be an integer from 1 to 4; got ${scale}, using ${s}.`);
    }
  }, [scale, s]);

  const sheetW = sheet.frameW * sheet.frames * s;
  const style = {
    width: `${sheet.frameW * s}px`,
    height: `${sheet.frameH * s}px`,
    backgroundImage: `url(${sheet.src})`,
    backgroundSize: `${sheetW}px ${sheet.frameH * s}px`,
    transform: flip ? 'scaleX(-1)' : undefined,
    '--px-frames': String(sheet.frames),
    '--px-duration': `${sheet.frames * sheet.frameMs}ms`,
    '--px-sheet-end': `-${sheetW}px`,
  } as CSSProperties;

  const classes = [
    'px-character',
    animated && 'px-character--animated',
    animated && !running && 'px-character--paused',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      style={style}
      data-pose={pose}
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label })}
    />
  );
}
