export type GameState = 'IDLE' | 'TRANSITION' | 'PLAYING' | 'GAMEOVER';

export type PlayerAnimState =
  | 'wave'
  | 'run'
  | 'jumpUp'
  | 'jumpDown'
  | 'stand'
  | 'idle';

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
