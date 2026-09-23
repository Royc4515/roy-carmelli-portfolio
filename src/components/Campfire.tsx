import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import './Campfire.css';

/**
 * Campfire sprite: 3 frames of 21×21, drawn as SVG on the same pixel grid as Roy (the save
 * point renders both at one integer scale, so their pixels match).
 *
 * Bitmap legend (rows top to bottom, 21 characters each), one semantic token per ink:
 *   `.` transparent
 *   `r` outer flame  `--color-hp`
 *   `y` flame, ember `--color-accent-hover`
 *   `c` hot core     `--color-focus`
 *   `w` logs         `--color-ink-muted`
 *   `e` log ends     `--color-fg-muted`
 *
 * Two crossed logs, thinner at their far ends, cradle the flame in their V. Only the flame
 * changes between frames (the tongues and the core sway left → up → right, and one ember
 * rises), so the silhouette stays planted on the ground. Drawn for dark grounds: inside a
 * paper panel `--color-focus` turns to ink.
 */
const FRAMES = [
  [
    '........r............',
    '........rr...........',
    '........rrr..........',
    '........ryrr.....r...',
    '...r....ryyrr.y..r...',
    '...r...rryyyr...rr...',
    '...rr..ryyyyrr..rr...',
    '...rrr.ryyyyyr..rr...',
    '...rrrrrycyyyrrrrr...',
    '....rryyyccyyyyrr....',
    '....ryyyycccyyyyr....',
    '....ryyycccccyyyr....',
    '....ryycccccccyyr....',
    '...wwwycccccccywww...',
    '....wwwwcccccwwww....',
    '......wwwwcwwww......',
    '........wwwww........',
    '.....wwwww.wwwww.....',
    '...wwwww.....wwwww...',
    '.eewww.........wwwee.',
    '.ee...............ee.',
  ],
  [
    '..........r..........',
    '.........rr..........',
    '.........rrr...y.....',
    '...r.....ryr.........',
    '...r....rryrr....r...',
    '...rr...ryyyr....r...',
    '...rr..rryyyrr..rr...',
    '...rrr.ryyyyyr..rr...',
    '...rrrrryycyyrrrrr...',
    '....rrryycccyyyrr....',
    '....ryyyycccyyyyr....',
    '....ryyycccccyyyr....',
    '....ryycccccccyyr....',
    '...wwwycccccccywww...',
    '....wwwwcccccwwww....',
    '......wwwwcwwww......',
    '........wwwww........',
    '.....wwwww.wwwww.....',
    '...wwwww.....wwwww...',
    '.eewww.........wwwee.',
    '.ee...............ee.',
  ],
  [
    '............r..y.....',
    '...........rr........',
    '..........rrr........',
    '...r.....rryr........',
    '...r....rryyr........',
    '...rr...ryyyrr...r...',
    '...rr..rryyyyr..rr...',
    '...rrr.ryyyyyr..rr...',
    '...rrrrryyycyrrrrr...',
    '....rrryyyccyyyrr....',
    '....ryyyycccyyyyr....',
    '....ryyycccccyyyr....',
    '....ryycccccccyyr....',
    '...wwwycccccccywww...',
    '....wwwwcccccwwww....',
    '......wwwwcwwww......',
    '........wwwww........',
    '.....wwwww.wwwww.....',
    '...wwwww.....wwwww...',
    '.eewww.........wwwee.',
    '.ee...............ee.',
  ],
] as const;

type Ink = 'r' | 'y' | 'c' | 'w' | 'e';

const INKS: Record<Ink, string> = {
  r: 'var(--color-hp)',
  y: 'var(--color-accent-hover)',
  c: 'var(--color-focus)',
  w: 'var(--color-ink-muted)',
  e: 'var(--color-fg-muted)',
};

/** Native size of one (square) frame, in sprite pixels. */
export const CAMPFIRE_SIZE = 21;
/** Frames in the loop. */
export const CAMPFIRE_FRAMES = FRAMES.length;
/** One full flicker cycle (SPEC: steps(3) over 450ms). */
export const CAMPFIRE_CYCLE_MS = 450;

