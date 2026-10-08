import { describe, expect, it } from 'vitest';
import {
  BACKGROUND_CONFIG, CANVAS_CONFIG, PHYSICS_CONFIG, PLAYER_CONFIG, SCROLL_CONFIG, SPRITE_PATHS,
} from './config';
import { Obstacle } from './Obstacle';
import { Player, slideFrame } from './Player';
import { SPRITE_SIZES } from './spriteSizes.generated';
import type { AABB, ObstacleDef } from './types';

/** Where every sprite's bottom edge stands. */
const FEET_Y = CANVAS_CONFIG.groundY - PLAYER_CONFIG.groundOffset;
/** Native rows of the background's grass band, from its top row (scripts/pixelate/README.md). */
const GRASS_ROWS = 8;
const ground = SPRITE_PATHS.obstacles.ground as readonly ObstacleDef[];
const air = SPRITE_PATHS.obstacles.air as readonly ObstacleDef[];

const bottom = (b: AABB) => b.y + b.h;
const overlapsY = (a: AABB, b: AABB) => a.y < bottom(b) && bottom(a) > b.y;

function standing(): Player {
  return new Player(CANVAS_CONFIG.width, CANVAS_CONFIG.height);
}

function sliding(): Player {
  const p = standing();
  p.slide();
  return p;
}

/**
 * Horizontal distance a perfectly timed jump keeps Roy's hitbox above `top` (the obstacle
 * hitbox's top edge), at `speed` px/s of scroll.
 */
function clearance(top: number, speed: number): number {
  const { gravity, jumpForce } = PHYSICS_CONFIG;
  const rest = standing().getHitbox();
  // Hitbox bottom over time: bottom(rest) + jumpForce t + g t^2 / 2 <= top.
  const rise = bottom(rest) - top;
  const disc = jumpForce * jumpForce - 2 * gravity * rise;
  if (rise <= 0) return Infinity; // already above it on the ground
  if (disc <= 0) return 0;
  return (2 * Math.sqrt(disc) / gravity) * speed;
}

describe('Roy Runner geometry', () => {
  it('stands Roy and every ground obstacle on the same feet line', () => {
    const p = standing();
    expect(p.y + PLAYER_CONFIG.displayH).toBe(FEET_Y);
    for (const def of ground) {
      const o = new Obstacle('ground', def);
      expect(o.y + def.h).toBe(FEET_Y);
    }
  });

  it('puts the feet line inside the background grass band', () => {
    const { scale, top } = BACKGROUND_CONFIG;
    expect(Number.isInteger(scale * 2)).toBe(true); // forest pixels in an even 2-3 rhythm
    const grassTop = top + SPRITE_SIZES.background.groundRow * scale;
    const grassBottom = grassTop + GRASS_ROWS * scale;
    // Well inside the band: not on the dark line along its top, not on the soil under it.
    expect(FEET_Y - grassTop).toBeGreaterThanOrEqual(scale * 2);
    expect(grassBottom - FEET_Y).toBeGreaterThanOrEqual(scale * 2);
    // The background tile covers the whole canvas.
    expect(top).toBeLessThanOrEqual(0);
    expect(top + BACKGROUND_CONFIG.tileH).toBeGreaterThanOrEqual(CANVAS_CONFIG.height);
    expect(BACKGROUND_CONFIG.tileW).toBeGreaterThanOrEqual(CANVAS_CONFIG.width);
  });

  it('draws Roy 1:1 and keeps every obstacle well under his height', () => {
    expect(PLAYER_CONFIG.displayH).toBe(SPRITE_SIZES.player.h);
    for (const def of [...ground, ...air]) {
      // The tallest (a 0.7 m stump, exaggerated 1.35x for readability, plus its 1 px contrast
      // rim) is a little over half of Roy; 0.6 leaves room for rounding on a re-import.
      expect(def.h).toBeLessThanOrEqual(PLAYER_CONFIG.displayH * 0.6);
      expect(def.h).toBeGreaterThanOrEqual(32);
    }
  });

  it('makes every air obstacle hit a standing Roy and pass over a sliding one', () => {
    for (const def of air) {
      const box = new Obstacle('air', def).getHitbox();
      expect(overlapsY(box, standing().getHitbox())).toBe(true);
      expect(overlapsY(box, sliding().getHitbox())).toBe(false);
      // With room to spare under it, so a slide is not a pixel-perfect squeeze.
      expect(sliding().getHitbox().y - bottom(box)).toBeGreaterThanOrEqual(8);
    }
  });

  it('lets the visible slide pose pass under every air obstacle sprite, not just its hitbox', () => {
    const slideTop = FEET_Y - SPRITE_SIZES.slide.h + SPRITE_SIZES.slide.top;
    for (const def of air) {
      const o = new Obstacle('air', def);
      expect(slideTop - (o.y + def.h)).toBeGreaterThanOrEqual(8);
    }
  });

  it('gives every ground obstacle a hitbox a standing Roy runs into', () => {
    for (const def of ground) {
      const box = new Obstacle('ground', def).getHitbox();
      expect(box.w).toBeGreaterThan(0);
      expect(box.h).toBeGreaterThan(0);
      expect(overlapsY(box, standing().getHitbox())).toBe(true);
    }
  });

  it.each([SCROLL_CONFIG.initialSpeed, SCROLL_CONFIG.maxSpeed])(
    'lets a well-timed jump clear every ground obstacle at %i px/s',
    speed => {
      const roy = standing().getHitbox();
      for (const def of ground) {
        const box = new Obstacle('ground', def).getHitbox();
        // Roy's hitbox has to travel the obstacle's width plus his own while above it.
        expect(clearance(box.y, speed)).toBeGreaterThanOrEqual(box.w + roy.w);
      }
    },
  );
});

describe('Roy Runner slide animation', () => {
  const { slideDuration, slideMoveFrameMs } = PLAYER_CONFIG;
  const { slide, slideIn, slideOut } = SPRITE_PATHS.player;

  it('drops in, slides, then gets up, in that order', () => {
    expect(slideFrame(0).src).toBe(slideIn[0]);
    expect(slideFrame((slideIn.length * slideMoveFrameMs) / 1000 - 0.001).src).toBe(slideIn.at(-1));
    expect(slide).toContain(slideFrame(slideDuration / 2).src);
    expect(slideFrame(slideDuration - (slideOut.length * slideMoveFrameMs) / 1000 + 0.001).src).toBe(slideOut[0]);
    expect(slideFrame(slideDuration).src).toBe(slideOut.at(-1));
  });

  it('shows every frame of the sequence at some point of a slide', () => {
    const seen = new Set<string>();
    for (let t = 0; t <= slideDuration; t += 0.005) seen.add(slideFrame(t).src);
    for (const src of [...slideIn, ...slide, ...slideOut]) expect(seen).toContain(src);
  });

  it('keeps the low hitbox for the whole slide, drop-in and get-up included', () => {
    const p = standing();
    p.slide();
    for (let t = 0; t < slideDuration - 0.02; t += 0.05) {
      expect(p.getHitbox().y).toBe(sliding().getHitbox().y);
      p.update(0.05);
    }
  });
});
