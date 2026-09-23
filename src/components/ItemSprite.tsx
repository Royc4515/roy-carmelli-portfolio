/**
 * Inventory item emblems for the quest cards: 24x24 pixel bitmaps rendered as crisp SVG.
 *
 * Bitmap legend (rows top to bottom, 24 characters each): `.` is transparent, every other
 * character is an ink from `INKS`: a semantic colour token (or a mix of two tokens), so the
 * items follow the day/night theme. Each item uses at most five inks. They are drawn for the
 * dark inset plate (`surface-sunken`): silhouettes read from their fills, the `ink` outline
 * only separates parts, and anything that must stay visible (glass, a shaft) uses a light ink.
 *
 * Shown only at integer scales: x1 (24px), x2 (48px), x4 (96px), x6 (144px).
 * Review sheet: render every item at each scale on both themes before changing a bitmap.
 */
import { cx } from './ui/cx';

export const INKS = {
  /** outline and deepest shade (same in both themes) */
  '#': 'var(--color-ink)',
  /** wood, text lines */
  n: 'var(--color-ink-muted)',
  /** highlight, paper, glass */
  w: 'var(--color-fg)',
  /** paper shade */
  m: 'var(--color-fg-muted)',
  /** brass */
  a: 'var(--color-accent)',
  /** dark brass */
  l: 'var(--color-bevel-lo)',
  /** red: wine, bricks, the joystick ball */
  r: 'var(--color-hp)',
  /** deep red: wine shade, brain folds */
  R: 'color-mix(in srgb, var(--color-hp) 60%, var(--color-ink))',
  /** green: bricks, the scope trace */
  g: 'var(--color-xp)',
  /** crystal (sage by day, lavender at night) */
  s: 'var(--color-fg-subtle)',
  /** crystal shade, data points (moss by day, blue at night) */
  b: 'var(--color-border-subtle)',
} as const;

export type ItemInk = keyof typeof INKS;

