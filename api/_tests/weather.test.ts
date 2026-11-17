// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { handleWeather } from '../weather.js';
import { WeatherService, describeCode, forecastUrl, hourOfDay, parseForecast, readGeo } from '../_lib/weather.js';

const geoHeaders = (extra: Record<string, string> = {}) =>
  new Headers({
    'x-vercel-ip-city': 'Tel%20Aviv',
    'x-vercel-ip-country': 'IL',
    'x-vercel-ip-latitude': '32.08',
    'x-vercel-ip-longitude': '34.78',
    ...extra,
  });

const forecast = (overrides: Record<string, unknown> = {}) => ({
  current: { temperature_2m: 21.4, weather_code: 61, cloud_cover: 89, wind_speed_10m: 8.8, ...overrides },
  daily: { sunrise: ['2026-11-17T06:11'], sunset: ['2026-11-17T16:39'] },
});

const okFetch = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body))) as unknown as typeof fetch;

describe('readGeo', () => {
  it('reads and decodes the Vercel headers', () => {
    expect(readGeo(geoHeaders())).toEqual({ city: 'Tel Aviv', country: 'IL', latitude: 32.08, longitude: 34.78 });
    expect(readGeo(geoHeaders({ 'x-vercel-ip-city': 'S%C3%A3o%20Paulo' }))?.city).toBe('São Paulo');
  });

  it('is null without a plausible position', () => {
    expect(readGeo(new Headers())).toBeNull();
    expect(readGeo(geoHeaders({ 'x-vercel-ip-latitude': 'abc' }))).toBeNull();
    expect(readGeo(geoHeaders({ 'x-vercel-ip-latitude': '91' }))).toBeNull();
    expect(readGeo(geoHeaders({ 'x-vercel-ip-latitude': '0', 'x-vercel-ip-longitude': '0' }))).toBeNull();
  });

  it('cleans hostile place names', () => {
    const geo = readGeo(geoHeaders({ 'x-vercel-ip-city': '%E2%80%AETown%00', 'x-vercel-ip-country': '<b>' }));
    expect(geo?.city).toBe('Town');
    expect(geo?.country).toBeNull();
    expect(Array.from(readGeo(geoHeaders({ 'x-vercel-ip-city': 'x'.repeat(500) }))?.city ?? '')).toHaveLength(60);
    expect(readGeo(geoHeaders({ 'x-vercel-ip-city': '%E0%A4%A' }))?.city).toBe('%E0%A4%A');
  });
});

describe('forecast parsing', () => {
  it('maps WMO codes to what the scene draws', () => {
    expect(describeCode(0).condition).toBe('clear');
    expect(describeCode(2)).toEqual({ condition: 'partly', label: 'Partly cloudy' });
    expect(describeCode(3).condition).toBe('cloudy');
    expect(describeCode(48).condition).toBe('fog');
    expect(describeCode(55).condition).toBe('rain');
    expect(describeCode(82).label).toBe('Rain');
    expect(describeCode(75).condition).toBe('snow');
    expect(describeCode(86).condition).toBe('snow');
    expect(describeCode(96).condition).toBe('storm');
    expect(describeCode(1234).condition).toBe('partly');
  });

  it('reads local times as hours', () => {
    expect(hourOfDay('2026-11-17T06:11')).toBeCloseTo(6.183, 2);
    expect(hourOfDay('nope')).toBeNull();
    expect(hourOfDay(undefined)).toBeNull();
  });

  it('builds a weather object and clamps odd values', () => {
    expect(parseForecast(forecast())).toEqual({
      tempC: 21, condition: 'rain', label: 'Light rain', cloud: 0.89, windKmh: 9, sunrise: 6.18, sunset: 16.65,
    });
    expect(parseForecast(forecast({ cloud_cover: 900, wind_speed_10m: 'x' }))).toMatchObject({ cloud: 1, windKmh: 0 });
  });

  it('rejects incomplete or malformed answers', () => {
    expect(parseForecast(null)).toBeNull();
    expect(parseForecast({})).toBeNull();
    expect(parseForecast(forecast({ temperature_2m: 'warm' }))).toBeNull();
    expect(parseForecast({ ...forecast(), daily: { sunrise: [], sunset: [] } })).toBeNull();
  });

  it('asks Open-Meteo with rounded coordinates', () => {
    const url = new URL(forecastUrl({ latitude: 32.0853, longitude: 34.7818 }));
    expect(url.hostname).toBe('api.open-meteo.com');
    expect(url.searchParams.get('latitude')).toBe('32.09');
    expect(url.searchParams.get('timezone')).toBe('auto');
  });
});

describe('WeatherService', () => {
  it('caches one answer per cell and expires it', async () => {
    let now = 0;
    const fetchImpl = okFetch(forecast());
    const service = new WeatherService(fetchImpl, () => now);
    await service.at({ latitude: 32.08, longitude: 34.78 });
    await service.at({ latitude: 32.11, longitude: 34.8 }); // same 0.1 degree cell
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    now = 21 * 60 * 1000;
    await service.at({ latitude: 32.08, longitude: 34.78 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('answers null when the upstream fails, and does not cache the failure', async () => {
    const failing = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    expect(await new WeatherService(failing).at({ latitude: 1, longitude: 1 })).toBeNull();
    const throwing = vi.fn(async () => {
      throw new Error('network');
    }) as unknown as typeof fetch;
    const service = new WeatherService(throwing);
    expect(await service.at({ latitude: 1, longitude: 1 })).toBeNull();
    await service.at({ latitude: 1, longitude: 1 });
    expect(throwing).toHaveBeenCalledTimes(2);
  });
});

describe('GET /api/weather', () => {
  it('returns the place and the weather, privately cacheable', async () => {
    const response = await handleWeather(
      new Request('https://site.test/api/weather', { headers: geoHeaders() }),
      new WeatherService(okFetch(forecast())),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, max-age=600');
    expect(await response.json()).toMatchObject({ city: 'Tel Aviv', country: 'IL', weather: { condition: 'rain', tempC: 21 } });
  });

  it('still answers 200 with nulls when the position is unknown', async () => {
    const fetchImpl = okFetch(forecast());
    const response = await handleWeather(new Request('https://site.test/api/weather'), new WeatherService(fetchImpl));
    expect(await response.json()).toEqual({ city: null, country: null, weather: null });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