/** Raw bitmaps, for tests and review sheets. */
export function campfireFrames(): readonly (readonly string[])[] {
  return FRAMES;
}

/**
 * One SVG path `d` per ink for the whole strip (frame `i` is offset by `21 × i`): runs of one
 * ink per row, and identical runs on consecutive rows merged into one taller rectangle, each
 * written as `M x y h w v h h -w z`.
 */
function toPaths(): Record<Ink, string> {
  type Rect = { x: number; y: number; w: number; h: number };
  const rects: Record<Ink, Rect[]> = { r: [], y: [], c: [], w: [], e: [] };
  FRAMES.forEach((rows, frame) => {
    const offset = frame * CAMPFIRE_SIZE;
    // Rects that reached the previous row, per ink: candidates to grow downwards.
    let open = new Map<Ink, Rect[]>();
    rows.forEach((row, y) => {
      const next = new Map<Ink, Rect[]>();
      let x = 0;
      while (x < row.length) {
        const ink = row[x] as Ink | '.';
        if (ink === '.') {
          x += 1;
          continue;
        }
        let end = x + 1;
        while (end < row.length && row[end] === ink) end += 1;
        const rx = offset + x;
        const w = end - x;
        const above = open.get(ink)?.find(r => r.x === rx && r.w === w);
        const rect = above ?? { x: rx, y, w, h: 0 };
        if (!above) rects[ink].push(rect);
        rect.h += 1;
        next.set(ink, [...(next.get(ink) ?? []), rect]);
        x = end;
      }
      open = next;
    });
  });
  const d = (list: Rect[]) => list.map(r => `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`).join('');
  return { r: d(rects.r), y: d(rects.y), c: d(rects.c), w: d(rects.w), e: d(rects.e) };
}

let pathCache: Record<Ink, string> | null = null;

/** True while the element is (near) the viewport and the tab is visible. */
function useRunning(ref: RefObject<HTMLElement>): boolean {
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      entries => setInView(entries.some(e => e.isIntersecting)),
      { rootMargin: '64px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    const onChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return inView && pageVisible;
}

export interface CampfireProps {
  /**
   * Integer display scale, 1-4 (21px → 84px). Use the scale of the character it stands next
   * to, so both share one pixel grid. Other values are rounded and clamped.
   */
  scale?: number;
  className?: string;
}

/**
 * Decorative pixel campfire (SPEC §4 Contact, "save point"). A 21×21, 3-frame sprite shown at
 * an integer scale and flickered with CSS `steps(3)` over 450ms. Always `aria-hidden`. The
 * animation pauses off-screen and in hidden tabs, and rests on frame 0 under
 * `prefers-reduced-motion: reduce`.
 */
export default function Campfire({ scale = 4, className }: CampfireProps) {
  const ref = useRef<HTMLDivElement>(null);
  const running = useRunning(ref);
  const s = Math.min(4, Math.max(1, Math.round(Number.isFinite(scale) ? scale : 4)));
  const paths = (pathCache ??= toPaths());
  const size = CAMPFIRE_SIZE * s;

  const style = {
    '--px-campfire-size': `${size}px`,
    '--px-campfire-cycle': `${CAMPFIRE_CYCLE_MS}ms`,
    '--px-campfire-frames': String(CAMPFIRE_FRAMES),
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={['px-campfire', !running && 'px-campfire--paused', className].filter(Boolean).join(' ')}
      style={style}
      data-scale={s}
      aria-hidden="true"
    >
      <svg
        className="px-campfire__sheet"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${CAMPFIRE_SIZE * CAMPFIRE_FRAMES} ${CAMPFIRE_SIZE}`}
        width={size * CAMPFIRE_FRAMES}
        height={size}
        shapeRendering="crispEdges"
        focusable="false"
      >
        {(Object.keys(INKS) as Ink[]).map(ink => (
          <path key={ink} d={paths[ink]} fill={INKS[ink]} data-ink={ink} />
        ))}
      </svg>
    </div>
  );
}
