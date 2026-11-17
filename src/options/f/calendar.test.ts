import { describe, it, expect } from 'vitest';
import { festiveFor, hebrewDate } from './calendar';

/** A local date at a given hour (months are 1-based here). */
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

describe('hebrewDate', () => {
  it('reads the Hebrew calendar from Intl', () => {
    expect(hebrewDate(at(2026, 12, 5))).toEqual({ day: 25, month: 'Kislev' });
    expect(hebrewDate(at(2027, 3, 23))).toEqual({ day: 14, month: 'Adar II' });
  });
});

describe('festiveFor', () => {
  it('counts the days of Hanukkah across the month end', () => {
    expect(festiveFor(at(2026, 12, 4))).toBeNull(); // a Friday morning, the day before
    expect(festiveFor(at(2026, 12, 5))).toEqual({ key: 'hanukkah', label: 'Hanukkah, day 1', count: 1 });
    expect(festiveFor(at(2026, 12, 12))?.count).toBe(8);
    expect(festiveFor(at(2026, 12, 13))?.key).not.toBe('hanukkah');
  });

  it('puts Purim in Adar II in a leap year, not in Adar I', () => {
    expect(festiveFor(at(2027, 3, 23))?.key).toBe('purim');
    expect(festiveFor(at(2027, 2, 21))).toBeNull(); // 14 Adar I 5787, a Sunday
    expect(festiveFor(at(2026, 3, 3))?.key).toBe('purim'); // 14 Adar 5786, not a leap year
  });

  it('covers the seven days of Sukkot', () => {
    expect(festiveFor(at(2026, 9, 26))?.key).toBe('sukkot');
    expect(festiveFor(at(2026, 10, 2))?.key).toBe('sukkot');
    expect(festiveFor(at(2026, 10, 5))).toBeNull(); // a Monday after the festival
  });

  it('follows the official shifts of Independence Day', () => {
    expect(festiveFor(at(2027, 5, 12))?.key).toBe('independence'); // 5 Iyar on a Wednesday: no shift
    // 5 Iyar 5788 is Monday 1 May 2028: observed on Tuesday 2 May.
    expect(festiveFor(at(2028, 5, 1))).toBeNull();
    expect(festiveFor(at(2028, 5, 2))?.key).toBe('independence');
    // 5 Iyar 5785 was Saturday 3 May 2025: observed on Thursday 1 May.
    expect(festiveFor(at(2025, 5, 1))?.key).toBe('independence');
    expect(festiveFor(at(2025, 5, 3, 10))?.key).toBe('shabbat');
  });

  it('keeps Shabbat by the local sunset', () => {
    // Friday 20 November 2026, sunset 16:39 (16.65).
    expect(festiveFor(at(2026, 11, 20, 15, 0), 16.65)).toBeNull();
    expect(festiveFor(at(2026, 11, 20, 16, 30), 16.65)?.key).toBe('shabbat');
    expect(festiveFor(at(2026, 11, 21, 10, 0), 16.65)?.key).toBe('shabbat');
    expect(festiveFor(at(2026, 11, 21, 17, 10), 16.65)?.key).toBe('shabbat');
    expect(festiveFor(at(2026, 11, 21, 17, 30), 16.65)).toBeNull();
  });

  it('is null on an ordinary weekday', () => {
    expect(festiveFor(at(2026, 11, 17))).toBeNull();
  });
});