export const ITEMS = {
  'crystal-ball': [
    '........................',
    '.........######.........',
    '.......##ssssss##.......',
    '......#sssswwssss#......',
    '.....#ssswwsssssss#.....',
    '.....#sswsssssssbb#.....',
    '....#sswsssssssssbb#....',
    '....#swssssssssssbb#....',
    '....#sssssssssssssb#....',
    '....#ssssssssssssbb#....',
    '....#sssssssssssbbb#....',
    '....#ssssssssssbbbb#....',
    '.....#sssssssbbbbb#.....',
    '.....#sssssbbbbbbb#.....',
    '....#wwwwwwwwwwwwww#....',
    '....#aaaaaaaaaaaaaa#....',
    '.....#aaaaaaaaaaaa#.....',
    '......##aaaaaaaa##......',
    '........#aaaaaa#........',
    '........#aaaaaa#........',
    '......##aaaaaaaa##......',
    '......############......',
    '........................',
    '........................',
  ],
  'wine-glass': [
    '........................',
    '......mmmmmmmmmmmm......',
    '......mw.........m......',
    '.....mw...........m.....',
    '.....mw...........m.....',
    '.....mRRRRRRRRRRRRm.....',
    '.....mwrrrrrrrrrRRm.....',
    '.....mwrrrrrrrrrRRm.....',
    '......mwrrrrrrrRRm......',
    '......mrrrrrrrrRRm......',
    '.......mrrrrrrRRm.......',
    '........mmrrRRmm........',
    '..........mmmm..........',
    '...........wm...........',
    '...........wm...........',
    '...........wm...........',
    '...........wm...........',
    '...........wm...........',
    '..........mmmm..........',
    '........mmwwwwmm........',
    '.......mwwwwwwwwm.......',
    '.......mmmmmmmmmm.......',
    '........................',
    '........................',
  ],
  'recipe-book': [
    '........................',
    '..................###...',
    '.................#aaa#..',
    '................#awwa#..',
    '................#awaa#..',
    '................#aaa#...',
    '..######.......#a#####..',
    '.#wwwwww##....#a#wwwww#.',
    '.#wwwwwwww####a#wwwwww#.',
    '.#wwwwwwwww##a#wwwwwww#.',
    '.#wwnnnnnww#a#wnnnnnww#.',
    '.#wwwwwwww#a#wwwwwwwww#.',
    '.#wwnnnnn#a##wwnnnnnnw#.',
    '.#wwwwww#a###wwwwwwwww#.',
    '.#wwnnn#a#w##wwnnnnnww#.',
    '.#wwwww##ww##wwwwwwwww#.',
    '.#wwnnnnnww##wwnnnwwww#.',
    '.#wwwwwwwww##wwwwwwwww#.',
    '.######################.',
    '#rrrrrrrrrrrrrrrrrrrrrr#',
    '.######################.',
    '........................',
    '........................',
    '........................',
  ],
  arkanoid: [
    '........................',
    '........................',
    '.######################.',
    '.#wwwwww#wwwwww#wwwwww#.',
    '.#rrrrrr#rrrrrr#rrrrrr#.',
    '.#rrrrrr#rrrrrr#rrrrrr#.',
    '.######################.',
    '.#www#wwwwww#......#ww#.',
    '.#ggg#gggggg#......#gg#.',
    '.#ggg#gggggg#......#gg#.',
    '.############......####.',
    '........................',
    '..............####......',
    '.............#wwww#.....',
    '.............#wwww#.....',
    '.............#wwww#.....',
    '.............#wwww#.....',
    '..............####......',
    '........................',
    '......############......',
    '.....#rrwwwwwwwwrr#.....',
    '.....#rraaaaaaaarr#.....',
    '......############......',
    '........................',
  ],
  joystick: [
    '........................',
    '.........######.........',
    '........#rrrrrr#........',
    '.......#rwwrrrrr#.......',
    '.......#rwrrrrrr#.......',
    '.......#rrrrrrrr#.......',
    '.......#rrrrrrrr#.......',
    '........#rrrrrr#........',
    '.........######.........',
    '...........al...........',
    '...........al...........',
    '...####....al...........',
    '..#rwrr#...al...........',
    '..#rrrr#..alll..........',
    '.######################.',
    '.#wwwwwwwwwwwwwwwwwwww#.',
    '.#aaaaaaaaaaaaaaaaaaaa#.',
    '.######################.',
    '.#llllllllllllllllllll#.',
    '.#llllllllllllllllllll#.',
    '.#llllllllllllllllllll#.',
    '.######################.',
    '........................',
    '........................',
  ],
  oscilloscope: [
    '........................',
    '........................',
    '........................',
    '.######################.',
    '.#llllllllllllllllllll#.',
    '.#ll###########lllllll#.',
    '.#l#############ll##ll#.',
    '.#l###gg########l#wa#l#.',
    '.#l##g##g#######l#aa#l#.',
    '.#l##g##g#######ll##ll#.',
    '.#l#g####g####g#llllll#.',
    '.#l#g####g####g#ll##ll#.',
    '.#l#######g##g##l#wa#l#.',
    '.#l#######g##g##l#aa#l#.',
    '.#l########gg###ll##ll#.',
    '.#l#############llllll#.',
    '.#ll###########lllllll#.',
    '.#llllllllllllllllllll#.',
    '.######################.',
    '...ll..............ll...',
    '........................',
    '........................',
    '........................',
    '........................',
  ],
  'scatter-plot': [
    '........................',
    '..###############.......',
    '..#wwwwwwwwwwwww#m#.....',
    '..#wwwwwwwwwwwww#mm#....',
    '..#wwwwwwwwwwwww#####...',
    '..#w#wwwwwwwwwwwwwwr#...',
    '..#w#wwwwwwwwwwwbbrw#...',
    '..#w#wwwwwwwwwwwbrbw#...',
    '..#w#wwwwwwwwbbwrwww#...',
    '..#w#wwwwwwwwbbrwwww#...',
    '..#w#wwwwwbbwwrwwwww#...',
    '..#w#wwwwwbbwrwbbwww#...',
    '..#w#wwwwwwwrwwbbwww#...',
    '..#w#wwwbbwrwwwwwwww#...',
    '..#w#wwwbbrwwwwwwwww#...',
    '..#w#wwwwrwwbbwwwwww#...',
    '..#w#wbbrwwwbbwwwwww#...',
    '..#w#wbrwwwwwwwwwwww#...',
    '..#w#wwwwwwwwwwwwwww#...',
    '..#w###############w#...',
    '..#wwwwwwwwwwwwwwwww#...',
    '..###################...',
    '........................',
    '........................',
  ],
  brain: [
    '........................',
    '........................',
    '........................',
    '........########........',
    '.....###rrrrrrrr###.....',
    '....#rrwwwrrRrrrrrr#....',
    '...#rrwrrrrrRrrrRRrr#...',
    '..#rrwrrrrrRrrrrrrRrr#..',
    '..#rRRrrrrrRrrrrrrRrr#..',
    '.#rrrrRrrrRrrrrrrrRrrr#.',
    '.#rrrrrRrrrrRRRrrrrrrr#.',
    '.#rrrrrrRRRRrrrrRRRrrr#.',
    '.#rrRRRRrrrrrrrrrrrRrr#.',
    '..#rrrrrrrrrrrrrrrrrr#..',
    '...#rrrrrrrrrrr#######..',
    '....#rrrrrrrrr#RRRRRR#..',
    '.....##rrrrrr##RRRRR#...',
    '.......####rr#.#####....',
    '..........#rr#..........',
    '..........#rr#..........',
    '...........##...........',
    '........................',
    '........................',
    '........................',
  ],
} as const satisfies Record<string, readonly string[]>;

