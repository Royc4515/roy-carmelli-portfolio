import { FLOATS, Voxels, type Rgb } from './voxels';
import type { Festive } from './sky';

/**
 * Small voxel models for the sky and the calendar: the cloud pool, rain and snow, and one
 * decoration per special day. Plain instance data, like everything in voxels.ts.
 */

const U = 3; // decorations are built from 3-unit cubes, the same grain as the totems

const COL = {
  gold: [0.93, 0.74, 0.25] as Rgb,
  goldDark: [0.72, 0.52, 0.16] as Rgb,
  white: [0.97, 0.96, 0.92] as Rgb,
  cream: [0.93, 0.88, 0.74] as Rgb,
  wood: [0.47, 0.31, 0.18] as Rgb,
  woodDark: [0.34, 0.22, 0.13] as Rgb,
  silver: [0.76, 0.79, 0.84] as Rgb,
  blue: [0.13, 0.33, 0.78] as Rgb,
  leaf: [0.25, 0.5, 0.2] as Rgb,
  leafDark: [0.17, 0.38, 0.16] as Rgb,
  red: [0.86, 0.22, 0.2] as Rgb,
  orange: [0.96, 0.55, 0.16] as Rgb,
  yellow: [0.99, 0.86, 0.3] as Rgb,
  purple: [0.52, 0.27, 0.7] as Rgb,
  pink: [0.95, 0.45, 0.65] as Rgb,
  teal: [0.16, 0.66, 0.62] as Rgb,
  flame: [1.0, 0.6, 0.15] as Rgb,
  flameTip: [1.0, 0.92, 0.5] as Rgb,
};

export interface Range {
  start: number;
  count: number;
}

class Builder {
  constructor(readonly out: Voxels, private ox: number, private oz: number) {}
  /** A filled box in grid cells (inclusive), y up from the ground. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: Rgb, shade = 1): void {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      this.out.add(this.ox + x * U, y * U + U / 2, this.oz + z * U, U, c, shade);
    }
  }
  flame(x: number, y: number, z: number): void {
    this.out.add(this.ox + x * U, y * U + U / 2, this.oz + z * U, U * 0.95, COL.flame);
    this.out.add(this.ox + x * U, y * U + U * 1.35, this.oz + z * U, U * 0.55, COL.flameTip);
  }
}

export interface FestiveModels {
  statics: Voxels;
  staticRanges: Record<Festive, Range>;
  flames: Voxels;
  flameRanges: Record<Festive, Range>;
  /** Where the decoration stands, for the warm light its flames give at night. */
  at: [number, number, number];
}

/**
 * One decoration per special day, all on the hero island behind Roy's path (he runs along
 * z = 24; these stand at z < 0), to the right of where he waves.
 */
