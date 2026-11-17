/**
 * Special days the voxel scene dresses up for. The Hebrew date comes from the browser's own
 * calendar support (`Intl` with the Hebrew calendar), so there is no API and no table of
 * dates to maintain. To add a day, add a rule to `festiveFor`.
 */

export type Festive = 'hanukkah' | 'purim' | 'sukkot' | 'independence' | 'shabbat' | 'birthday';

export interface FestiveDay {
  key: Festive;
  /** Shown in the page's ambience line. */
  label: string;
  /** Hanukkah: which day, 1 to 8 (the number of candles). 0 for the others. */
  count: number;
}

interface HebrewDate {
  day: number;
  /** As Intl names it in English: "Tishri", "Kislev", "Adar", "Adar I", "Adar II", "Iyar"... */
  month: string;
}

const DAY_MS = 86_400_000;
let formatter: Intl.DateTimeFormat | null | undefined;

/** The Hebrew date of a civil day, or null where the runtime has no Hebrew calendar. */
export function hebrewDate(date: Date): HebrewDate | null {
  if (formatter === undefined) {
    try {
      formatter = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long' });
      // Some runtimes accept the locale and silently fall back to the Gregorian calendar.
      if (formatter.resolvedOptions().calendar !== 'hebrew') formatter = null;
    } catch {
      formatter = null;
    }
  }
  if (!formatter) return null;
  const parts = formatter.formatToParts(date);
  const day = Number(parts.find(p => p.type === 'day')?.value);
  const month = parts.find(p => p.type === 'month')?.value ?? '';
  return Number.isInteger(day) && month ? { day, month } : null;
}

const is = (h: HebrewDate | null, month: string, day: number) => !!h && h.month === month && h.day === day;

/**
 * Israel moves Independence Day off Friday, Shabbat and Monday (so that neither it nor
 * Memorial Day before it touches Shabbat): 5 Iyar on Friday or Saturday is observed on the
 * Thursday before, on Monday it is observed on Tuesday.
 */
function isIndependenceDay(date: Date): boolean {
  for (const offset of [-1, 0, 1, 2]) {
    const fifth = new Date(date.getTime() + offset * DAY_MS);
    if (!is(hebrewDate(fifth), 'Iyar', 5)) continue;
    const weekday = fifth.getDay();
    const shift = weekday === 5 ? -1 : weekday === 6 ? -2 : weekday === 1 ? 1 : 0;
    return offset === -shift;
  }
  return false;
}

/** Day 1 to 8 of Hanukkah (it starts on 25 Kislev and runs into Tevet), or 0. */
function hanukkahDay(date: Date): number {
  for (let back = 0; back < 8; back++) {
    if (is(hebrewDate(new Date(date.getTime() - back * DAY_MS)), 'Kislev', 25)) return back + 1;
  }
  return 0;
}

/**
 * Shabbat by the visitor's own sunset: from 18 minutes before sunset on Friday (candle
 * lighting) until 40 minutes after sunset on Saturday.
 */
function isShabbat(date: Date, sunsetHour: number): boolean {
  const hour = date.getHours() + date.getMinutes() / 60;
  const weekday = date.getDay();
  return (weekday === 5 && hour >= sunsetHour - 0.3) || (weekday === 6 && hour < sunsetHour + 0.67);
}

/**
 * Roy's birthday is kept on the civil date, 29 July. The Hebrew date he was born on is 9 Av,
 * a fast day, so there is nothing to celebrate then: if 29 July itself falls on the fast (9 Av,
 * or 10 Av on a Sunday when the fast is put off from Shabbat), the scene stays plain.
 */
function isBirthday(date: Date, hebrew: HebrewDate | null): boolean {
  if (date.getMonth() !== 6 || date.getDate() !== 29) return false;
  const fast = is(hebrew, 'Av', 9) || (is(hebrew, 'Av', 10) && date.getDay() === 0);
  return !fast;
}

/**
 * What the scene celebrates at `date` (the visitor's local time), or null on an ordinary day.
 * A holiday wins over Shabbat when both apply; Shabbat wins over the birthday (its candles
 * are a cake's, and those wait until after Shabbat).
 */
export function festiveFor(date: Date, sunsetHour = 18): FestiveDay | null {
  // Noon of the same civil day: the Hebrew date must not flip with the clock's time zone edge.
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const hebrew = hebrewDate(noon);
  const candles = hanukkahDay(noon);
  if (candles) return { key: 'hanukkah', label: `Hanukkah, day ${candles}`, count: candles };
  // In a leap year Purim is in Adar II; "Adar I" has none.
  if (is(hebrew, 'Adar', 14) || is(hebrew, 'Adar II', 14)) return { key: 'purim', label: 'Purim', count: 0 };
  if (hebrew?.month === 'Tishri' && hebrew.day >= 15 && hebrew.day <= 21) return { key: 'sukkot', label: 'Sukkot', count: 0 };
  if (isIndependenceDay(noon)) return { key: 'independence', label: 'Independence Day', count: 0 };
  if (isShabbat(date, sunsetHour)) return { key: 'shabbat', label: 'Shabbat', count: 0 };
  if (isBirthday(noon, hebrew)) return { key: 'birthday', label: "Roy's birthday", count: 0 };
  return null;
}
