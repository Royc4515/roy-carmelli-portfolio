/**
 * Voxel builders for the diorama. Everything returns plain instance data
 * (x, y, z, size, r, g, b, seed: 8 floats per cube) so the engine can upload it as is.
 * Units: one unit is one pixel of Roy's sprite; Y is up; the ground surface is y = 0.
 */

export const FLOATS = 8;
export type Rgb = [number, number, number];

/** Deterministic random numbers: the island must look the same on every visit. */
export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Voxels {
  readonly data: number[] = [];
  constructor(private readonly rand: () => number = Math.random) {}
  get count(): number {
    return this.data.length / FLOATS;
  }
  add(x: number, y: number, z: number, size: number, c: Rgb, shade = 1): void {
    this.data.push(x, y, z, size, c[0] * shade, c[1] * shade, c[2] * shade, this.rand());
  }
  toArray(): Float32Array {
    return new Float32Array(this.data);
  }
}

export interface Bitmap {
  w: number;
  h: number;
  /** RGBA bytes, row by row from the top. */
  px: Uint8ClampedArray;
}

const opaque = (b: Bitmap, x: number, y: number) =>
  x >= 0 && y >= 0 && x < b.w && y < b.h && b.px[(y * b.w + x) * 4 + 3] > 127;

/**
 * A sprite as a figurine: one column of cubes per opaque pixel, thicker toward the middle of
 * the silhouette (a distance transform), so the edges round off instead of reading as a
 * cardboard cut-out. Only cubes that can be seen are emitted.
 */
export function spriteVoxels(
  out: Voxels,
  b: Bitmap,
  o: { x?: number; y?: number; z?: number; size?: number; maxDepth?: number; anchorX?: number } = {},
): void {
  const { x: ox = 0, y: oy = 0, z: oz = 0, size = 1, maxDepth = 4, anchorX = b.w / 2 } = o;
  const half = new Int8Array(b.w * b.h).fill(-1);
  // Pass 0 marks the outline; each later pass grows one pixel further in.
  for (let pass = 0; pass < maxDepth; pass++) {
    const next: number[] = [];
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        const i = y * b.w + x;
        if (half[i] !== -1 || !opaque(b, x, y)) continue;
        const edge = (xx: number, yy: number) =>
          !opaque(b, xx, yy) || (pass > 0 && half[yy * b.w + xx] === pass - 1);
        const touches =
          pass === 0
            ? !opaque(b, x - 1, y) || !opaque(b, x + 1, y) || !opaque(b, x, y - 1) || !opaque(b, x, y + 1)
            : edge(x - 1, y) || edge(x + 1, y) || edge(x, y - 1) || edge(x, y + 1);
        if (touches) next.push(i);
      }
    }
    for (const i of next) half[i] = pass;
  }
  const h = (x: number, y: number) => {
    if (!opaque(b, x, y)) return -1;
    const v = half[y * b.w + x];
    return v === -1 ? maxDepth - 1 : v;
  };
  for (let y = 0; y < b.h; y++) {
    for (let x = 0; x < b.w; x++) {
      const mine = h(x, y);
      if (mine < 0) continue;
      const i = (y * b.w + x) * 4;
      const c: Rgb = [b.px[i] / 255, b.px[i + 1] / 255, b.px[i + 2] / 255];
      const lowest = Math.min(h(x - 1, y), h(x + 1, y), h(x, y - 1), h(x, y + 1));
      for (let l = -mine; l <= mine; l++) {
        // Seen from the front or back (the caps), or from the side past a thinner neighbour.
        if (Math.abs(l) !== mine && Math.abs(l) <= lowest) continue;
        out.add(ox + (x - anchorX + 0.5) * size, oy + (b.h - 1 - y + 0.5) * size, oz + l * size, size, c);
      }
    }
  }
}

/** Colours lifted from the game's own background tile, so the island belongs to the game. */
export interface Palette {
  grass: Rgb[];
  dirt: Rgb[];
  leaf: Rgb[];
  trunk: Rgb[];
}