export function buildFestive(rand: () => number): FestiveModels {
  const at: [number, number, number] = [50, 0, -16];
  const statics = new Voxels(rand);
  const flames = new Voxels(rand);
  const staticRanges = {} as Record<Festive, Range>;
  const flameRanges = {} as Record<Festive, Range>;
  const model = (key: Festive, build: (s: Builder, f: Builder) => void) => {
    const s0 = statics.count, f0 = flames.count;
    build(new Builder(statics, at[0], at[2]), new Builder(flames, at[0], at[2]));
    staticRanges[key] = { start: s0, count: statics.count - s0 };
    flameRanges[key] = { start: f0, count: flames.count - f0 };
  };

  // Hanukkiah: eight branches and a taller shamash in the middle. Flames are emitted shamash
  // first, then from the right, so drawing the first 2 * (1 + n) cubes lights n candles.
  model('hanukkah', (s, f) => {
    s.box(-5, 0, -1, 5, 0, 1, COL.goldDark);
    s.box(-3, 1, 0, 3, 1, 0, COL.gold);
    s.box(0, 2, 0, 0, 7, 0, COL.gold);
    s.box(-8, 6, 0, 8, 6, 0, COL.gold);
    for (const x of [-8, -6, -4, -2, 2, 4, 6, 8]) {
      s.box(x, 7, 0, x, 7, 0, COL.goldDark);
      s.box(x, 8, 0, x, 9, 0, COL.white);
    }
    s.box(0, 8, 0, 0, 8, 0, COL.goldDark);
    s.box(0, 9, 0, 0, 11, 0, COL.white);
    f.flame(0, 12, 0);
    for (const x of [8, 6, 4, 2, -2, -4, -6, -8]) f.flame(x, 10, 0);
  });

  // Shabbat: two candles on a small covered table.
  model('shabbat', (s, f) => {
    for (const [x, z] of [[-4, -2], [4, -2], [-4, 2], [4, 2]]) s.box(x, 0, z, x, 3, z, COL.woodDark);
    s.box(-5, 4, -3, 5, 4, 3, COL.wood);
    s.box(-5, 5, -3, 5, 5, 3, COL.white);
    s.box(-5, 3, 3, 5, 4, 3, COL.white); // the cloth hangs over the front edge
    for (const x of [-2, 2]) {
      s.box(x, 6, 0, x, 6, 0, COL.silver);
      s.box(x, 7, 0, x, 7, 0, COL.silver, 0.85);
      s.box(x, 8, 0, x, 10, 0, COL.white);
      f.flame(x, 11, 0);
    }
  });

  // Birthday: a two-tier cake with five candles, and a balloon on a string at each side.
  model('birthday', (s, f) => {
    s.box(-5, 0, -5, 5, 0, 5, COL.silver, 0.9); // the plate
    s.box(-4, 1, -4, 4, 3, 4, COL.cream);
    s.box(-4, 4, -4, 4, 4, 4, COL.pink);
    // Icing running down the lower tier.
    for (const [x, z] of [[-4, -2], [-4, 3], [4, -3], [4, 1], [-1, 4], [3, 4], [-3, -4], [2, -4]]) s.box(x, 3, z, x, 3, z, COL.pink);
    s.box(-2, 5, -2, 2, 6, 2, COL.white);
    s.box(-2, 7, -2, 2, 7, 2, COL.pink);
    const candles: Array<[number, number, Rgb]> = [[-2, -2, COL.red], [2, -2, COL.teal], [0, 0, COL.yellow], [-2, 2, COL.blue], [2, 2, COL.purple]];
    for (const [x, z, c] of candles) {
      s.box(x, 8, z, x, 9, z, c);
      f.flame(x, 10, z);
    }
    const balloons: Array<[number, Rgb, number]> = [[-10, COL.red, 15], [10, COL.blue, 17]];
    for (const [x, c, top] of balloons) {
      s.box(x, 0, 0, x, top - 4, 0, COL.woodDark, 0.8);
      s.box(x - 1, top - 3, -1, x + 1, top, 1, c);
      s.box(x, top + 1, 0, x, top + 1, 0, c, 1.1);
    }
  });

  // Sukkah: three low walls, an open front, a roof of branches with gaps (you see the sky
  // through it), and decorations hanging inside.
  model('sukkot', s => {
    for (const [x, z] of [[-7, -5], [7, -5], [-7, 5], [7, 5]]) s.box(x, 0, z, x, 11, z, COL.woodDark);
    s.box(-6, 0, -5, 6, 7, -5, COL.cream);
    s.box(-6, 4, -5, 6, 4, -5, COL.blue, 0.9);
    s.box(-7, 0, -4, -7, 7, 4, COL.cream, 0.92);
    s.box(7, 0, -4, 7, 7, 4, COL.cream, 0.92);
    for (let z = -6; z <= 6; z += 2) s.box(-8, 12, z, 8, 12, z, z % 4 === 0 ? COL.leaf : COL.leafDark);
    for (let n = 0; n < 16; n++) {
      const x = -8 + Math.floor(rand() * 17), z = -6 + Math.floor(rand() * 13);
      s.box(x, 13, z, x, 13, z, rand() < 0.5 ? COL.leaf : COL.leafDark);
    }
    const hang: Rgb[] = [COL.red, COL.yellow, COL.orange, COL.purple, COL.red, COL.yellow];
    hang.forEach((c, n) => {
      const x = -5 + n * 2, z = n % 2 === 0 ? 1 : -2;
      s.box(x, 10, z, x, 11, z, COL.woodDark, 0.8);
      s.box(x, 9, z, x, 9, z, c);
    });
  });

  // Independence Day: blue and white bunting between two poles.
  model('independence', s => {
    for (const x of [-12, 12]) s.box(x, 0, 0, x, 14, 0, COL.silver);
    for (let x = -11; x <= 11; x++) {
      const sag = Math.round(2.2 * (1 - (x / 11) ** 2));
      const y = 14 - sag;
      s.box(x, y, 0, x, y, 0, COL.white, 0.8);
      if ((x + 11) % 2 === 0) {
        const c = ((x + 11) / 2) % 2 === 0 ? COL.blue : COL.white;
        s.box(x, y - 2, 0, x, y - 1, 0, c);
        s.box(x, y - 3, 0, x, y - 3, 0, c, 0.92);
      }
    }
  });

  // Purim: a gragger and a mask on a stick.
  model('purim', s => {
    s.box(-5, 0, 0, -5, 6, 0, COL.wood);
    s.box(-8, 7, -1, -2, 9, 1, COL.red);
    s.box(-8, 8, -1, -2, 8, 1, COL.yellow);
    s.box(-9, 7, 0, -9, 9, 0, COL.teal);
    s.box(6, 0, 0, 6, 6, 0, COL.woodDark);
    s.box(2, 7, 0, 10, 10, 0, COL.purple);
    s.box(2, 11, 0, 3, 11, 0, COL.gold);
    s.box(9, 11, 0, 10, 11, 0, COL.gold);
    s.box(2, 7, 1, 10, 7, 1, COL.gold);
    s.box(3, 9, 1, 4, 9, 1, COL.woodDark, 0.4); // eye holes, drawn as dark insets
    s.box(8, 9, 1, 9, 9, 1, COL.woodDark, 0.4);
    s.box(6, 8, 1, 6, 8, 1, COL.pink);
  });

  return { statics, staticRanges, flames, flameRanges, at };
}

