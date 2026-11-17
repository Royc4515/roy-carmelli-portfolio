import { useEffect, useMemo, useState } from 'react';
import { festiveFor, type Festive, type FestiveDay } from './calendar';

/**
 * The live "ambience" of the voxel scene: the visitor's local time, the weather in their city
 * and any special day. The clock is the device's own; the city and the weather come from
 * /api/weather. Every part degrades on its own: no API (local dev, a blocked request) leaves
 * a clear sky at the right time of day.
 */

export type Condition = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

/** What the engine draws from. Mirrors `Ambience` in engine.ts (same shape, checked by tsc). */
export interface Ambience {
  hour: number;
  sunrise: number;
  sunset: number;
  condition: Condition;
  cloud: number;
  wind: number;
  festive: Festive | null;
  festiveCount: number;
}

export interface LiveWeather {
  tempC: number;
  condition: Condition;
  label: string;
  cloud: number;
  windKmh: number;
  sunrise: number;
  sunset: number;
}

/** `live` follows the clock; `day` and `night` are the visitor's manual choice. */
export type SkyMode = 'live' | 'day' | 'night';

export interface AmbienceInfo {
  ambience: Ambience;
  /** For the page's ambience card. */
  city: string | null;
  time: string;
  /** "Tuesday, 17 November" and, where the browser has the calendar, "7 Kislev 5787". */
  date: string;
  /** "Tue 17 Nov", for the collapsed bar. */
  dateShort: string;
  hebrewDate: string | null;
  phase: string;
  /** "06:11" and "16:39": only with live weather (the defaults would be invented times). */
  sunrise: string | null;
  sunset: string | null;
  weather: LiveWeather | null;
  festive: FestiveDay | null;
  /** True when the sun is down in the drawn sky: the interface then uses its dark tokens. */
  dark: boolean;
}

const DEFAULT_SUNRISE = 6;
const DEFAULT_SUNSET = 18;
const CONDITIONS: readonly Condition[] = ['clear', 'partly', 'cloudy', 'fog', 'rain', 'snow', 'storm'];

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** The API answer, re-checked on the client: a bad field drops the weather, never the page. */
export function parseWeatherResponse(body: unknown): { city: string | null; weather: LiveWeather | null } {
  if (typeof body !== 'object' || body === null) return { city: null, weather: null };
  const { city, country, weather } = body as { city?: unknown; country?: unknown; weather?: unknown };
  const name = typeof city === 'string' && city.trim() ? city.trim().slice(0, 60) : null;
  // "Tel Aviv, IL": the country code only as a suffix to a known city.
  const place = name && typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? `${name}, ${country}` : name;
  if (typeof weather !== 'object' || weather === null) return { city: place, weather: null };
  const w = weather as Record<string, unknown>;
  const tempC = num(w.tempC);
  const sunrise = num(w.sunrise);
  const sunset = num(w.sunset);
  const condition = CONDITIONS.find(c => c === w.condition);
  if (tempC === null || sunrise === null || sunset === null || !condition || sunrise >= sunset) {
    return { city: place, weather: null };
  }
  return {
    city: place,
    weather: {
      tempC,
      condition,
      label: typeof w.label === 'string' ? w.label.slice(0, 40) : '',
      cloud: Math.min(1, Math.max(0, num(w.cloud) ?? 0)),
      windKmh: Math.max(0, num(w.windKmh) ?? 0),
      sunrise,
      sunset,
    },
  };
}

/** A name for the part of the day, from the hour and that day's sunrise and sunset. */
export function dayPhase(hour: number, sunrise: number, sunset: number): string {
  if (hour < sunrise - 0.75) return 'Night';
  if (hour < sunrise + 0.75) return 'Dawn';
  if (hour < 11) return 'Morning';
  if (hour < 15 && hour < sunset - 1) return 'Midday';
  if (hour < sunset - 1) return 'Afternoon';
  if (hour < sunset) return 'Golden hour';
  if (hour < sunset + 0.75) return 'Dusk';
  if (hour < 22.5) return 'Evening';
  return 'Night';
}

/** Dark interface once the sun is a little under the horizon. */
export const isDarkSky = (hour: number, sunrise: number, sunset: number) => hour < sunrise - 0.2 || hour > sunset + 0.25;

/**
 * `?hour=18.5` previews the sky at another time of day (the engine reads the same flag), so
 * the line of text and the interface's dark tokens must follow it too.
 */
function previewHour(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('hour');
  const hour = raw === null ? NaN : Number(raw);
  return Number.isFinite(hour) && hour >= 0 && hour < 24 ? hour : null;
}

const shortDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const weekdayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
const dayAndMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' });
/** "Tuesday, 17 November": built from parts, because locales disagree about the comma. */
const dateLine = { format: (date: Date) => `${weekdayName.format(date)}, ${dayAndMonth.format(date)}` };

let hebrewFormat: Intl.DateTimeFormat | null | undefined;
/** "7 Kislev 5787", or null where the runtime has no Hebrew calendar. */
function hebrewLine(date: Date): string | null {
  if (hebrewFormat === undefined) {
    try {
      hebrewFormat = new Intl.DateTimeFormat('en-GB-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
      if (hebrewFormat.resolvedOptions().calendar !== 'hebrew') hebrewFormat = null;
    } catch {
      hebrewFormat = null;
    }
  }
  return hebrewFormat ? hebrewFormat.format(date) : null;
}

/** 16.65 -> "16:39". */
function clockOf(hours: number): string {
  const total = Math.round(hours * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const PREVIEW_LABELS: Record<Festive, string> = {
  hanukkah: 'Hanukkah',
  purim: 'Purim',
  sukkot: 'Sukkot',
  independence: 'Independence Day',
  shabbat: 'Shabbat',
  birthday: "Roy's birthday",
};

/** `?fest=purim` previews a special day in the scene; the line of text names it too. */
function previewFestive(): FestiveDay | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const key = params.get('fest') as Festive | null;
  if (!key || !(key in PREVIEW_LABELS)) return null;
  const count = key === 'hanukkah' ? Math.min(8, Math.max(1, Math.round(Number(params.get('festn')) || 4))) : 0;
  return { key, label: count ? `Hanukkah, day ${count}` : PREVIEW_LABELS[key], count };
}

const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Everything the scene and the info line need, assembled for one moment. */
export function buildAmbience(now: Date, mode: SkyMode, city: string | null, weather: LiveWeather | null): AmbienceInfo {
  const sunrise = weather?.sunrise ?? DEFAULT_SUNRISE;
  const sunset = weather?.sunset ?? DEFAULT_SUNSET;
  const liveHour = previewHour() ?? now.getHours() + now.getMinutes() / 60;
  // A manual choice shows the middle of the day, or deep night, whatever the clock says.
  const hour = mode === 'day' ? (sunrise + sunset) / 2 : mode === 'night' ? 23.5 : liveHour;
  const festive = previewFestive() ?? festiveFor(now, sunset);
  return {
    ambience: {
      hour,
      sunrise,
      sunset,
      condition: weather?.condition ?? 'clear',
      cloud: weather?.cloud ?? 0,
      wind: weather?.windKmh ?? 6,
      festive: festive?.key ?? null,
      festiveCount: festive?.count ?? 0,
    },
    city,
    date: dateLine.format(now),
    dateShort: shortDate.format(now).replace(',', ''),
    hebrewDate: hebrewLine(now),
    sunrise: weather ? clockOf(weather.sunrise) : null,
    sunset: weather ? clockOf(weather.sunset) : null,
    time: previewHour() === null ? clock.format(now) : clock.format(new Date(2000, 0, 1, Math.floor(liveHour), Math.round((liveHour % 1) * 60))),
    phase: dayPhase(liveHour, sunrise, sunset),
    weather,
    festive,
    dark: isDarkSky(hour, sunrise, sunset),
  };
}

const REQUEST_TIMEOUT_MS = 5000;
const CLOCK_TICK_MS = 20_000;
const WEATHER_REFRESH_MS = 20 * 60 * 1000;

/** The live ambience, refreshed with the clock (and the weather every 20 minutes). */
export function useAmbience(mode: SkyMode): AmbienceInfo {
  const [now, setNow] = useState(() => new Date());
  const [live, setLive] = useState<{ city: string | null; weather: LiveWeather | null }>({ city: null, weather: null });

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    // jsdom (tests, the build's prerender) has no network to ask.
    if (typeof fetch !== 'function' || typeof AbortController === 'undefined') return;
    let cancelled = false;
    const load = () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      fetch('/api/weather', { signal: controller.signal, headers: { Accept: 'application/json' } })
        .then(response => (response.ok ? response.json() : null))
        .then(body => {
          if (!cancelled && body) setLive(parseWeatherResponse(body));
        })
        // Offline, blocked, or no /api in local dev: keep the clock-only sky.
        .catch(() => {})
        .finally(() => window.clearTimeout(timer));
    };
    load();
    const refresh = window.setInterval(load, WEATHER_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, []);

  return useMemo(() => buildAmbience(now, mode, live.city, live.weather), [now, mode, live]);
}