const FALLBACK: Palette = {
  grass: [[0.33, 0.52, 0.2], [0.4, 0.6, 0.24], [0.28, 0.45, 0.18]],
  dirt: [[0.36, 0.24, 0.14], [0.3, 0.2, 0.12], [0.42, 0.29, 0.17]],
  leaf: [[0.2, 0.4, 0.16], [0.26, 0.48, 0.2], [0.16, 0.32, 0.14], [0.34, 0.55, 0.22]],
  trunk: [[0.3, 0.19, 0.1], [0.24, 0.15, 0.08]],
};

export function samplePalette(bg: Bitmap | null, groundRow: number): Palette {
  if (!bg) return FALLBACK;
  const pick = (y0: number, y1: number, test: (r: number, g: number, b: number) => boolean): Rgb[] => {
    const found: Rgb[] = [];
    const rand = mulberry(7 + y0);
    for (let n = 0; n < 4000 && found.length < 24; n++) {
      const x = Math.floor(rand() * bg.w);
      const y = y0 + Math.floor(rand() * Math.max(1, y1 - y0));
      const i = (y * bg.w + x) * 4;
      const r = bg.px[i], g = bg.px[i + 1], b = bg.px[i + 2];
      if (bg.px[i + 3] > 200 && test(r, g, b)) found.push([r / 255, g / 255, b / 255]);
    }
    return found;
  };
  const p: Palette = {
    grass: pick(groundRow - 4, groundRow + 4, (r, g, b) => g > r && g > b),
    dirt: pick(groundRow + 8, bg.h - 1, (r, g, b) => r > g && g >= b),
    leaf: pick(0, Math.floor(groundRow * 0.6), (r, g, b) => g > r * 1.08 && g > b * 1.15 && g > 50),
    trunk: pick(Math.floor(groundRow * 0.3), groundRow - 10, (r, g, b) => r > g * 1.15 && g > b && r < 130 && r > 40),
  };
  (Object.keys(p) as (keyof Palette)[]).forEach(k => {
    if (p[k].length < 3) p[k] = FALLBACK[k];
  });
  return p;
}

const pickFrom = (list: Rgb[], rand: () => number): Rgb => list[Math.floor(rand() * list.length)];

/** Cheap value noise on a ring: gives each island its own wobbly outline. */
function ringNoise(rand: () => number): (angle: number) => number {
  const k = Array.from({ length: 5 }, () => [rand() * 6.283, 0.5 + rand()]);
  return a => k.reduce((sum, [phase, amp], i) => sum + Math.sin(a * (i + 2) + phase) * amp, 0) / 6;
}

export const CELL = 4;

/**
 * A floating island: a grass disc with a ragged edge on a cone of dirt and rock that narrows
 * to a point. Terrain cubes are CELL units wide (chunkier than Roy's 1-unit cubes: he reads as
 * a detailed figurine standing on blocky ground).
 */
