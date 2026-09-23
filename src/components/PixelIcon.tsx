/**
 * Pixel icon set: 12x12 bitmaps rendered as crisp SVG.
 *
 * Bitmap legend (rows top to bottom, 12 characters each):
 *   `.` transparent · `#` ink (`currentColor`) · `+` accent (`--pi-accent`, default HP red)
 *
 * Each icon is converted once into as few rectangles as possible (horizontal runs of the same
 * ink per row, then identical runs on consecutive rows merged into one taller rect), and the
 * rectangles of one ink are drawn as the subpaths of a single `<path>`.
 * Review sheet: `python3 scripts/pixelate/review.py --out <dir>` renders every icon at x1/x2/x4.
 */

const ICONS = {
  play: [
    '...#........',
    '...##.......',
    '...###......',
    '...####.....',
    '...#####....',
    '...######...',
    '...######...',
    '...#####....',
    '...####.....',
    '...###......',
    '...##.......',
    '...#........',
  ],
  book: [
    '.##########.',
    '#+#.......#.',
    '#+#.#####.#.',
    '#+#.......#.',
    '#+#.####..#.',
    '#+#.......#.',
    '#+#.......#.',
    '#+#.......#.',
    '#+#.......#.',
    '#+#########.',
    '#+#.......#.',
    '.##########.',
  ],
  scroll: [
    '.##########.',
    '#..........#',
    '.##########.',
    '..#......#..',
    '..#.####.#..',
    '..#......#..',
    '..#.###..#..',
    '..#......#..',
    '..#.####.#..',
    '.##########.',
    '#..........#',
    '.##########.',
  ],
  person: [
    '....####....',
    '...#....#...',
    '...#....#...',
    '...#....#...',
    '....####....',
    '............',
    '...######...',
    '..#......#..',
    '.#........#.',
    '.#........#.',
    '.#........#.',
    '.##########.',
  ],
  star: [
    '.....##.....',
    '.....##.....',
    '....####....',
    '....####....',
    '############',
    '.##########.',
    '..########..',
    '...######...',
    '...######...',
    '..###..###..',
    '..##....##..',
    '.##......##.',
  ],
  sword: [
    '..........##',
    '.........###',
    '........###.',
    '.......###..',
    '......###...',
    '..#..###....',
    '...####.....',
    '....##......',
    '...#..#.....',
    '..#.........',
    '##..........',
    '##..........',
  ],
  potion: [
    '....####....',
    '....####....',
    '....#..#....',
    '....#..#....',
    '...#....#...',
    '..#......#..',
    '.#........#.',
    '.#++++++++#.',
    '.#++++++++#.',
    '.#++++++++#.',
    '..#++++++#..',
    '...######...',
  ],
  gear: [
    '.....##.....',
    '..#..##..#..',
    '.##########.',
    '..###..###..',
    '..##....##..',
    '####....####',
    '####....####',
    '..##....##..',
    '..###..###..',
    '.##########.',
    '..#..##..#..',
    '.....##.....',
  ],
  mail: [
    '............',
    '############',
    '##........##',
    '#.#......#.#',
    '#..#....#..#',
    '#...#..#...#',
    '#....##....#',
    '#..........#',
    '#..........#',
    '#..........#',
    '############',
    '............',
  ],
  github: [
    '...######...',
    '.##########.',
    '###.####.###',
    '###..##..###',
    '###......###',
    '##........##',
    '##........##',
    '###......###',
    '#.###..#####',
    '##.##..#####',
    '.##....####.',
    '...##..##...',
  ],
  linkedin: [
    '.##########.',
    '############',
    '##.#########',
    '############',
    '##.##...####',
    '##.##.##.###',
    '##.##.##.###',
    '##.##.##.###',
    '##.##.##.###',
    '##.##.##.###',
    '############',
    '.##########.',
  ],
  phone: [
    '..########..',
    '..#......#..',
    '..#.####.#..',
    '..#.#..#.#..',
    '..#.#..#.#..',
    '..#.#..#.#..',
    '..#.#..#.#..',
    '..#.####.#..',
    '..#......#..',
    '..#..##..#..',
    '..#......#..',
    '..########..',
  ],
  joystick: [
    '....####....',
    '...#++++#...',
    '...#++++#...',
    '....####....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.##########.',
    '#..........#',
    '#.++....##.#',
    '#..........#',
    '.##########.',
  ],
  sun: [
    '.....##.....',
    '.#...##...#.',
    '..#......#..',
    '....####....',
    '...######...',
    '##.######.##',
    '##.######.##',
    '...######...',
    '....####....',
    '..#......#..',
    '.#...##...#.',
    '.....##.....',
  ],
  moon: [
    '....####....',
    '..####......',
    '.####.......',
    '.###........',
    '####........',
    '####........',
    '####........',
    '####........',
    '.###........',
    '.####.......',
    '..####......',
    '....####....',
  ],
  download: [
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '..##.##.##..',
    '...######...',
    '....####....',
    '.....##.....',
    '............',
    '#..........#',
    '#..........#',
    '############',
  ],
  external: [
    '.......#####',
    '..........##',
    '.........#.#',
    '........#..#',
    '#####..#...#',
    '#.....#.....',
    '#....#......',
    '#...........',
    '#..........#',
    '#..........#',
    '#..........#',
    '############',
  ],
  code: [
    '............',
    '............',
    '...#..#.#...',
    '..#...#..#..',
    '.#....#...#.',
    '#.....#....#',
    '#....#.....#',
    '.#...#....#.',
    '..#..#...#..',
    '...#.#..#...',
    '............',
    '............',
  ],
  copy: [
    '....########',
    '....#......#',
    '....#......#',
    '....#......#',
    '########...#',
    '#......#...#',
    '#......#...#',
    '#......#####',
    '#......#....',
    '#......#....',
    '#......#....',
    '########....',
  ],
  menu: [
    '............',
    '.##########.',
    '.##########.',
    '............',
    '............',
    '.##########.',
    '.##########.',
    '............',
    '............',
    '.##########.',
    '.##########.',
    '............',
  ],
  close: [
    '............',
    '.##......##.',
    '..##....##..',
    '...##..##...',
    '....####....',
    '.....##.....',
    '.....##.....',
    '....####....',
    '...##..##...',
    '..##....##..',
    '.##......##.',
    '............',
  ],
  'arrow-up': [
    '.....##.....',
    '....####....',
    '...######...',
    '..##.##.##..',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
  ],
  'arrow-down': [
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '.....##.....',
    '..##.##.##..',
    '...######...',
    '....####....',
    '.....##.....',
  ],
  chevron: [
    '............',
    '...##.......',
    '....##......',
    '.....##.....',
    '......##....',
    '.......##...',
    '.......##...',
    '......##....',
    '.....##.....',
    '....##......',
    '...##.......',
    '............',
  ],
  check: [
    '............',
    '............',
    '..........##',
    '.........##.',
    '........##..',
    '.......##...',
    '##....##....',
    '.##..##.....',
    '..####......',
    '...##.......',
    '............',
    '............',
  ],
  campfire: [
    '.....+......',
    '.....++.....',
    '....+++.....',
    '....++++.+..',
    '...++++++...',
    '..+++#++++..',
    '..++###+++..',
    '..++####++..',
    '...+####+...',
    '##..++++..##',
    '.####..####.',
    '##..####..##',
  ],
  'rotate-phone': [
    '............',
    '######.##...',
    '#....#...#..',
    '#....#....#.',
    '#....#....#.',
    '#....#...###',
    '#....#....#.',
    '#....#......',
    '#....#......',
    '#....#......',
    '#.##.#......',
    '######......',
  ],
  trophy: [
    '.##########.',
    '#.########.#',
    '#.########.#',
    '#.########.#',
    '.#.######.#.',
    '...######...',
    '....####....',
    '.....##.....',
    '.....##.....',
    '....####....',
    '...######...',
    '...######...',
  ],
  home: [
    '.....##.....',
    '....####....',
    '...##..##...',
    '..##....##..',
    '.##......##.',
    '##........##',
    '.#........#.',
    '.#..###...#.',
    '.#..#.#...#.',
    '.#..#.#...#.',
    '.#..#.#...#.',
    '.##########.',
  ],
  // Four corner brackets pointing out: "make the screen bigger".
  fullscreen: [
    '####....####',
    '####....####',
    '##........##',
    '##........##',
    '............',
    '............',
    '............',
    '............',
    '##........##',
    '##........##',
    '####....####',
    '####....####',
  ],
  // The same brackets turned inward: "back to the window".
  'fullscreen-exit': [
    '..##....##..',
    '..##....##..',
    '####....####',
    '####....####',
    '............',
    '............',
    '............',
    '............',
    '####....####',
    '####....####',
    '..##....##..',
    '..##....##..',
  ],
} as const satisfies Record<string, readonly string[]>;

