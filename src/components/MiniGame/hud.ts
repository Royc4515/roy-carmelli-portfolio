import { HUD_CONFIG, SPRITE_PATHS } from './config';
import type { SpriteRenderer } from './SpriteRenderer';

/** Canvas palette, matched to the site's forest tokens (canvas cannot read CSS vars). */
export const HUD_COLORS = {
  ink:         '#0d1608',
  panel:       'rgba(20,36,12,0.92)',
  panelInner:  '#0f1c09',
  forestLight: '#8fb85a',
  brass:       '#e0b552',
  parchment:   '#f3e7c2',
  overlay:     'rgba(10,20,6,0.72)',
  danger:      '#ff6b5b',
} as const;

export const FONT_SM = '8px "Press Start 2P"';
export const FONT_MD = '10px "Press Start 2P"';
export const FONT_LG = '14px "Press Start 2P"';

/** Scores always show as six digits, arcade style. */
export function pad(score: number): string {
  return String(Math.floor(score)).padStart(6, '0');
}

/**
 * Text with a dark outline, so it stays readable over any part of the bright forest.
 * The stroke goes first and is twice the visible outline width, since half of it sits
 * under the fill.
 */
export function outlinedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
): void {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = HUD_COLORS.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** A 1px-stepped frame: ink outside, brass rim, the classic RPG window edge. */
function pixelFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = HUD_COLORS.ink;
  ctx.fillRect(x + 2, y, w - 4, h);
  ctx.fillRect(x, y + 2, w, h - 4);
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = HUD_COLORS.brass;
  ctx.fillRect(x + 2, y + 1, w - 4, h - 2);
  ctx.fillRect(x + 1, y + 2, w - 2, h - 4);
}

export interface PlayerCardData {
  score: number;
  best: number;
}

/** The player card in the top-left corner: portrait, name, live score and best. */
export function drawPlayerCard(
  ctx: CanvasRenderingContext2D,
  renderer: SpriteRenderer,
  { score, best }: PlayerCardData,
): void {
  const { x, y, w, h, portrait } = HUD_CONFIG;

  pixelFrame(ctx, x, y, w, h);
  ctx.fillStyle = HUD_COLORS.panel;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

  // Portrait window, sized to the sprite so it is drawn 1:1.
  const inset = Math.floor((h - portrait.h) / 2);
  const px = x + inset;
  const py = y + inset;
  pixelFrame(ctx, px - 3, py - 3, portrait.w + 6, portrait.h + 6);
  ctx.fillStyle = HUD_COLORS.panelInner;
  ctx.fillRect(px, py, portrait.w, portrait.h);
  renderer.draw(ctx, SPRITE_PATHS.portrait, px, py, portrait.w, portrait.h);

  const tx = px + portrait.w + 12;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = FONT_MD;
  outlinedText(ctx, 'ROY', tx, y + 12, HUD_COLORS.parchment);
  ctx.font = FONT_SM;
  outlinedText(ctx, 'SCORE', tx, y + 32, HUD_COLORS.forestLight);
  outlinedText(ctx, pad(score), tx + 48, y + 32, HUD_COLORS.brass);
  outlinedText(ctx, 'BEST', tx, y + 48, HUD_COLORS.forestLight);
  outlinedText(ctx, best > 0 ? pad(best) : '------', tx + 48, y + 48, HUD_COLORS.parchment);
}