export function buildIsland(out: Voxels, cx: number, radius: number, pal: Palette, rand: () => number): void {
  const noise = ringNoise(rand);
  const cells = Math.ceil(radius / CELL) + 2;
  const layers = 15;
  const inside = (i: number, k: number, layer: number): boolean => {
    const d = Math.hypot(i, k * 1.25) * CELL; // a little wider than deep
    const edge = radius * (1 + noise(Math.atan2(k, i)) * 0.16);
    // Layer 0 and 1 share the outline (a grass lip); below, the cone closes in.
    const shrink = layer < 2 ? 0 : (layer - 1) ** 1.45 * 3.1 + noise(i * 0.9 + layer) * 6;
    return d < edge - shrink;
  };
  const rock: Rgb = [0.34, 0.33, 0.36];
  for (let layer = 0; layer < layers; layer++) {
    for (let i = -cells; i <= cells; i++) {
      for (let k = -cells; k <= cells; k++) {
        if (!inside(i, k, layer)) continue;
        const exposed =
          layer === 0 ||
          !inside(i - 1, k, layer) || !inside(i + 1, k, layer) ||
          !inside(i, k - 1, layer) || !inside(i, k + 1, layer) ||
          !inside(i, k, layer + 1);
        if (!exposed) continue;
        const depth = layer / layers;
        let c: Rgb;
        if (layer === 0) c = pickFrom(pal.grass, rand);
        else if (depth < 0.45 + rand() * 0.15) c = pickFrom(pal.dirt, rand);
        else c = rock;
        out.add(cx + i * CELL, -CELL / 2 - layer * CELL, k * CELL, CELL, c, 0.9 + rand() * 0.2);
      }
    }
  }
  // Tufts and flowers: small cubes that break up the flat top.
  const flowers: Rgb[] = [[0.95, 0.85, 0.35], [0.93, 0.5, 0.45], [0.9, 0.9, 0.95]];
  for (let n = 0; n < 150; n++) {
    const a = rand() * 6.283;
    const r = Math.sqrt(rand()) * radius * 0.86;
    const x = Math.cos(a) * r, z = (Math.sin(a) * r) / 1.25;
    if (rand() < 0.16) out.add(cx + x, 1.5, z, 2, pickFrom(flowers, rand));
    else out.add(cx + x, 1, z, 2, pickFrom(pal.grass, rand), 1.12);
  }
}

/** A blocky tree in the forest's colours: a trunk and a canopy of overlapping leaf balls. */
export function buildTree(out: Voxels, x: number, z: number, height: number, pal: Palette, rand: () => number): void {
  const s = CELL;
  const trunk = pickFrom(pal.trunk, rand);
  for (let y = 0; y < height; y++) {
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      out.add(x + dx * s, y * s + s / 2, z + dz * s, s, trunk, 0.85 + rand() * 0.25);
    }
  }
  const balls = Array.from({ length: 4 }, (_, n) => ({
    x: (rand() - 0.5) * 5, y: height + (n === 0 ? 1.5 : (rand() - 0.2) * 4), z: (rand() - 0.5) * 5,
    r: n === 0 ? 4.6 : 2.8 + rand() * 1.6,
  }));
  const filled = (i: number, j: number, k: number) =>
    balls.some(b => (i - b.x) ** 2 + ((j - b.y) * 1.2) ** 2 + (k - b.z) ** 2 < b.r * b.r);
  for (let i = -8; i <= 8; i++) {
    for (let j = height - 5; j <= height + 8; j++) {
      for (let k = -8; k <= 8; k++) {
        if (!filled(i, j, k)) continue;
        const exposed =
          !filled(i - 1, j, k) || !filled(i + 1, j, k) || !filled(i, j - 1, k) ||
          !filled(i, j + 1, k) || !filled(i, j, k - 1) || !filled(i, j, k + 1);
        if (!exposed) continue;
        out.add(x + i * s + s / 2, j * s + s / 2, z + k * s + s / 2, s, pickFrom(pal.leaf, rand), 0.88 + rand() * 0.3);
      }
    }
  }
}

/** A blocky cloud: a few overlapping slabs of large cubes, solid so no dark gaps show. */
export function buildCloud(out: Voxels, x: number, y: number, z: number, rand: () => number): void {
  const s = 10;
  const slabs = [
    { x0: -5, x1: 5, y0: 0, y1: 1, z0: -1, z1: 1 },
    { x0: -3, x1: 2, y0: 2, y1: 2, z0: -1, z1: 1 },
    { x0: 0 + Math.floor(rand() * 2), x1: 4, y0: 2, y1: 3, z0: 0, z1: 1 },
  ];
  const has = (i: number, j: number, k: number) =>
    slabs.some(b => i >= b.x0 && i <= b.x1 && j >= b.y0 && j <= b.y1 && k >= b.z0 && k <= b.z1);
  for (let i = -5; i <= 5; i++) for (let j = 0; j <= 3; j++) for (let k = -1; k <= 1; k++) {
    if (!has(i, j, k)) continue;
    if (has(i - 1, j, k) && has(i + 1, j, k) && has(i, j - 1, k) && has(i, j + 1, k) && has(i, j, k - 1) && has(i, j, k + 1)) continue;
    out.add(x + i * s, y + j * s, z + k * s, s, [1, 1, 1]);
  }
}

