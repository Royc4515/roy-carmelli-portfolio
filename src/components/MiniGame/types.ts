export type GameState = 'IDLE' | 'TRANSITION' | 'PLAYING' | 'GAMEOVER';

export type PlayerAnimState =
  | 'wave'
  | 'run'
  | 'jumpUp'
  | 'jumpDown'
  | 'stand'
  | 'idle'
  | 'slide';

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ObstacleDef {
  readonly src: string;
  readonly w: number;
  readonly h: number;
}

export type ObstacleKind = 'ground' | 'air';

/**
 * Moments the engine announces for sound: a run starts, Roy jumps or slides (only when the
 * move actually happens), the score passes another `SCORE_CONFIG.milestone`, the run ends,
 * and that run beat the best.
 */
export type GameCue = 'start' | 'jump' | 'slide' | 'milestone' | 'crash' | 'newBest';
