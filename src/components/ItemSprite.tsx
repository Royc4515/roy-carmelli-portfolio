/**
 * Inventory item emblems for the quest cards: 24x24 pixel bitmaps rendered as crisp SVG.
 *
 * Bitmap legend (rows top to bottom, 24 characters each): `.` is transparent, every other
 * character is an ink from `INKS`. The inks are fixed art colours (the SPEC's bitmap
 * exception to "semantic tokens only"), sampled from the day palette, so an item is the same
 * object in both themes: at night it gets the hero's moonlight wash instead of new colours
 * (see `.item-sprite__wash` in src/sections/Projects.css). Each item uses at most five inks.
 * They are drawn for the dark inset plate (`surface-sunken`): silhouettes read from their
 * fills, the dark outline only separates parts, and anything that must stay visible (glass,
 * a shaft) uses a light ink.
 *
 * Shown only at integer scales: x1 (24px), x2 (48px), x4 (96px), x6 (144px).
 * Review sheet: render every item at each scale on both themes before changing a bitmap.
 */
import { cx } from './ui/cx';
import '../sections/Projects.css';

export const INKS = {
  /** outline and deepest shade */
  '#': '#2e1f12',
  /** wood, text lines */
  n: '#5e4128',
  /** highlight, paper, glass */
  w: '#ede0b8',
  /** paper shade */
  m: '#c9b87a',
  /** brass */
  a: '#c9a24a',
  /** dark brass */
  l: '#9c7a2c',
  /** red: wine, bricks, the joystick ball */
  r: '#ef7d70',
  /** deep red: wine shade, brain folds */
  R: '#a2574a',
  /** green: bricks, the scope trace */
  g: '#8fd07a',
  /** crystal (sage) */
  s: '#9dbb7c',
  /** crystal shade, data points (moss) */
  b: '#6a8f48',
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
  'delivery-bag': [
    '........................',
    '........................',
    '........########........',
    '.......#nnnnnnnn#.......',
    '.......#n######n#.......',
    '.......#n#....#n#.......',
    '.######################.',
    '#wwwwwwwwwwwwwwwwwwwwww#',
    '#aaaaaaaaaaaaaaaaaaaaaa#',
    '#llllllllllllllllllllll#',
    '.######################.',
    '..#aaaaaaaaaaaaaaaaaa#..',
    '..#aaaaaaaa##aaaaaaaa#..',
    '..#aaaaaa######aaaaaa#..',
    '..#aaaaa#wwwwww#aaaaa#..',
    '..#aaaa#wwwwwwww#aaaa#..',
    '..#aa##############aa#..',
    '..#aaaaaaaaaaaaaaaaaa#..',
    '..#aaaaaaaaaaaaaaaaaa#..',
    '..#llllllllllllllllll#..',
    '..#llllllllllllllllll#..',
    '..####################..',
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
  'wolt-clone': 'delivery-bag',
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

/** One SVG path for a set of rects, one closed subpath per rect (`M x y h w v h h -w z`). */
export function toPath(rects: readonly Rect[]): string {
  return rects.map(r => `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}z`).join('');
}

interface ItemPaths {
  /** One path per ink, in first-use order. */
  inks: { ink: ItemInk; d: string }[];
  /** Every filled pixel, for the night wash. */
  silhouette: string;
}

const pathCache = new Map<ItemName, ItemPaths>();

/** The item as one `d` per ink plus its silhouette, computed once per item. */
export function itemPaths(name: ItemName): ItemPaths {
  let paths = pathCache.get(name);
  if (!paths) {
    const rows = ITEMS[name];
    const solid = toLayers(rows.map(row => row.replace(/[^.]/g, '#')));
    paths = {
      inks: toLayers(rows).map(({ ink, rects }) => ({ ink, d: toPath(rects) })),
      silhouette: toPath(solid[0]?.rects ?? []),
    };
    pathCache.set(name, paths);
  }
  return paths;
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
 * A 24x24 pixel-art inventory item (SPEC §2.4 sprites), drawn as crisp SVG at an integer
 * scale: one `<path>` per art colour, then the silhouette again as the night moonlight wash
 * (a multiply layer in `--color-fg-subtle`, like the hero's; invisible by day). Decorative by
 * default.
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
  const paths = itemPaths(name);
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
      {paths.inks.map(({ ink, d }) => (
        <path key={ink} fill={INKS[ink]} d={d} />
      ))}
      <path className="item-sprite__wash" d={paths.silhouette} />
    </svg>
  );
}