// ── Totems: one small model per station, painted into a grid of 3-unit cubes ─────────────

const T = 3;

/** A sparse grid that keeps only the cubes you could see. */
class Grid {
  private readonly cells = new Map<string, Rgb>();
  set(x: number, y: number, z: number, c: Rgb): void {
    this.cells.set(`${x},${y},${z}`, c);
  }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: Rgb): void {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, c);
  }
  /** Any solid of revolution or blob: `test` says whether a cell is inside. */
  fill(r: number, y0: number, y1: number, test: (x: number, y: number, z: number) => Rgb | null): void {
    for (let x = -r; x <= r; x++) for (let y = y0; y <= y1; y++) for (let z = -r; z <= r; z++) {
      const c = test(x, y, z);
      if (c) this.set(x, y, z, c);
    }
  }
  emit(ox: number, oy: number, oz: number, rand: () => number): number[][] {
    const has = (x: number, y: number, z: number) => this.cells.has(`${x},${y},${z}`);
    const list: number[][] = [];
    for (const [key, c] of this.cells) {
      const [x, y, z] = key.split(',').map(Number);
      if (has(x - 1, y, z) && has(x + 1, y, z) && has(x, y - 1, z) && has(x, y + 1, z) && has(x, y, z - 1) && has(x, y, z + 1)) continue;
      const shade = 0.94 + rand() * 0.12;
      list.push([ox + x * T, oy + y * T + T / 2, oz + z * T, T, c[0] * shade, c[1] * shade, c[2] * shade, rand()]);
    }
    return list;
  }
}

const C = {
  cream: [0.93, 0.9, 0.82] as Rgb, ink: [0.16, 0.15, 0.2] as Rgb, grey: [0.62, 0.62, 0.66] as Rgb,
  orange: [0.86, 0.42, 0.27] as Rgb, red: [0.86, 0.3, 0.28] as Rgb, yellow: [0.95, 0.78, 0.3] as Rgb,
  green: [0.4, 0.72, 0.38] as Rgb, sky: [0.3, 0.6, 0.9] as Rgb, white: [0.97, 0.97, 0.97] as Rgb,
  navy: [0.14, 0.24, 0.5] as Rgb, bottle: [0.12, 0.3, 0.2] as Rgb, wine: [0.55, 0.1, 0.2] as Rgb,
  glass: [0.75, 0.88, 0.92] as Rgb, cork: [0.72, 0.56, 0.36] as Rgb, wood: [0.42, 0.28, 0.16] as Rgb,
  pink: [0.93, 0.6, 0.66] as Rgb, rose: [0.82, 0.45, 0.55] as Rgb, gold: [0.95, 0.72, 0.28] as Rgb,
  steel: [0.4, 0.46, 0.6] as Rgb,
};

/** Aside: a browser window with a page of text and an orange sidebar of chat bubbles. */
function browser(g: Grid): void {
  g.box(-14, 4, -1, 14, 25, 0, C.ink); // frame
  g.box(-13, 5, 1, 13, 21, 1, C.cream); // page
  g.box(-13, 22, 1, 13, 24, 1, C.steel); // title bar
  g.set(-12, 23, 2, C.red); g.set(-10, 23, 2, C.yellow); g.set(-8, 23, 2, C.green);
  for (let row = 0; row < 5; row++) g.box(-11, 18 - row * 3, 2, -11 + [12, 9, 13, 7, 11][row], 18 - row * 3, 2, C.grey);
  g.box(5, 5, 1, 13, 21, 2, C.orange); // sidebar, standing proud of the page
  g.box(6, 17, 3, 11, 19, 3, C.cream); g.box(8, 12, 3, 12, 14, 3, C.white); g.box(6, 7, 3, 10, 9, 3, C.cream);
  g.box(-1, 0, -1, 1, 3, 0, C.ink); g.box(-6, 0, -2, 6, 0, 1, C.ink); // stand
}

