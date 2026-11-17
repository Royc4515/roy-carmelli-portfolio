/**
 * Live weather for the visitor's city, for the voxel scene's sky (src/options/f). The place
 * comes from the geolocation headers Vercel adds to every request (city level, from the IP);
 * the weather from Open-Meteo, which needs no key. Nothing about the visitor is stored or
 * logged: the coordinates are used for one upstream request and forgotten.
 */

export type Condition = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

export interface Geo {
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

export interface Weather {
  tempC: number;
  condition: Condition;
  /** Short English label for the page, e.g. "Light rain". */
  label: string;
  /** Cloud cover, 0 to 1. */
  cloud: number;
  windKmh: number;
  /** Local sunrise and sunset as hours of the day, e.g. 6.18 and 16.65. */
  sunrise: number;
  sunset: number;
}

const MAX_PLACE_LENGTH = 60;

/** A header value that names a place: decoded, control characters removed, length capped. */
function placeName(raw: string | null): string | null {
  if (!raw) return null;
  let text = raw;
  try {
    // Vercel percent-encodes non-ASCII city names ("S%C3%A3o%20Paulo").
    text = decodeURIComponent(raw);
  } catch {
    // Not valid percent-encoding: use it as sent.
  }
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '').trim();
  return text ? Array.from(text).slice(0, MAX_PLACE_LENGTH).join('') : null;
}

/** The visitor's rough position, or null when the headers are missing or not plausible. */
export function readGeo(headers: Headers): Geo | null {
  const latitude = Number(headers.get('x-vercel-ip-latitude') ?? NaN);
  const longitude = Number(headers.get('x-vercel-ip-longitude') ?? NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  // (0, 0) is what an unknown IP sometimes resolves to: open sea, not a visitor.
  if (latitude === 0 && longitude === 0) return null;
  const country = placeName(headers.get('x-vercel-ip-country'));
  return {
    city: placeName(headers.get('x-vercel-ip-city')),
    country: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null,
    latitude,
    longitude,
  };
}

/** WMO weather interpretation codes, as Open-Meteo reports them, folded into what the scene draws. */
export function describeCode(code: number): { condition: Condition; label: string } {
  if (code === 0) return { condition: 'clear', label: 'Clear' };
  if (code === 1) return { condition: 'partly', label: 'Mostly clear' };
  if (code === 2) return { condition: 'partly', label: 'Partly cloudy' };
  if (code === 3) return { condition: 'cloudy', label: 'Overcast' };
  if (code === 45 || code === 48) return { condition: 'fog', label: 'Fog' };
  if (code >= 51 && code <= 57) return { condition: 'rain', label: 'Drizzle' };
  if (code === 61 || code === 80) return { condition: 'rain', label: 'Light rain' };
  if ((code >= 63 && code <= 67) || code === 81 || code === 82) return { condition: 'rain', label: 'Rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { condition: 'snow', label: 'Snow' };
  if (code >= 95 && code <= 99) return { condition: 'storm', label: 'Thunderstorm' };
  // An unknown code: say nothing false, draw a neutral sky.
  return { condition: 'partly', label: 'Partly cloudy' };
}

/** "2026-11-17T06:11" -> 6.18. Null when the text is not an ISO local time. */
export function hourOfDay(iso: unknown): number | null {
  if (typeof iso !== 'string') return null;
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return null;
  const hours = Number(match[1]) + Number(match[2]) / 60;
  return hours >= 0 && hours < 24 ? hours : null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Open-Meteo's answer, checked field by field. Null when anything the scene needs is missing. */
export function parseForecast(body: unknown): Weather | null {
  if (typeof body !== 'object' || body === null) return null;
  const { current, daily } = body as { current?: Record<string, unknown>; daily?: Record<string, unknown> };
  if (!current || !daily) return null;
  const temp = Number(current.temperature_2m);
  const code = Number(current.weather_code);
  if (!Number.isFinite(temp) || !Number.isInteger(code)) return null;
  const sunrise = hourOfDay(Array.isArray(daily.sunrise) ? daily.sunrise[0] : null);
  const sunset = hourOfDay(Array.isArray(daily.sunset) ? daily.sunset[0] : null);
  // Polar day and night have no sunrise or sunset: the client then uses its own defaults.
  if (sunrise === null || sunset === null || sunrise >= sunset) return null;
  const cloud = Number(current.cloud_cover);
  const wind = Number(current.wind_speed_10m);
  return {
    tempC: Math.round(clamp(temp, -90, 60)),
    ...describeCode(code),
    cloud: Number.isFinite(cloud) ? clamp(cloud / 100, 0, 1) : 0,
    windKmh: Number.isFinite(wind) ? Math.round(clamp(wind, 0, 200)) : 0,
    sunrise: Math.round(sunrise * 100) / 100,
    sunset: Math.round(sunset * 100) / 100,
  };
}

export function forecastUrl({ latitude, longitude }: Pick<Geo, 'latitude' | 'longitude'>): string {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(2),
    longitude: longitude.toFixed(2),
    current: 'temperature_2m,weather_code,cloud_cover,wind_speed_10m',
    daily: 'sunrise,sunset',
    timezone: 'auto',
    forecast_days: '1',
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/** One answer per ~11 km cell for 20 minutes: weather does not change faster than that. */
const CACHE_MS = 20 * 60 * 1000;
const CACHE_MAX = 500;
const UPSTREAM_TIMEOUT_MS = 4000;

export class WeatherService {
  private cache = new Map<string, { at: number; weather: Weather }>();

  constructor(
    private fetchImpl: typeof fetch = fetch,
    private now: () => number = Date.now,
  ) {}

  /** The current weather at a position, or null when the upstream is slow, down or odd. */
  async at(geo: Pick<Geo, 'latitude' | 'longitude'>): Promise<Weather | null> {
    const key = `${geo.latitude.toFixed(1)},${geo.longitude.toFixed(1)}`;
    const hit = this.cache.get(key);
    if (hit && this.now() - hit.at < CACHE_MS) return hit.weather;
    try {
      const response = await this.fetchImpl(forecastUrl(geo), { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
      if (!response.ok) return null;
      const weather = parseForecast(await response.json());
      if (!weather) return null;
      // Bounded: drop the oldest cell when full (Map keeps insertion order).
      if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value as string);
      this.cache.set(key, { at: this.now(), weather });
      return weather;
    } catch {
      return null;
    }
  }
}
