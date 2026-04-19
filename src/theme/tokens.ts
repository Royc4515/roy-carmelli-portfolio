export const SPRITES = {
  walk: [
    '/assets/sprites/walk-1.png',
    '/assets/sprites/walk-2.png',
    '/assets/sprites/walk-3.png',
    '/assets/sprites/walk-4.png',
  ],
  wave: [
    '/assets/sprites/wave-1.png',
    '/assets/sprites/wave-2.png',
  ],
  sit: [
    '/assets/sprites/sit-1.png',
    '/assets/sprites/sit-2.png',
    '/assets/sprites/sit-3.png',
  ],
  idle: ['/assets/sprites/idle.png'],
  faceLarge: '/assets/sprites/face-large.png',
  faceSmall: '/assets/sprites/face-small.png',
} as const;

export const FRAME_INTERVALS: Record<string, number> = {
  walk: 150,
  wave: 400,
  sit: 500,
  idle: 0,
};

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
