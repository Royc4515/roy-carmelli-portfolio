import { describe, it, expect } from 'vitest';
import { buildAmbience, dayPhase, isDarkSky, parseWeatherResponse } from './ambience';

const weather = { tempC: 14, condition: 'rain', label: 'Light rain', cloud: 0.9, windKmh: 22, sunrise: 6.2, sunset: 16.65 };

describe('parseWeatherResponse', () => {
  it('accepts a complete answer', () => {
    expect(parseWeatherResponse({ city: ' Tel Aviv ', country: 'IL', weather })).toEqual({ city: 'Tel Aviv', weather });
  });

  it('drops the weather, not the city, when a field is wrong', () => {
    expect(parseWeatherResponse({ city: 'Haifa', weather: { ...weather, condition: 'frogs' } })).toEqual({ city: 'Haifa', weather: null });
    expect(parseWeatherResponse({ city: 'Haifa', weather: { ...weather, sunrise: 20 } }).weather).toBeNull();
    expect(parseWeatherResponse({ city: 42, weather: null })).toEqual({ city: null, weather: null });
    expect(parseWeatherResponse('nope')).toEqual({ city: null, weather: null });
  });

  it('clamps cloud cover and wind', () => {
    expect(parseWeatherResponse({ weather: { ...weather, cloud: 7, windKmh: -3 } }).weather).toMatchObject({ cloud: 1, windKmh: 0 });
  });
});

describe('dayPhase', () => {
  it('names the part of the day from sunrise and sunset', () => {
    const phase = (hour: number) => dayPhase(hour, 6, 18);
    expect(phase(3)).toBe('Night');
    expect(phase(6.2)).toBe('Dawn');
    expect(phase(9)).toBe('Morning');
    expect(phase(13)).toBe('Midday');
    expect(phase(16)).toBe('Afternoon');
    expect(phase(17.5)).toBe('Golden hour');
    expect(phase(18.3)).toBe('Dusk');
    expect(phase(20)).toBe('Evening');
    expect(phase(23.5)).toBe('Night');
  });

  it('has no midday on a short winter day that is already near sunset', () => {
    expect(dayPhase(14.5, 8, 15)).toBe('Golden hour');
  });
});

describe('buildAmbience', () => {
  const afternoon = new Date(2026, 10, 17, 14, 30); // Tuesday 17 November 2026

  it('falls back to a clear sky on the device clock', () => {
    const info = buildAmbience(afternoon, 'live', null, null);
    expect(info.ambience).toMatchObject({ hour: 14.5, sunrise: 6, sunset: 18, condition: 'clear', festive: null });
    expect(info.time).toBe('14:30');
    expect(info.dark).toBe(false);
  });

  it('uses the live weather and its sunset', () => {
    const info = buildAmbience(new Date(2026, 10, 17, 17, 30), 'live', 'Tel Aviv', weather as never);
    expect(info.ambience).toMatchObject({ condition: 'rain', cloud: 0.9, wind: 22, sunset: 16.65 });
    expect(info.dark).toBe(true);
    expect(info.phase).toBe('Evening');
  });

  it('lets the visitor force day or night without changing the reported time', () => {
    const night = buildAmbience(afternoon, 'night', null, null);
    expect(night.ambience.hour).toBe(23.5);
    expect(night.dark).toBe(true);
    expect(night.time).toBe('14:30');
    expect(buildAmbience(new Date(2026, 10, 17, 2, 0), 'day', null, null).dark).toBe(false);
  });

  it('carries the festive day to the scene', () => {
    const info = buildAmbience(new Date(2026, 11, 7, 12, 0), 'live', null, null);
    expect(info.ambience).toMatchObject({ festive: 'hanukkah', festiveCount: 3 });
    expect(info.festive?.label).toBe('Hanukkah, day 3');
  });

  it('switches the interface with the sun', () => {
    expect(isDarkSky(5.5, 6, 18)).toBe(true);
    expect(isDarkSky(6.1, 6, 18)).toBe(false);
    expect(isDarkSky(18.1, 6, 18)).toBe(false);
    expect(isDarkSky(18.5, 6, 18)).toBe(true);
  });
});
