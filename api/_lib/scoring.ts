/** Same ceiling as the database check on best_score. */
export const MAX_SCORE = 1_000_000;

/**
 * Points the game awards per second of play. Must equal SCORE_CONFIG.pointsPerSecond in
 * src/components/MiniGame/config.ts (scoring.test.ts fails if they drift); kept here so the
 * functions never import browser code.
 */
export const POINTS_PER_SECOND = 8;

/**
 * The most a run that has lasted `elapsedSeconds` on the server's clock can honestly score.
 * The engine caps a frame at 0.1s, so game time never outruns wall time; 5% plus 3 seconds
 * of slack covers a slow start request.
 */
export function maxPlausibleScore(elapsedSeconds: number): number {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return 0;
  return Math.floor(elapsedSeconds * POINTS_PER_SECOND * 1.05) + 3 * POINTS_PER_SECOND;
}

/** A whole score in 0..MAX_SCORE, or `null`. */
export function parseScore(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return null;
  return raw >= 0 && raw <= MAX_SCORE ? raw : null;
}
