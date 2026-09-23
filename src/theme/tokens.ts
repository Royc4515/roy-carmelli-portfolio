import type { SheetPose } from './pixelSprites';

/** Character poses that have a sprite sheet (sizes and timing live in ./pixelSprites.ts). */
export type Pose = SheetPose;

export const COLORS = {
  forestDark: '#1a2e10',
  forest: '#2d4a1e',
  forestLight: '#4a6b2e',
  parchment: '#e8d8a8',
  parchmentDark: '#c9b87a',
  brass: '#c9a24a',
  woodDark: '#3a2818',
  wood: '#6b4a2e',
} as const;

/**
 * Horizontal nudge (px) of the desktop hero character, which stands under the Player card.
 * 0 since the native x3 sprite (123x201) replaced the old scaled image: the waving hand
 * clears the card without shifting the character sideways.
 */
export const HERO_CHARACTER_OFFSET_X = 0;
