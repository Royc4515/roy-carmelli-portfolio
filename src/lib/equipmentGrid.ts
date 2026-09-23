/**
 * Keyboard model and column split for the Equipment grid (Zone 03, SPEC §4 Skills).
 *
 * The slots form an ARIA layout grid (WAI-ARIA APG "Layout Grid"): one row per slot, one
 * cell per item, rows of different lengths. The whole grid is a single Tab stop (roving
 * tabindex); the arrow keys move inside it:
 *   - Left / Right: previous / next item in the slot (stops at the ends, no wrap);
 *   - Up / Down: same position in the previous / next slot, clamped to that slot's length.
 *     The column is "sticky" across consecutive Up / Down presses, like a text caret, so
 *     passing through a short slot does not lose the column;
 *   - Home / End: first / last item of the slot; Ctrl (or Cmd) + Home / End: first / last
 *     item of the whole grid.
 */

export interface GridPos {
  row: number;
  col: number;
}

export interface MoveOptions {
  /** Ctrl or Cmd held: Home / End jump to the first / last item of the grid. */
  ctrl?: boolean;
  /** Column to aim for on Up / Down (the sticky column); defaults to `pos.col`. */
  preferredCol?: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/**
 * The cell that `key` moves to from `pos`, given each row's length. Returns `null` for keys
 * the grid does not handle (so the browser keeps its default), and `pos` itself when the
 * key is handled but focus stays (an edge), so the caller still prevents page scrolling.
 */
export function moveInGrid(
  rowLengths: readonly number[],
  pos: GridPos,
  key: string,
  { ctrl = false, preferredCol }: MoveOptions = {},
): GridPos | null {
  const rows = rowLengths.length;
  if (rows === 0) return null;
  const row = clamp(pos.row, 0, rows - 1);
  const last = (r: number) => Math.max(0, rowLengths[r] - 1);
  const col = clamp(pos.col, 0, last(row));

  switch (key) {
    case 'ArrowRight':
      return { row, col: Math.min(col + 1, last(row)) };
    case 'ArrowLeft':
      return { row, col: Math.max(col - 1, 0) };
    case 'ArrowDown':
    case 'ArrowUp': {
      const next = clamp(row + (key === 'ArrowDown' ? 1 : -1), 0, rows - 1);
      if (next === row) return { row, col };
      return { row: next, col: Math.min(preferredCol ?? col, last(next)) };
    }
    case 'Home':
      return ctrl ? { row: 0, col: 0 } : { row, col: 0 };
    case 'End':
      return ctrl ? { row: rows - 1, col: last(rows - 1) } : { row, col: last(row) };
    default:
      return null;
  }
}
