import { describe, expect, it } from 'vitest';
import { skills } from '../data/bio';
import { moveInGrid, splitColumns } from './equipmentGrid';

// Rows of different lengths, like the equipment slots: 3, 5, 2, 4 items.
const rows = [3, 5, 2, 4];
const at = (row: number, col: number) => ({ row, col });

describe('moveInGrid', () => {
  it('Left / Right move within a row and stop at its ends (no wrap)', () => {
    expect(moveInGrid(rows, at(1, 2), 'ArrowRight')).toEqual(at(1, 3));
    expect(moveInGrid(rows, at(1, 2), 'ArrowLeft')).toEqual(at(1, 1));
    expect(moveInGrid(rows, at(1, 4), 'ArrowRight')).toEqual(at(1, 4));
    expect(moveInGrid(rows, at(1, 0), 'ArrowLeft')).toEqual(at(1, 0));
  });

  it('Up / Down keep the column, clamped to a shorter row', () => {
    expect(moveInGrid(rows, at(0, 1), 'ArrowDown')).toEqual(at(1, 1));
    expect(moveInGrid(rows, at(1, 4), 'ArrowDown')).toEqual(at(2, 1));
    expect(moveInGrid(rows, at(1, 4), 'ArrowUp')).toEqual(at(0, 2));
  });

  it('Up / Down stop at the first and last rows', () => {
    expect(moveInGrid(rows, at(0, 1), 'ArrowUp')).toEqual(at(0, 1));
    expect(moveInGrid(rows, at(3, 2), 'ArrowDown')).toEqual(at(3, 2));
  });

  it('Up / Down aim for the preferred (sticky) column when given', () => {
    // From (2, 1), which was reached from column 4: back to column 4 in a long row.
    expect(moveInGrid(rows, at(2, 1), 'ArrowDown', { preferredCol: 4 })).toEqual(at(3, 3));
    expect(moveInGrid(rows, at(2, 1), 'ArrowUp', { preferredCol: 4 })).toEqual(at(1, 4));
  });

  it('Home / End go to the ends of the row; with Ctrl, to the ends of the grid', () => {
    expect(moveInGrid(rows, at(1, 2), 'Home')).toEqual(at(1, 0));
    expect(moveInGrid(rows, at(1, 2), 'End')).toEqual(at(1, 4));
    expect(moveInGrid(rows, at(1, 2), 'Home', { ctrl: true })).toEqual(at(0, 0));
    expect(moveInGrid(rows, at(1, 2), 'End', { ctrl: true })).toEqual(at(3, 3));
  });

  it('returns null for keys the grid leaves to the browser', () => {
    for (const key of ['Tab', 'Enter', ' ', 'Escape', 'a', 'PageDown']) {
      expect(moveInGrid(rows, at(1, 1), key)).toBeNull();
    }
    expect(moveInGrid([], at(0, 0), 'ArrowRight')).toBeNull();
  });

  it('clamps an out-of-range position before moving', () => {
    expect(moveInGrid(rows, at(9, 9), 'ArrowLeft')).toEqual(at(3, 2));
  });
});

describe('splitColumns', () => {
  it('balances item counts plus a heading weight per slot', () => {
    expect(splitColumns([4, 4])).toBe(1);
    expect(splitColumns([10, 1, 1, 1])).toBe(1);
    expect(splitColumns([1, 1, 1, 10])).toBe(3);
  });

  it('splits the real slots after Magic: Weapons, Armor, Magic | Potions to Achievements', () => {
    const split = splitColumns(skills.map(g => g.items.length));
    expect(skills[split].slot).toBe('Potions');
  });

  it('handles a single slot and no slots', () => {
    expect(splitColumns([5])).toBe(0);
    expect(splitColumns([])).toBe(0);
  });
});
