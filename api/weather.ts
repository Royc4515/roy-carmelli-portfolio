import { json } from './_lib/http.js';
import { WeatherService, readGeo } from './_lib/weather.js';

/** Lives as long as the function instance: a warm instance answers repeat cities from memory. */
const service = new WeatherService();

/**
 * GET /api/weather: the visitor's city (from Vercel's geolocation headers) and its current
 * weather, for the live sky of the voxel scene. Always 200: with no position or no upstream
 * answer the fields are null and the page falls back to the device clock and a clear sky.
 */
export async function handleWeather(request: Request, weatherService: WeatherService): Promise<Response> {
  const geo = readGeo(request.headers);
  const weather = geo ? await weatherService.at(geo) : null;
  return json(
    { city: geo?.city ?? null, country: geo?.country ?? null, weather },
    200,
    // Per visitor (it depends on their IP), so never a shared cache; the browser may keep it.
    { 'Cache-Control': 'private, max-age=600' },
  );
}

export const GET = (request: Request) => handleWeather(request, service);