export type PixelIconName = keyof typeof ICONS;
export type PixelIconSize = 12 | 24 | 36 | 48;

/** Every icon name, in declaration order. */
export const PIXEL_ICON_NAMES = Object.keys(ICONS) as PixelIconName[];

/** Raw bitmap of an icon (12 strings of 12 characters). */
export function pixelIconBitmap(name: PixelIconName): readonly string[] {
  return ICONS[name];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Ink = '#' | '+';

/** Merge a bitmap into rects: row runs first, then identical runs on consecutive rows. */
function toRects(rows: readonly string[]): Record<Ink, Rect[]> {
  const out: Record<Ink, Rect[]> = { '#': [], '+': [] };
  const open: Record<Ink, Rect[]> = { '#': [], '+': [] };
  rows.forEach((row, y) => {
    const next: Record<Ink, Rect[]> = { '#': [], '+': [] };
    let x = 0;
    while (x < row.length) {
      const ink = row[x];
      if (ink !== '#' && ink !== '+') {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ink) end += 1;
      const w = end - x;
      const above = open[ink].find(r => r.x === x && r.w === w && r.y + r.h === y);
      if (above) {
        above.h += 1;
        next[ink].push(above);
      } else {
        const rect = { x, y, w, h: 1 };
        out[ink].push(rect);
        next[ink].push(rect);
      }
      x = end;
    }
    open['#'] = next['#'];
    open['+'] = next['+'];
  });
  return out;
}


/** One `d` string per ink: every merged rect becomes a closed `M x y h w v h h -w z` subpath. */
export type PixelIconPaths = Record<Ink, string>;

function toPath(rects: readonly Rect[]): string {
  return rects.map(r => `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`).join('');
}

const pathCache = new Map<PixelIconName, PixelIconPaths>();

/** The path data PixelIcon draws for an icon: `#` → `currentColor`, `+` → the accent ink. */
export function pixelIconPaths(name: PixelIconName): PixelIconPaths {
  let paths = pathCache.get(name);
  if (!paths) {
    const rects = toRects(ICONS[name]);
    paths = { '#': toPath(rects['#']), '+': toPath(rects['+']) };
    pathCache.set(name, paths);
  }
  return paths;
}

const ACCENT_FILL = 'var(--pi-accent, var(--color-hp, #ef7d70))';

export interface PixelIconProps {
  /** Icon name from the set. Unknown names render nothing (and warn in development). */
  name: PixelIconName;
  /** Rendered size in CSS px: 12 x an integer, so every bitmap pixel lands on whole pixels. */
  size?: PixelIconSize;
  /** Accessible name. When set the icon is `role="img"`; otherwise it is `aria-hidden`. */
  title?: string;
  className?: string;
}

/**
 * A 12x12 pixel icon drawn with `currentColor` (and an optional accent ink set through the
 * `--pi-accent` custom property). Decorative by default; pass `title` when it carries meaning.
 * Each ink is a single `<path>`, so an icon costs at most two DOM nodes however detailed it is.
 */
export default function PixelIcon({ name, size = 24, title, className }: PixelIconProps) {
  if (!Object.prototype.hasOwnProperty.call(ICONS, name)) {
    if (import.meta.env.DEV) {
      console.warn(`[PixelIcon] unknown icon "${String(name)}"`);
    }
    return null;
  }
  const paths = pixelIconPaths(name);
  const a11y = title
    ? { role: 'img' as const, 'aria-label': title }
    : { 'aria-hidden': true as const };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12 12"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      focusable="false"
      className={className}
      data-icon={name}
      {...a11y}
    >
      {title && <title>{title}</title>}
      {paths['#'] && <path fill="currentColor" d={paths['#']} />}
      {paths['+'] && <path fill={ACCENT_FILL} d={paths['+']} />}
    </svg>
  );
}