export type ItemName = keyof typeof ITEMS;

/** Native size of every item, in bitmap pixels. */
export const ITEM_SIZE = 24;

/** Integer display scales: x1 research rows, x2 side quests, x6 main-quest showcases. */
export type ItemScale = 1 | 2 | 4 | 6;

/**
 * The item each project carries, by project id. The featured main quest shows a real
 * screenshot instead, so it has no entry.
 */
export const PROJECT_ITEMS: Readonly<Record<string, ItemName>> = {
  'career-predictor': 'crystal-ball',
  'sommelier-bot': 'wine-glass',
  clr: 'recipe-book',
  'arkanoid-game': 'arkanoid',
  portfolio: 'joystick',
  'signal-processing': 'oscilloscope',
  'cognitive-correlation': 'scatter-plot',
  'white-matter-game': 'brain',
};

/** The item for a project, or `undefined` when it has none. */
export function itemForProject(projectId: string): ItemName | undefined {
  return Object.prototype.hasOwnProperty.call(PROJECT_ITEMS, projectId)
    ? PROJECT_ITEMS[projectId]
    : undefined;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Layer {
  ink: ItemInk;
  rects: Rect[];
}

/**
 * Merge a bitmap into as few rects as possible, grouped by ink: horizontal runs per row,
 * then identical runs on consecutive rows joined into one taller rect.
 */
export function toLayers(rows: readonly string[]): Layer[] {
  const layers = new Map<ItemInk, Rect[]>();
  let open = new Map<ItemInk, Rect[]>();
  rows.forEach((row, y) => {
    const next = new Map<ItemInk, Rect[]>();
    let x = 0;
    while (x < row.length) {
      const ink = row[x] as ItemInk;
      if (!Object.prototype.hasOwnProperty.call(INKS, ink)) {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === ink) end += 1;
      const w = end - x;
      let rect = open.get(ink)?.find(r => r.x === x && r.w === w && r.y + r.h === y);
      if (rect) {
        rect.h += 1;
      } else {
        rect = { x, y, w, h: 1 };
        const list = layers.get(ink) ?? [];
        list.push(rect);
        layers.set(ink, list);
      }
      const carried = next.get(ink) ?? [];
      carried.push(rect);
      next.set(ink, carried);
      x = end;
    }
    open = next;
  });
  return [...layers].map(([ink, rects]) => ({ ink, rects }));
}

const layerCache = new Map<ItemName, Layer[]>();

function layersFor(name: ItemName): Layer[] {
  let layers = layerCache.get(name);
  if (!layers) {
    layers = toLayers(ITEMS[name]);
    layerCache.set(name, layers);
  }
  return layers;
}

export interface ItemSpriteProps {
  /** Which item to draw. */
  name: ItemName;
  /** Integer scale: 1 (24px), 2 (48px), 4 (96px) or 6 (144px). Default 1. */
  scale?: ItemScale;
  /** Accessible name. When set the item is `role="img"`; otherwise it is `aria-hidden`. */
  title?: string;
  className?: string;
}

/**
 * A 24x24 pixel-art inventory item (SPEC §2.4 sprites), drawn as crisp SVG rects in theme
 * colours at an integer scale. Decorative by default.
 *
 * @example
 *   <ItemSprite name="crystal-ball" scale={4} />
 */
export default function ItemSprite({ name, scale = 1, title, className }: ItemSpriteProps) {
  if (!Object.prototype.hasOwnProperty.call(ITEMS, name)) {
    if (import.meta.env.DEV) {
      console.warn(`[ItemSprite] unknown item "${String(name)}"`);
    }
    return null;
  }
  const size = ITEM_SIZE * scale;
  const a11y = title
    ? { role: 'img' as const, 'aria-label': title }
    : { 'aria-hidden': true as const };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${ITEM_SIZE} ${ITEM_SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      focusable="false"
      className={cx('pixelated block flex-none', className)}
      data-item={name}
      {...a11y}
    >
      {title && <title>{title}</title>}
      {layersFor(name).map(({ ink, rects }) => (
        <g key={ink} fill={INKS[ink]}>
          {rects.map(r => (
            <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={r.h} />
          ))}
        </g>
      ))}
    </svg>
  );
}