/** Nechita Raka ("soft landing"): a striped parachute lowering a crate. */
function parachute(g: Grid): void {
  g.fill(12, 16, 28, (x, y, z) => {
    const d = Math.hypot(x, (y - 16) * 1.25, z);
    if (d > 12 || d < 10.6) return null;
    const stripe = Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI / 4)) % 2;
    return stripe ? C.sky : C.white;
  });
  for (const [sx, sz] of [[-11, 0], [11, 0], [0, -11], [0, 11], [-8, 8], [8, -8], [-8, -8], [8, 8]]) {
    for (let n = 0; n <= 9; n++) g.set(Math.round(sx * (1 - n / 10.5)), 15 - n, Math.round(sz * (1 - n / 10.5)), C.ink);
  }
  g.box(-3, 1, -3, 3, 6, 3, C.wood); // the crate
  g.box(-3, 3, -3, 3, 4, 3, C.navy);
  g.box(-1, 7, -1, 1, 7, 1, C.gold);
}

/** Wine Sommelier Bot: a bottle with a label and a glass of red. */
function wine(g: Grid): void {
  const at = (cx: number, r: number, y0: number, y1: number, c: (y: number) => Rgb) =>
    g.fill(14, y0, y1, (x, y, z) => (Math.hypot(x - cx, z) <= r ? c(y) : null));
  at(-5, 4.3, 0, 15, y => (y >= 5 && y <= 11 ? C.cream : C.bottle));
  at(-5, 3.2, 16, 17, () => C.bottle);
  at(-5, 1.6, 18, 24, () => C.bottle);
  at(-5, 1.6, 25, 26, () => C.cork);
  g.box(-8, 7, 4, -3, 9, 4, C.wine); // the label's mark
  at(7, 4, 0, 0, () => C.glass); // glass: foot, stem, bowl
  at(7, 0.8, 1, 8, () => C.glass);
  g.fill(14, 9, 18, (x, y, z) => {
    const d = Math.hypot(x - 7, z);
    const r = y < 12 ? 2.4 + (y - 9) * 1.1 : 5.4 - (y - 12) * 0.12;
    if (d > r) return null;
    if (d < r - 1.2) return y <= 14 ? C.wine : null; // wine up to here, air above
    return C.glass;
  });
}

/** 5x7 glyphs for the "more work" totem. */
const GLYPHS: Record<string, string[]> = {
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
};

/** More work: the "</>" mark as chunky letters. */
function codeMark(g: Grid): void {
  '</>'.split('').forEach((ch, n) => {
    GLYPHS[ch].forEach((row, r) => {
      row.split('').forEach((cell, c) => {
        if (cell !== '#') return;
        const x = (n - 1) * 8 + (c - 2);
        g.box(x * 2, (6 - r) * 3 + 2, -2, x * 2 + 1, (6 - r) * 3 + 4, 1, n === 1 ? C.gold : C.cream);
      });
    });
  });
  g.box(-22, 0, -3, 22, 1, 2, C.ink);
}

/** About (Computer Science & Neuroscience): a brain on a stand. */
function brain(g: Grid): void {
  g.fill(13, 8, 26, (x, y, z) => {
    if (x === 0 && y > 14) return null; // the groove between the hemispheres
    const wobble = Math.sin(x * 1.3 + y * 0.9) * Math.cos(z * 1.1 + y * 0.7) * 1.3;
    const d = Math.hypot(x / 1.0, (y - 17) / 0.78, z / 1.18) + wobble * 0.55;
    if (d > 9.6) return null;
    return Math.sin(x * 0.9 + y * 1.7 + z * 0.8) > 0.35 ? C.rose : C.pink;
  });
  g.fill(4, 5, 8, (x, _y, z) => (Math.hypot(x, z - 3) < 2.4 ? C.rose : null)); // brain stem
  g.box(-1, 1, -1, 1, 5, 1, C.steel); g.box(-6, 0, -4, 6, 0, 4, C.ink);
}

