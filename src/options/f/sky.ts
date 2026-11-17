/**
 * The sky's look for a moment in time and a kind of weather: pure numbers, no WebGL. The
 * engine eases from the look it is showing to the look it is asked for, so a change of hour,
 * weather or a forced day/night never pops.
 */

export type Condition = 'clear' | 'partly' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';
export type Festive = 'hanukkah' | 'purim' | 'sukkot' | 'independence' | 'shabbat' | 'birthday';

export interface Ambience {
  /** Local time of day in hours, 0 to 24 (e.g. 21.7). */
  hour: number;
  /** Local sunrise and sunset in hours (e.g. 6.2 and 16.65). Always sunrise < sunset. */
  sunrise: number;
  sunset: number;
  condition: Condition;
  /** Cloud cover 0 to 1, wind in km/h (0 to about 80). */
  cloud: number;
  wind: number;
  /** A special day's decoration, or null. `festiveCount` is the Hanukkah day, 1 to 8. */
  festive: Festive | null;
  festiveCount: number;
}

type V3 = [number, number, number];

/** Everything the renderer needs. Every field is a number or a list of numbers, so one loop eases it. */
export interface Look {
  top: V3;
  bottom: V3;
  /** Colour of the glow on the horizon under the sun, and where it sits (screen 0..1). */
  glow: V3;
  key: V3;
  skyAmb: V3;
  groundAmb: V3;
  lamp: V3;
  /** Direction towards the light (sun by day, moon by night). Normalise after easing. */
  light: V3;
  sun: [number, number];
  sunCol: V3;
  sunVis: number;
  moon: [number, number];
  moonVis: number;
  stars: number;
  /** 0 by day, 1 at night: for things that glow in the dark (fireflies, flames, the lamp). */
  night: number;
  /** How much of the cloud pool is out (0..1), how big, and its colour. */
  cloud: number;
  cloudScale: number;
  cloudTint: V3;
  rain: number;
  snow: number;
  /** Low mist: brings the fog in and adds ground-hugging wisps. */
  mist: number;
  storm: number;
  fogNear: number;
  fogFar: number;
  /** Colour multiplier for the ground and props: wet ground is darker and cooler. */
  tint: V3;
  /** Wind as a signed drift speed for clouds and the slant of rain. */
  wind: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

interface Key {
  /** Sun elevation, -1 (deepest night) to 1 (solar noon). */
  e: number;
  top: V3;
  bottom: V3;
  glow: V3;
  key: V3;
  skyAmb: V3;
  groundAmb: V3;
  stars: number;
}

/**
 * The sky through a day, keyed by the sun's elevation. Night is deep blue, never black: the
 * islands must stay readable as silhouettes. Twilight keeps its colour (no grey): the horizon
 * goes orange, the zenith stays blue, and violet sits between them.
 */
const KEYS: Key[] = [
  { e: -1, top: [0.015, 0.03, 0.1], bottom: [0.07, 0.11, 0.27], glow: [0, 0, 0], key: [0.4, 0.48, 0.8], skyAmb: [0.12, 0.16, 0.32], groundAmb: [0.05, 0.05, 0.09], stars: 1 },
  { e: -0.3, top: [0.025, 0.045, 0.14], bottom: [0.1, 0.14, 0.32], glow: [0.1, 0.06, 0.12], key: [0.38, 0.45, 0.76], skyAmb: [0.13, 0.17, 0.33], groundAmb: [0.05, 0.05, 0.09], stars: 0.95 },
  { e: -0.1, top: [0.06, 0.1, 0.27], bottom: [0.33, 0.27, 0.46], glow: [0.75, 0.32, 0.26], key: [0.3, 0.33, 0.55], skyAmb: [0.17, 0.19, 0.36], groundAmb: [0.07, 0.06, 0.1], stars: 0.45 },
  { e: 0, top: [0.17, 0.27, 0.58], bottom: [0.96, 0.6, 0.42], glow: [1.0, 0.5, 0.2], key: [1.0, 0.56, 0.3], skyAmb: [0.25, 0.25, 0.4], groundAmb: [0.12, 0.09, 0.08], stars: 0.06 },
  { e: 0.13, top: [0.25, 0.46, 0.82], bottom: [0.99, 0.82, 0.6], glow: [0.9, 0.6, 0.25], key: [1.7, 1.18, 0.72], skyAmb: [0.27, 0.32, 0.46], groundAmb: [0.14, 0.11, 0.09], stars: 0 },
  { e: 0.38, top: [0.3, 0.56, 0.9], bottom: [0.78, 0.9, 0.97], glow: [0.2, 0.18, 0.1], key: [1.55, 1.42, 1.18], skyAmb: [0.27, 0.35, 0.5], groundAmb: [0.13, 0.12, 0.1], stars: 0 },
  { e: 1, top: [0.2, 0.5, 0.93], bottom: [0.7, 0.87, 0.98], glow: [0.08, 0.08, 0.06], key: [1.6, 1.5, 1.3], skyAmb: [0.28, 0.36, 0.52], groundAmb: [0.13, 0.12, 0.1], stars: 0 },
];

function keyAt(e: number): Key {
  let i = 0;
  while (i < KEYS.length - 2 && e > KEYS[i + 1].e) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = clamp01((e - a.e) / (b.e - a.e));
  return {
    e,
    top: mix(a.top, b.top, t), bottom: mix(a.bottom, b.bottom, t), glow: mix(a.glow, b.glow, t),
    key: mix(a.key, b.key, t), skyAmb: mix(a.skyAmb, b.skyAmb, t), groundAmb: mix(a.groundAmb, b.groundAmb, t),
    stars: lerp(a.stars, b.stars, t),
  };
}

/** How heavy the sky is for each condition (0 open sky, 1 a lid of cloud). */
const OVERCAST: Record<Condition, number> = { clear: 0, partly: 0.3, cloudy: 0.8, fog: 0.65, rain: 0.9, snow: 0.8, storm: 1 };

const luma = (c: V3) => c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15;

/**
 * The look for `a`. `wide` is the desktop composition (the scene in the right half, beside the
 * text); otherwise the scene fills the canvas, as in the phone's top band.
 */
export function lookFor(a: Ambience, wide: boolean): Look {
  const sunrise = Math.min(a.sunrise, a.sunset - 1);
  const sunset = Math.max(a.sunset, sunrise + 1);
  const hour = ((a.hour % 24) + 24) % 24;
  const isDay = hour >= sunrise && hour <= sunset;
  /** 0 at rise, 1 at set (by day); 0 at set, 1 at rise (by night). */
  let across: number;
  let e: number;
  if (isDay) {
    across = (hour - sunrise) / (sunset - sunrise);
    e = Math.sin(Math.PI * across);
  } else {
    const night = 24 - (sunset - sunrise);
    const since = hour > sunset ? hour - sunset : hour + 24 - sunset;
    across = since / night;
    e = -Math.sin(Math.PI * across);
  }
  const k = keyAt(e);
  const morning = isDay ? across < 0.5 : across > 0.5;
  // Dawn is pinker than dusk: the same orange would make sunrise and sunset one picture.
  const twilight = 1 - smooth(0.02, 0.3, Math.abs(e));
  if (morning) {
    k.glow = mix(k.glow, [k.glow[0], k.glow[1] * 0.92, k.glow[2] + 0.16 * luma(k.glow)], twilight);
    k.bottom = mix(k.bottom, [k.bottom[0], k.bottom[1] * 0.97, Math.min(1, k.bottom[2] * 1.1 + 0.02)], twilight);
  }

  // Where the sun and the moon are on screen: an arc from one side to the other. On desktop
  // the arc lives right of the text panel; on phones it spans the canvas.
  const x0 = wide ? 0.5 : 0.1, x1 = wide ? 0.95 : 0.9;
  const base = wide ? 0.4 : 0.44, rise = wide ? 0.48 : 0.46;
  const sunAcross = isDay ? across : hour > sunset ? 1 : 0;
  const moonAcross = isDay ? (across < 0.5 ? 1 : 0) : across;
  const sunE = isDay ? e : e * 0.5; // sinks a little below the horizon line, then is hidden
  const moonE = isDay ? -0.2 : -e;
  const sun: [number, number] = [lerp(x0, x1, sunAcross), base + sunE * rise];
  const moon: [number, number] = [lerp(x0, x1, moonAcross), base + moonE * rise * 0.92];
  const night = smooth(0.08, -0.14, e);

  // The key light comes from wherever the bright thing in the sky is, and always a little from
  // the camera's side, so the faces we look at are never all in shade.
  const lightAcross = isDay ? across : moonAcross;
  const lightE = isDay ? e : -e;
  const light: V3 = [lerp(-0.85, 0.85, lightAcross), Math.max(0.2, lightE * 1.05), 0.55];
  // At the horizon the sun hands over to the moon: dim the key there so the swap of direction
  // is not seen as a jump of every shadow.
  const handover = smooth(0, 0.07, Math.abs(e));
  let key = scale(k.key, 0.25 + 0.75 * handover);

  const o = Math.max(OVERCAST[a.condition], a.condition === 'clear' || a.condition === 'partly' ? clamp01(a.cloud) * 0.45 : 0);
  // Overcast: the sky loses saturation towards a blue-grey of its own brightness, the key light
  // flattens and cools, the ambient lifts a little (cloud is a big soft light).
  // At night a lid of cloud is slate blue, not black: it still catches a little light.
  const floor: V3 = isDay ? [0.03, 0.03, 0.03] : [0.045, 0.06, 0.1];
  const grey = (c: V3): V3 => {
    const g = scale([0.86, 0.9, 0.97], luma(c));
    return [g[0] + floor[0], g[1] + floor[1], g[2] + floor[2]];
  };
  const top = mix(k.top, grey(k.top), o * 0.8);
  const bottom = mix(k.bottom, grey(k.bottom), o * 0.85);
  key = mix(key, scale([0.92, 0.96, 1.05], luma(key)), o * 0.7);
  key = scale(key, 1 - o * 0.55);
  const skyAmb = scale(mix(k.skyAmb, scale([0.9, 0.95, 1.05], luma(k.skyAmb)), o * 0.5), 1 + o * 0.22);
  const groundAmb = scale(k.groundAmb, 1 + o * 0.15);

  const rain = a.condition === 'rain' ? 0.6 : a.condition === 'storm' ? 1 : 0;
  const snow = a.condition === 'snow' ? 1 : 0;
  const mist = a.condition === 'fog' ? 1 : 0;
  // The camera is about 540 units from Roy: mist veils him lightly and swallows the islands behind.
  // don't touch / fogNear stays near or beyond that distance outside real fog: in rain and
  // snow Roy and his island must stay crisp, and only the islands behind fade.
  const fogNear = mist ? 300 : rain ? lerp(520, 470, rain) : snow ? 500 : 640;
  const fogFar = mist ? 1050 : rain ? lerp(1500, 1250, rain) : snow ? 1350 : 1750;
  const cloudAmount =
    a.condition === 'clear' ? clamp01(a.cloud) * 0.25
    : a.condition === 'partly' ? 0.3 + clamp01(a.cloud) * 0.3
    : a.condition === 'fog' ? 0.5
    : 0.75 + clamp01(a.cloud) * 0.25;
  // Clouds are lit by the sky they float in: white at noon, peach at sunset, slate at night.
  const cloudBright = lerp(0.2, 1, clamp01(luma(k.bottom) * 1.1));
  const cloudTint = mix(mix([1, 1, 1], k.bottom, 0.35 + twilight * 0.4), [0.62, 0.66, 0.74], o * 0.75);
  const windSigned = Math.max(4, Math.min(80, a.wind)) / 80;

  return {
    top, bottom,
    glow: scale(k.glow, 1 - o * 0.75),
    key, skyAmb, groundAmb,
    lamp: scale([1.5, 0.95, 0.45], night),
    light,
    sun, sunCol: mix([1, 0.5, 0.2], [1, 0.96, 0.78], smooth(0, 0.3, e)),
    sunVis: smooth(-0.12, 0.02, isDay ? e : e * 4) * (1 - o * 0.88),
    // The moon does not shine through cloud the way the sun does: under a lid it is simply gone.
    moon, moonVis: smooth(0.02, 0.2, moonE) * clamp01(1 - o * 1.2),
    stars: k.stars * (1 - o),
    night,
    cloud: cloudAmount,
    cloudScale: 1 + o * 0.7,
    cloudTint: scale(cloudTint, cloudBright),
    rain, snow, mist, storm: a.condition === 'storm' ? 1 : 0,
    fogNear, fogFar,
    tint: rain ? mix([1, 1, 1], [0.76, 0.8, 0.88], rain) : [1, 1, 1],
    wind: windSigned,
  };
}

/** Move every number of `cur` a fraction `k` of the way to `target` (in place). Returns the largest step. */
export function easeLook(cur: Look, target: Look, k: number): number {
  let moved = 0;
  const c = cur as unknown as Record<string, number | number[]>;
  const t = target as unknown as Record<string, number | number[]>;
  for (const name of Object.keys(t)) {
    const to = t[name];
    if (typeof to === 'number') {
      const from = c[name] as number;
      const next = from + (to - from) * k;
      moved = Math.max(moved, Math.abs(to - next));
      c[name] = next;
    } else {
      const from = c[name] as number[];
      for (let i = 0; i < to.length; i++) {
        from[i] += (to[i] - from[i]) * k;
        moved = Math.max(moved, Math.abs(to[i] - from[i]));
      }
    }
  }
  return moved;
}

export function cloneLook(look: Look): Look {
  const out: Record<string, number | number[]> = {};
  for (const [name, value] of Object.entries(look)) out[name] = typeof value === 'number' ? value : [...(value as number[])];
  return out as unknown as Look;
}

const CONDITIONS: Condition[] = ['clear', 'partly', 'cloudy', 'fog', 'rain', 'snow', 'storm'];
const FESTIVE: Festive[] = ['hanukkah', 'purim', 'sukkot', 'independence', 'shabbat', 'birthday'];

/** Before the page tells us anything: a clear sky at the device's own hour. */
export function defaultAmbience(now = new Date()): Ambience {
  return {
    hour: now.getHours() + now.getMinutes() / 60, sunrise: 6, sunset: 18,
    condition: 'clear', cloud: 0.1, wind: 8, festive: null, festiveCount: 0,
  };
}

/**
 * Capture flags: `?hour=18.5`, `?wx=rain`, `?cloud=0.8`, `?wind=30`, `?fest=hanukkah&festn=5`.
 * A flag that is present wins over whatever the page sends, so a state can be looked at
 * without waiting for that weather.
 */
export function withOverrides(a: Ambience, search: string): Ambience {
  const p = new URLSearchParams(search);
  const num = (name: string) => (p.has(name) && Number.isFinite(Number(p.get(name))) ? Number(p.get(name)) : null);
  const out = { ...a };
  const hour = num('hour');
  if (hour !== null) {
    out.hour = hour;
    // A forced hour is judged against a plain 6-to-18 day, so "17.2" is always golden hour.
    out.sunrise = 6;
    out.sunset = 18;
  }
  const wx = p.get('wx') as Condition | null;
  if (wx && CONDITIONS.includes(wx)) out.condition = wx;
  const cloud = num('cloud');
  if (cloud !== null) out.cloud = clamp01(cloud);
  const wind = num('wind');
  if (wind !== null) out.wind = Math.max(0, wind);
  const fest = p.get('fest') as Festive | null;
  if (fest && FESTIVE.includes(fest)) {
    out.festive = fest;
    out.festiveCount = Math.min(8, Math.max(1, Math.round(num('festn') ?? 4)));
  }
  return out;
}