/**
 * Rain, snow and confetti share one buffer of random points in a box around the camera; the
 * vertex shader makes them fall and wraps them, so the count drawn is the only per-frame cost.
 * Colours: the first block is neutral (rain and snow tint it), the second is confetti.
 */
export const PRECIP_BOX: [number, number, number] = [560, 330, 300];
export function buildPrecip(count: number, rand: () => number): { data: Float32Array; confetti: Range; count: number } {
  const v = new Voxels(rand);
  const point = (c: Rgb) => v.add(rand() * PRECIP_BOX[0], rand() * PRECIP_BOX[1], (rand() - 0.5) * PRECIP_BOX[2], 1, c);
  for (let n = 0; n < count; n++) point([1, 1, 1]);
  const start = v.count;
  const party: Rgb[] = [COL.red, COL.yellow, COL.teal, COL.purple, COL.pink, COL.blue, COL.orange];
  for (let n = 0; n < 260; n++) point(party[n % party.length]);
  return { data: v.toArray(), confetti: { start, count: v.count - start }, count };
}

/** A firework: `n` cubes at one point, then their velocities (the layout the burst mode reads). */
export function buildFirework(n: number, colours: Rgb[], rand: () => number): Float32Array {
  const data = new Float32Array(n * FLOATS * 2);
  for (let i = 0; i < n; i++) {
    // Even directions on a sphere, so the burst is a ball and not a fountain.
    const z = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - z * z), a = i * 2.39996;
    const speed = 95 + rand() * 30;
    const c = colours[i % colours.length];
    data.set([0, 0, 0, 2.2 + rand() * 1.4, c[0], c[1], c[2], rand()], i * FLOATS);
    data.set([Math.cos(a) * r * speed, z * speed + 55, Math.sin(a) * r * speed, 0, 0, 0, 0, rand()], (n + i) * FLOATS);
  }
  return data;
}

export const FIREWORK_COLOURS: Rgb[][] = [
  [COL.blue, COL.white, [0.45, 0.65, 1]],
  [COL.white, COL.gold, COL.yellow],
];