/** Contact: a mailbox with its flag up and a letter in the slot. */
function mailbox(g: Grid): void {
  g.box(-1, 0, -1, 1, 12, 1, C.wood);
  g.fill(12, 13, 24, (x, y, z) => {
    if (Math.abs(x) > 9 || Math.abs(z) > 5) return null;
    const top = 18 + Math.sqrt(Math.max(0, 25 - z * z)) * 0.9;
    return y <= top ? C.sky : null;
  });
  g.box(-9, 13, -5, 9, 13, 5, C.navy);
  g.box(10, 14, -4, 10, 21, 4, C.navy); // the door
  g.box(10, 16, -3, 13, 20, 3, C.white); g.box(13, 17, -1, 13, 18, 1, C.red); // the letter
  g.box(-4, 20, 6, -4, 28, 6, C.red); g.box(-4, 26, 6, 0, 28, 6, C.red); // the flag
}

/** Toolbox (skills): an open red toolbox with a wrench and a screwdriver standing in it. */
function toolbox(g: Grid): void {
  g.box(-11, 0, -5, 11, 9, 5, C.red); // the box
  g.box(-11, 8, -5, 11, 9, 5, C.wine); // the rim, a shade darker
  g.box(-12, 4, -6, 12, 5, 6, C.wine); // a band round the middle
  g.box(-2, 5, 6, 2, 6, 6, C.gold); // the latch
  g.box(-1, 2, -2, 1, 7, 2, C.ink); // shadow in the open top reads as depth
  g.box(-7, 10, -1, -6, 15, 0, C.steel); g.box(6, 10, -1, 7, 15, 0, C.steel); // handle posts
  g.box(-7, 15, -1, 7, 16, 0, C.steel); // handle bar
  // A wrench leaning out on the left: shaft and an open jaw.
  for (let n = 0; n <= 12; n++) g.box(-9 + Math.round(n * -0.25), 10 + n, 2, -8 + Math.round(n * -0.25), 10 + n, 3, C.grey);
  g.box(-15, 23, 1, -10, 25, 4, C.grey); g.box(-13, 25, 1, -12, 26, 4, C.ink);
  // A screwdriver on the right: yellow handle, steel shaft.
  g.box(8, 10, 1, 9, 19, 2, C.steel);
  g.box(7, 20, 0, 10, 26, 3, C.yellow); g.box(7, 23, 0, 10, 23, 3, C.orange);
}

/** One model per station after the hero, in page order. The engine builds one island per entry plus the hero's. */
export const TOTEM_BUILDERS = [browser, parachute, wine, codeMark, brain, toolbox, mailbox];

/**
 * All totems share one pool of `count` cubes, so the same cubes can fly from one model to the
 * next. A model with fewer cubes hides its spares inside itself (size 0); the order is
 * shuffled per model, so neighbours part ways in flight instead of moving as a block.
 */
export function buildTotemPool(
  origins: { x: number; y: number; z: number }[],
  restAt: (rand: () => number) => [number, number, number],
  rand: () => number,
): { shapes: Float32Array[]; count: number } {
  const models = TOTEM_BUILDERS.map((build, n) => {
    const g = new Grid();
    build(g);
    return g.emit(origins[n].x, origins[n].y, origins[n].z, rand);
  });
  const count = Math.max(...models.map(m => m.length));
  const shuffle = <V,>(list: V[]): V[] => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const pad = (model: number[][]): Float32Array => {
    const full = model.slice();
    while (full.length < count) {
      const twin = model[Math.floor(rand() * model.length)];
      full.push([twin[0], twin[1], twin[2], 0, twin[4], twin[5], twin[6], rand()]);
    }
    return new Float32Array(shuffle(full).flat());
  };
  // Before the first totem the cubes rest on the hero island as golden motes.
  const rest: number[][] = Array.from({ length: count }, () => {
    const [x, y, z] = restAt(rand);
    const big = rand() < 0.1;
    return [x, y, z, big ? 1.6 : 0, 0.98, 0.84, 0.42, rand()];
  });
  return { shapes: [new Float32Array(rest.flat()), ...models.map(pad)], count };
}
