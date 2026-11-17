import {
  FLOATS,
  Voxels,
  buildCloud,
  buildIsland,
  buildTotemPool,
  buildTree,
  mulberry,
  samplePalette,
  spriteVoxels,
  type Bitmap,
} from './voxels';
import { cloneLook, defaultAmbience, easeLook, lookFor, withOverrides, type Ambience } from './sky';
import { FIREWORK_COLOURS, PRECIP_BOX, buildFestive, buildFirework, buildPrecip } from './skyModels';

export type { Ambience, Condition, Festive } from './sky';

/**
 * The voxel diorama: raw WebGL2, no library. Every cube is one instance of a single cube mesh;
 * the world (islands, trees, props), Roy's animation frames and the totem pool are instance
 * buffers on the GPU. A transition between stations is computed in the vertex shader from a
 * "from" and a "to" buffer and one progress number that the scroll position sets, so scrubbing
 * the page scrubs the animation and the CPU does no per-cube work.
 */

export interface VoxelWorld {
  /** The hour, the sun's times, the weather and the day's decoration. Eased, never popped. */
  setAmbience(ambience: Ambience): void;
  /** Kept for callers that only know day and night: noon or late evening, clear sky. */
  setTheme(theme: 'day' | 'night'): void;
  setPaused(paused: boolean): void;
  jump(): void;
  destroy(): void;
}

export interface VoxelWorldOptions {
  reducedMotion: boolean;
  /** The page sections, in order: one station of the world per element. */
  stations: () => HTMLElement[];
  onReady: () => void;
  onLost: () => void;
}

const SPACING = 300;
const ISLAND_R = 100;
const STATIONS = 7;
const ROY_Z = 24;
const stationX = (i: number) => i * SPACING;
const royRestX = (i: number) => stationX(i) - (i === 0 ? 8 : 40);

const SPRITES = '/assets/sprites/';
const ROY_FRAMES = {
  stand: ['stand-1', 'stand-2'],
  wave: ['wave-1', 'wave-2', 'wave-3'],
  run: ['run-1', 'run-2', 'run-3', 'run-4', 'run-5', 'run-6', 'run-7'],
  jump: ['jump-1', 'jump-2', 'jump-3', 'jump-4'],
} as const;
const PROPS = ['rock', 'stump-moss', 'mushrooms', 'agave', 'toadstools', 'stump'];

// ── Shaders ──────────────────────────────────────────────────────────────────────────────

const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec4 aFrom;    // xyz centre, w size
layout(location=3) in vec4 aFromCol; // rgb, a seed
layout(location=4) in vec4 aTo;
layout(location=5) in vec4 aToCol;
uniform mat4 uViewProj, uModel, uLightVP;
uniform vec2 uShift;
uniform float uProgress, uTime, uBurst, uFall, uSlant, uSway;
uniform vec3 uStretch, uBox;
uniform int uMode; // 0 still, 1 morph from->to, 2 drifting motes, 3 burst, 4 rain and snow, 5 flame
out vec3 vColor, vNormal, vLocal, vWorld;
out vec4 vShadow;

mat3 spin(vec3 axis, float a) {
  float s = sin(a), c = cos(a), o = 1.0 - c;
  return mat3(o*axis.x*axis.x + c, o*axis.x*axis.y + axis.z*s, o*axis.z*axis.x - axis.y*s,
              o*axis.x*axis.y - axis.z*s, o*axis.y*axis.y + c, o*axis.y*axis.z + axis.x*s,
              o*axis.z*axis.x + axis.y*s, o*axis.y*axis.z - axis.x*s, o*axis.z*axis.z + c);
}

void main() {
  float seed = aFromCol.a, seed2 = aToCol.a;
  vec3 centre = aFrom.xyz;
  float size = aFrom.w;
  vec3 col = aFromCol.rgb;
  vec3 local = aPos, n = aNormal;

  if (uMode == 1) {
    // Each cube leaves a little later than the last and takes about half the journey's time.
    float t = clamp((uProgress - seed * 0.42) / 0.58, 0.0, 1.0);
    float e = t * t * (3.0 - 2.0 * t);
    float arc = sin(3.14159 * e);
    centre = mix(aFrom.xyz, aTo.xyz, e);
    centre.y += arc * (26.0 + 70.0 * seed2);
    centre.z += arc * (seed2 - 0.5) * 90.0;
    centre.x += arc * (seed - 0.5) * 36.0;
    float fromSize = aFrom.w, toSize = aTo.w;
    // A hidden spare (size 0) is still worth seeing in flight.
    size = mix(fromSize, toSize, e) + arc * 1.6 * step(min(fromSize, toSize), 0.01);
    col = mix(aFromCol.rgb, aToCol.rgb, e);
    mat3 r = spin(normalize(vec3(seed - 0.5, seed2 - 0.5, 0.35)), arc * 5.0 * (seed2 + 0.4));
    local = r * local; n = r * n;
  } else if (uMode == 2) {
    centre += vec3(sin(uTime * 0.31 + seed * 40.0) * 9.0, sin(uTime * 0.53 + seed * 90.0) * 6.0,
                   cos(uTime * 0.37 + seed * 70.0) * 9.0);
    size *= 0.7 + 0.3 * sin(uTime * 1.7 + seed * 50.0);
  } else if (uMode == 3) {
    vec3 v = aTo.xyz;
    centre = aFrom.xyz + v * uBurst + vec3(0.0, -120.0 * uBurst * uBurst, 0.0);
    size *= max(0.0, 1.0 - uBurst * 1.25);
    mat3 r = spin(normalize(v + 0.01), uBurst * 9.0);
    local = r * local; n = r * n;
  } else if (uMode == 4) {
    // Rain, snow, confetti: fall, wrap inside a box that travels with the camera, lean with
    // the wind. The cube is stretched along its path, so a raindrop is a streak.
    float speed = uFall * (0.75 + seed * 0.5);
    float y = mod(aFrom.y - uTime * speed, uBox.y);
    float x = mod(aFrom.x + uTime * speed * uSlant, uBox.x) - uBox.x * 0.5;
    centre = vec3(x + sin(uTime * 1.3 + seed * 60.0) * uSway, y, aFrom.z + cos(uTime * 1.1 + seed * 40.0) * uSway);
    local *= uStretch;
    local.x -= local.y * uSlant;
  } else if (uMode == 5) {
    size *= 0.78 + 0.3 * sin(uTime * 11.0 + seed * 50.0);
    centre.y += sin(uTime * 7.0 + seed * 30.0) * 0.35;
  }

  vec4 world = uModel * vec4(centre + local * size, 1.0);
  vWorld = world.xyz;
  vNormal = mat3(uModel) * n;
  vLocal = aPos;
  vColor = col;
  vShadow = uLightVP * world;
  gl_Position = uViewProj * world;
  // Move the whole picture inside the viewport, so the scene sits beside the text.
  gl_Position.xy += uShift * gl_Position.w;
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 vColor, vNormal, vLocal, vWorld;
in vec4 vShadow;
uniform vec3 uLightDir, uKey, uSkyAmb, uGroundAmb, uFog, uCam, uLamp, uLampPos, uTint;
uniform float uEmissive, uShadowOn, uFogNear, uFogFar, uSnow;
uniform sampler2DShadow uShadow;
out vec4 frag;

float shadow() {
  vec3 p = vShadow.xyz / vShadow.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float sum = 0.0;
  float texel = 1.0 / float(textureSize(uShadow, 0).x);
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++)
    sum += texture(uShadow, vec3(p.xy + vec2(x, y) * texel * 1.3, p.z - 0.0016));
  return sum / 9.0;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 base = pow(vColor, vec3(2.2)) * uTint;
  // Snow settles on whatever faces the sky.
  base = mix(base, vec3(0.8, 0.86, 0.95), uSnow * smoothstep(0.55, 0.95, n.y));
  float ndl = max(dot(n, uLightDir), 0.0);
  float lit = uShadowOn > 0.5 ? mix(1.0, shadow(), step(0.001, ndl)) : 1.0;
  vec3 ambient = mix(uGroundAmb, uSkyAmb, n.y * 0.5 + 0.5);
  // A soft dark line along every cube edge: reads as a bevel and keeps cubes distinct.
  vec3 a = abs(vLocal) * 2.0;
  float edge = max(max(min(a.x, a.y), min(a.y, a.z)), min(a.x, a.z));
  float bevel = 1.0 - smoothstep(0.8, 1.0, edge) * 0.2;
  vec3 toLamp = uLampPos - vWorld;
  float lampFall = max(0.0, 1.0 - length(toLamp) / 190.0);
  vec3 lamp = uLamp * lampFall * lampFall * (0.35 + 0.65 * max(dot(n, normalize(toLamp)), 0.0));
  vec3 c = base * (ambient + uKey * ndl * lit + lamp) * bevel + base * uEmissive;
  float fog = smoothstep(uFogNear, uFogFar, distance(vWorld, uCam));
  c = mix(c, uFog, fog);
  c = 1.0 - exp(-c * 1.35);        // gentle filmic shoulder
  frag = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
  if (uEmissive < -0.5) frag = vec4(vec3(shadow()), 1.0);
}`;

const DEPTH_FRAG = `#version 300 es
precision highp float;
void main() {}`;

const SKY_VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 1.0, 1.0);
}`;

const SKY_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform vec3 uTop, uBottom, uGlow, uSunCol;
uniform vec2 uSun, uMoon, uRes;
uniform float uSunVis, uMoonVis, uStars, uTime, uFlash;
out vec4 frag;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  float aspect = uRes.x / uRes.y;
  vec3 c = mix(uBottom, uTop, smoothstep(0.0, 1.0, pow(vUv.y, 0.85)));
  vec2 px = vUv * uRes;

  // The horizon burns under the sun: a wide ellipse low in the sky plus a faint band across.
  vec2 g = vec2((vUv.x - uSun.x) * aspect, vUv.y - 0.3);
  c += uGlow * (0.62 * exp(-(g.x * g.x * 1.2 + g.y * g.y * 6.5)) + 0.2 * exp(-g.y * g.y * 16.0));

  // Stars on a coarse grid, so each is a small square: pixel-art stars. A faint band of
  // crowded dim ones crosses the sky.
  float grain = max(2.0, floor(uRes.y / 300.0));
  vec2 cell = floor(px / grain);
  float h = hash(cell);
  float band = exp(-pow((vUv.y - 0.6 - (vUv.x - 0.5) * 0.3) / 0.13, 2.0));
  float star = step(0.9965 - band * 0.006, h) * (0.5 + 0.5 * sin(uTime * 1.5 + hash(cell + 7.0) * 30.0));
  star *= 0.45 + 0.55 * hash(cell + 3.0);
  c += vec3(0.9, 0.93, 1.0) * star * uStars * smoothstep(0.2, 0.75, vUv.y);
  c += vec3(0.3, 0.36, 0.6) * band * vnoise(px / (grain * 14.0)) * 0.16 * uStars;

  // Sun and moon are round, but drawn on a grid of blocks: a ball built from cubes.
  {
    float R = 0.05 * uRes.y, s = R / 5.5;
    vec2 d = px - uSun * uRes;
    vec2 q = floor(d / s + 0.5);
    float r = length(q) * s / R;
    float far = length(d) / uRes.y;
    c += uSunCol * uSunVis * (0.5 * exp(-far * far / 0.0045) + 0.22 * exp(-far * far / 0.06));
    vec2 f = abs(fract(d / s + 0.5) - 0.5);
    vec3 body = uSunCol * (1.0 + 0.1 * step(r, 0.6)) * (1.0 - 0.06 * smoothstep(0.4, 0.5, max(f.x, f.y)));
    c = mix(c, body, step(r, 1.0) * uSunVis);
  }
  {
    float R = 0.042 * uRes.y, s = R / 5.5;
    vec2 d = px - uMoon * uRes;
    vec2 q = floor(d / s + 0.5);
    float r = length(q) * s / R;
    float far = length(d) / uRes.y;
    c += vec3(0.5, 0.6, 0.95) * uMoonVis * (0.22 * exp(-far * far / 0.004) + 0.1 * exp(-far * far / 0.05));
    float maria = step(0.66, vnoise(q * 0.45 + 4.0)) * step(r, 0.86);
    // The unlit limb: a waning gibbous moon, the terminator running down its left side.
    float dark = step(q.x * 0.95 + q.y * 0.3, -2.6);
    vec2 f = abs(fract(d / s + 0.5) - 0.5);
    vec3 body = vec3(0.9, 0.93, 1.0) * (1.0 - 0.2 * maria) * (1.0 - 0.07 * smoothstep(0.4, 0.5, max(f.x, f.y)));
    body = mix(body, c + 0.03, dark * 0.9);
    c = mix(c, body, step(r, 1.0) * uMoonVis);
  }
  c += vec3(0.62, 0.68, 0.9) * uFlash;
  frag = vec4(c, 1.0);
}`;

// ── Small matrix kit (column-major, like WebGL) ──────────────────────────────────────────

type Mat = Float32Array;
const ident = (): Mat => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
function mul(a: Mat, b: Mat): Mat {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
function perspective(fovY: number, aspect: number, near: number, far: number): Mat {
  const f = 1 / Math.tan(fovY / 2), o = new Float32Array(16);
  o[0] = f / aspect; o[5] = f; o[10] = (far + near) / (near - far); o[11] = -1; o[14] = (2 * far * near) / (near - far);
  return o;
}
function ortho(half: number, near: number, far: number): Mat {
  const o = ident();
  o[0] = 1 / half; o[5] = 1 / half; o[10] = -2 / (far - near); o[14] = -(far + near) / (far - near);
  return o;
}
type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
function lookAt(eye: V3, target: V3): Mat {
  const z = norm(sub(eye, target)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}
/** translate * rotateY * scale: all a figure standing on the ground needs. */
function trs(x: number, y: number, z: number, yaw: number, sx: number, sy: number): Mat {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return new Float32Array([c * sx, 0, -s * sx, 0, 0, sy, 0, 0, s * sx, 0, c * sx, 0, x, y, z, 1]);
}

const CUBE = (() => {
  // 6 faces, 2 triangles each, wound counter-clockwise seen from outside.
  const faces: [V3, V3, V3][] = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  ];
  const out: number[] = [];
  for (const [n, u, v] of faces) {
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) {
      for (let k = 0; k < 3; k++) out.push((n[k] + u[k] * a + v[k] * b) * 0.5);
      out.push(n[0], n[1], n[2]);
    }
  }
  return new Float32Array(out);
})();

function loadBitmap(url: string): Promise<Bitmap | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      resolve({ w: c.width, h: c.height, px: ctx.getImageData(0, 0, c.width, c.height).data });
    };
    // A missing sprite only costs its prop or frame, never the page.
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

interface Range {
  start: number;
  count: number;
}

const DEBUG_SHADOW = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dbg');
const forcedLog = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('q');

export async function createVoxelWorld(canvas: HTMLCanvasElement, opts: VoxelWorldOptions): Promise<VoxelWorld | null> {
  const context = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
  if (!context) return null;
  // A const of the non-null type: closures created after an await keep the narrowing.
  const gl: WebGL2RenderingContext = context;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const link = (vs: string, fs: string) => {
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    const cache = new Map<string, WebGLUniformLocation | null>();
    return { p, u: (name: string) => cache.get(name) ?? (cache.set(name, gl.getUniformLocation(p, name)), cache.get(name)!) };
  };

  let main!: ReturnType<typeof link>, depth!: ReturnType<typeof link>, sky!: ReturnType<typeof link>;
  try {
    main = link(VERT, FRAG);
    depth = link(VERT, DEPTH_FRAG);
    sky = link(SKY_VERT, SKY_FRAG);
  } catch (error) {
    // The page falls back to its still image; the reason is worth a line in the console.
    console.warn('Voxel scene disabled:', error);
    return null;
  }

  // ── Assets ────────────────────────────────────────────────────────────────────────────
  const frameNames = Object.values(ROY_FRAMES).flat();
  const [bg, ...rest] = await Promise.all([
    loadBitmap(`${SPRITES}background.png`),
    ...frameNames.map(n => loadBitmap(`${SPRITES}${n}.png`)),
    ...PROPS.map(n => loadBitmap(`${SPRITES}${n}.png`)),
    loadBitmap(`${SPRITES}bird-blue.png`),
  ]);
  const frameBitmaps = rest.slice(0, frameNames.length);
  const propBitmaps = rest.slice(frameNames.length, frameNames.length + PROPS.length);
  const bird = rest[rest.length - 1];
  if (!frameBitmaps[0]) return null; // no Roy, no show: the page keeps its still image

  const rand = mulberry(20261117);
  const palette = samplePalette(bg, 164);

  // World: one range of cubes per station, so only the islands near the camera are drawn.
  const world = new Voxels(rand);
  const worldRanges: Range[] = [];
  for (let i = 0; i < STATIONS; i++) {
    const start = world.count;
    const cx = stationX(i);
    buildIsland(world, cx, ISLAND_R, palette, rand);
    // Trees stand at the back and the sides, never between the camera and Roy.
    const trees = 3 + Math.floor(rand() * 2);
    for (let t = 0; t < trees; t++) {
      // Along the back rim, so they frame the totem instead of standing in front of it.
      const x = -64 + (t / (trees - 1)) * 128 + (rand() - 0.5) * 14;
      const rim = Math.sqrt(Math.max(0, (ISLAND_R * 0.8) ** 2 - x * x)) / 1.25;
      const z = -Math.max(34, rim - 4 - rand() * 8);
      buildTree(world, cx + x, z, 9 + Math.floor(rand() * 5), palette, rand);
    }
    // Two props from the game on each island, in front and to the sides of the path.
    for (let n = 0; n < 2; n++) {
      const prop = propBitmaps[(i * 2 + n) % propBitmaps.length];
      if (!prop) continue;
      const side = n === 0 ? -1 : 1;
      spriteVoxels(world, prop, { x: cx + side * (58 + rand() * 14), z: n === 0 ? 44 : -34 - rand() * 10, maxDepth: 4 });
    }
    worldRanges.push({ start, count: world.count - start });
  }

  // Clouds: a few shapes, placed many times. Each placement drifts with the wind and wraps
  // around the camera, so the sky is never empty and never runs out. The first entries are
  // the ones a nearly clear sky shows, so the list goes far and high first, then closer.
  const clouds = new Voxels(rand);
  const cloudShapes: Range[] = [];
  for (let n = 0; n < 4; n++) {
    const start = clouds.count;
    buildCloud(clouds, 0, 0, 0, rand);
    cloudShapes.push({ start, count: clouds.count - start });
  }
  const CLOUD_SPAN = 1700;
  const cloudPool = Array.from({ length: 26 }, (_, n) => {
    const layer = n % 3; // 0 far, 1 middle, 2 high overhead
    return {
      shape: n % cloudShapes.length,
      x: (n * 0.618 * CLOUD_SPAN + rand() * 160) % CLOUD_SPAN,
      y: layer === 2 ? 250 + rand() * 50 : 120 + rand() * 120,
      z: layer === 0 ? -430 + rand() * 140 : layer === 1 ? -240 + rand() * 90 : -90 + rand() * 120,
      size: (layer === 2 ? 1.25 : 0.9) + rand() * 0.6,
      speed: 0.7 + rand() * 0.6,
    };
  });
  // Mist: the same shapes, flattened and laid near the ground behind and beside the island.
  const mistPool = Array.from({ length: 7 }, (_, n) => ({
    shape: n % cloudShapes.length, x: (n * 0.44 * CLOUD_SPAN + rand() * 120) % CLOUD_SPAN,
    y: 4 + rand() * 26, z: -150 + rand() * 120, size: 1.5 + rand() * 0.8, speed: 0.25 + rand() * 0.2,
  }));

  const festive = buildFestive(rand);
  const precip = buildPrecip(1700, rand);
  const FIREWORK = 96;
  const fireworks = FIREWORK_COLOURS.map(colours => buildFirework(FIREWORK, colours, rand));

  // Motes: fireflies at night, pollen by day. A handful per island.
  const motes = new Voxels(rand);
  const moteRanges: Range[] = [];
  for (let i = 0; i < STATIONS; i++) {
    const start = motes.count;
    for (let n = 0; n < 34; n++) {
      motes.add(stationX(i) + (rand() - 0.5) * 220, 12 + rand() * 110, (rand() - 0.5) * 150, 1.5 + rand() * 1.2, [1, 0.92, 0.5]);
    }
    moteRanges.push({ start, count: motes.count - start });
  }

  // The game's blue bird circles above the islands: one rigid model, moved by its matrix.
  const birdVox = new Voxels(rand);
  if (bird) spriteVoxels(birdVox, bird, { y: -17, maxDepth: 3 });

  const roy = new Voxels(rand);
  const royRanges = new Map<string, Range>();
  frameNames.forEach((name, n) => {
    const bitmap = frameBitmaps[n] ?? frameBitmaps[0]!;
    const start = roy.count;
    spriteVoxels(roy, bitmap, { maxDepth: 5 });
    royRanges.set(name, { start, count: roy.count - start });
  });

  const totems = buildTotemPool(
    Array.from({ length: STATIONS - 1 }, (_, n) => ({ x: stationX(n + 1) + 46, y: 0, z: -12 })),
    r => {
      const a = r() * 6.283, d = Math.sqrt(r()) * ISLAND_R * 0.8;
      return [Math.cos(a) * d, r() < 0.5 ? 1 : 8 + r() * 70, (Math.sin(a) * d) / 1.25];
    },
    rand,
  );
  const totemData = new Float32Array(totems.count * FLOATS * totems.shapes.length);
  totems.shapes.forEach((shape, n) => totemData.set(shape, n * totems.count * FLOATS));

  const BURST = 70;
  const burst = new Float32Array(BURST * FLOATS * 2); // origin block, then velocity block
  for (let n = 0; n < BURST; n++) {
    const a = rand() * 6.283, up = 60 + rand() * 110, out = 30 + rand() * 80;
    burst.set([0, 6, 0, 1.4 + rand() * 1.8, 0.98, 0.86, 0.45, rand()], n * FLOATS);
    burst.set([Math.cos(a) * out, up, Math.sin(a) * out, 0, 0, 0, 0, rand()], (BURST + n) * FLOATS);
  }

  // ── GPU objects ───────────────────────────────────────────────────────────────────────
  const makeBuffer = (data: Float32Array) => {
    const b = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  };
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, makeBuffer(CUBE));
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  for (let loc = 2; loc <= 5; loc++) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribDivisor(loc, 1);
  }
  if (forcedLog) console.info('voxels', { world: world.count, roy: roy.count, totem: totems.count, motes: motes.count, clouds: clouds.count });
  const buffers = {
    world: makeBuffer(world.toArray()), clouds: makeBuffer(clouds.toArray()), motes: makeBuffer(motes.toArray()),
    roy: makeBuffer(roy.toArray()), totems: makeBuffer(totemData), burst: makeBuffer(burst),
    bird: makeBuffer(birdVox.toArray()),
    festive: makeBuffer(festive.statics.toArray()), flames: makeBuffer(festive.flames.toArray()),
    precip: makeBuffer(precip.data), fireworks: fireworks.map(makeBuffer),
  };

  const SHADOW = 2048;
  const shadowTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, shadowTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SHADOW, SHADOW, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  const shadowFbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0);
  gl.drawBuffers([gl.NONE]);
  gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // ── State ─────────────────────────────────────────────────────────────────────────────
  const forced = new URLSearchParams(window.location.search).get('q');
  /** 0 full, 1 lower resolution, 2 no shadows, 3 no motes or clouds. `?q=0` pins it (captures). */
  let quality = forced !== null ? Number(forced) || 0 : window.innerWidth < 700 ? 1 : 0;
  let slowFrames = 0;
  const search = window.location.search;
  let ambience = withOverrides(defaultAmbience(), search);
  let hostSetAmbience = false;
  /** The look on screen. It chases the look the ambience asks for; null until the first frame. */
  let look: ReturnType<typeof lookFor> | null = null;
  let lookMoving = false;
  /** The decoration on show and how far it has grown in (0..1): one shrinks before the next grows. */
  let festShown = ambience.festive;
  let festCount = ambience.festiveCount;
  let festAmt = festShown ? 1 : 0;
  let flashAt = -10, nextFlash = 3;
  /** `?still` starts paused: one frame per change, for captures on machines without a GPU. */
  let paused = new URLSearchParams(window.location.search).has('still');
  let destroyed = false;
  let raf = 0;
  let last = performance.now();
  let clock = 0;
  let pointer = { x: 0, y: 0 }, gaze = { x: 0, y: 0 };
  let camX = royRestX(0) + 30;
  // `?jump` with `?still` freezes Roy mid-jump, to check the pose and the burst in a capture.
  let jumpAt = new URLSearchParams(window.location.search).has('jump') ? -0.35 : -10;
  let lastPos = 0, facing = 1, lastRoyX = royRestX(0);
  let dirty = true;
  let royScreen = { x: 0, y: 0, r: 0 };

  function resize(): boolean {
    const cap = quality === 0 ? 2 : quality === 1 ? 1.25 : 1;
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w;
    canvas.height = h;
    return true;
  }

  /**
   * Where the page is in the story: station `i` and how far (0..1) toward the next. The
   * journey happens while the gap between two sections crosses the middle of the screen, so
   * the scene is in clear view while Roy runs and the cubes fly.
   */
  function storyPosition(): number {
    const els = opts.stations();
    const mid = window.innerHeight * 0.5;
    let pos = 0;
    for (let i = 0; i < els.length - 1 && i < STATIONS - 1; i++) {
      const bottom = els[i].getBoundingClientRect().bottom;
      const top = els[i + 1].getBoundingClientRect().top;
      const span = Math.max(1, top - bottom);
      const p = Math.min(1, Math.max(0, (mid - bottom) / span));
      if (p <= 0) break;
      pos = i + p;
    }
    if (opts.reducedMotion) return Math.round(pos);
    return pos;
  }

  function bind(buffer: WebGLBuffer, from: number, to: number) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const stride = FLOATS * 4;
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, from * stride);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, from * stride + 16);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, to * stride);
    gl.vertexAttribPointer(5, 4, gl.FLOAT, false, stride, to * stride + 16);
  }

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const mix3 = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  function frame(now: number) {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const animate = !paused && !opts.reducedMotion;
    if (animate) clock += dt;

    // Adaptive quality: a run of slow frames steps the cost down once and for all.
    if (forced === null && animate) {
      slowFrames = dt > 0.034 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
      if (slowFrames > 45 && quality < 3) {
        quality++;
        slowFrames = 0;
      }
    }
    const resized = resize();

    const pos = storyPosition();
    const i = Math.min(STATIONS - 2, Math.floor(pos));
    const q = Math.min(1, pos - i); // 0..1 between station i and i + 1

    // ── Roy ───────────────────────────────────────────────────────────────────────────
    const fromX = royRestX(i), toX = royRestX(i + 1);
    const edgeA = stationX(i) + ISLAND_R * 0.8, edgeB = stationX(i + 1) - ISLAND_R * 0.8;
    let royX = fromX, royY = 0, frameName: string = 'stand-1', squash = 1;
    const travelling = q > 0.001 && q < 0.999;
    if (travelling) {
      if (q < 0.3) royX = lerp(fromX, edgeA, q / 0.3);
      else if (q < 0.7) {
        const u = (q - 0.3) / 0.4;
        royX = lerp(edgeA, edgeB, u);
        royY = Math.sin(Math.PI * u) * 62;
        frameName = ROY_FRAMES.jump[Math.min(3, Math.floor(u * 4))];
      } else royX = lerp(edgeB, toX, (q - 0.7) / 0.3);
      // The run cycle is driven by distance, so scrubbing the page steps his legs.
      if (q < 0.3 || q >= 0.7) frameName = ROY_FRAMES.run[Math.floor(Math.abs(royX) / 8) % 7];
      if (Math.abs(pos - lastPos) > 0.0004) facing = pos > lastPos ? 1 : -1;
    } else {
      royX = q >= 0.999 ? toX : fromX;
      facing = 1;
      const sinceJump = clock - jumpAt;
      if (sinceJump >= 0 && sinceJump < 0.75) {
        const u = sinceJump / 0.75;
        royY = Math.sin(Math.PI * u) * 46;
        frameName = ROY_FRAMES.jump[Math.min(3, Math.floor(u * 4))];
        squash = 1 + Math.sin(Math.PI * u) * 0.08;
      } else if (animate && (clock < 3.2 || clock % 11 > 9.2)) {
        frameName = ROY_FRAMES.wave[[0, 1, 2, 1][Math.floor(clock * 6) % 4]]; // hello, and again now and then
      } else {
        frameName = ROY_FRAMES.stand[Math.floor(clock * 1.6) % 2];
        squash = 1 + Math.sin(clock * 2.2) * 0.012; // breathing
      }
    }
    lastPos = pos;
    lastRoyX = royX;

    // ── Camera ────────────────────────────────────────────────────────────────────────
    gaze.x += (pointer.x - gaze.x) * Math.min(1, dt * 4);
    gaze.y += (pointer.y - gaze.y) * Math.min(1, dt * 4);
    const targetX = royX + (travelling ? 20 : i === 0 && q < 0.5 ? 6 : 44);
    camX += (targetX - camX) * (opts.reducedMotion ? 1 : Math.min(1, dt * 6));
    const aspect = canvas.width / Math.max(1, canvas.height);
    const wide = aspect > 1.05;
    // Opening shot: the camera swings in from far and wide during the first two seconds.
    const intro = animate ? 1 - Math.min(1, clock / 2.2) : 0;
    const swoop = intro * intro * (3 - 2 * intro);
    // The hero frames Roy alone, a little closer; a station has to fit Roy and its totem.
    const zoom = lerp(0.86, 1, Math.min(1, pos * 2));
    const radius = (wide ? 540 : 350 / Math.max(0.35, aspect)) * zoom;
    const dolly = radius * (1 + swoop * 0.9);
    const yaw = (animate ? Math.sin(clock * 0.17) * 0.05 : 0) + gaze.x * 0.32 - 0.12 + swoop * 1.1;
    const pitch = 0.3 - gaze.y * 0.1 + swoop * 0.35;
    const target: V3 = [camX, 44 + royY * 0.25, 0];
    const eye: V3 = [
      target[0] + Math.sin(yaw) * Math.cos(pitch) * dolly,
      target[1] + Math.sin(pitch) * dolly,
      target[2] + Math.cos(yaw) * Math.cos(pitch) * dolly,
    ];
    const viewProj = mul(perspective(0.52, aspect, 20, 3000), lookAt(eye, target));
    // Desktop: the scene sits in the right half, beside the text. Phones: in the top part.
    const shift: [number, number] = wide ? [0.36, 0.02] : [0, 0.48];

    // ── Sky, light and weather ────────────────────────────────────────────────────────
    const wanted = lookFor(ambience, wide);
    if (!look) look = cloneLook(wanted);
    // About 1.5 s to settle. Reduced motion: the new look is simply there.
    const moved = easeLook(look, wanted, opts.reducedMotion ? 1 : Math.min(1, dt * 2.6));
    lookMoving = moved > 0.003;
    const L = look;
    if (festShown !== ambience.festive) {
      festAmt = opts.reducedMotion ? 0 : Math.max(0, festAmt - dt * 2.5);
      if (festAmt <= 0.01) {
        festShown = ambience.festive;
        festCount = ambience.festiveCount;
      }
      lookMoving = true;
    } else if (festShown && festAmt < 1) {
      festAmt = opts.reducedMotion ? 1 : Math.min(1, festAmt + dt * 2.5);
      festCount = ambience.festiveCount;
      lookMoving = festAmt < 1;
    } else festCount = ambience.festiveCount;
    // Lightning: one double flash every several seconds, and only while things move. Never a
    // strobe, and never for a visitor who asked for less motion.
    let flash = 0;
    if (L.storm > 0.5 && animate) {
      if (clock > nextFlash) {
        flashAt = clock;
        nextFlash = clock + 6.5 + ((clock * 7.31) % 1) * 6;
      }
      const t = clock - flashAt;
      flash = t < 0 ? 0 : t < 0.07 ? 1 : t < 0.15 ? 0.15 : t < 0.22 ? 0.75 : Math.max(0, 0.75 - (t - 0.22) * 2.2);
    }
    const LIGHT_DIR = norm(L.light as V3);
    const lightEye: V3 = [camX + LIGHT_DIR[0] * 600, LIGHT_DIR[1] * 600, LIGHT_DIR[2] * 600];
    const lightVP = mul(ortho(250, 50, 1300), lookAt(lightEye, [camX, 0, 0]));

    const royRange = royRanges.get(frameName) ?? royRanges.get('stand-1')!;
    const bodyYaw = travelling ? (facing > 0 ? 0 : Math.PI) : gaze.x * 0.4;
    const royModel = trs(royX, royY, ROY_Z, bodyYaw, 1 / Math.sqrt(squash), squash);
    const none = ident();
    const near = [i - 1, i, i + 1].filter(n => n >= 0 && n < STATIONS);
    const shadows = quality < 2;

    const heroNear = near.includes(0);
    const festRange = festShown ? festive.staticRanges[festShown] : null;
    const flameRange = festShown ? festive.flameRanges[festShown] : null;
    // Grown from its own foot: scale about the point where the decoration stands.
    const festModel = trs(festive.at[0] * (1 - festAmt), 0, festive.at[2] * (1 - festAmt), 0, festAmt, festAmt);
    const flameCubes = !flameRange ? 0 : festShown === 'hanukkah' ? Math.min(flameRange.count, 2 * (1 + festCount)) : flameRange.count;
    const qualityScale = [1, 0.65, 0.42, 0.25][quality];
    const cloudsOut = Math.round(cloudPool.length * Math.min(1, L.cloud) * (quality < 3 ? 1 : 0.5));
    const cloudDrift = clock * (5 + L.wind * 46);

    const drawScene = (prog: typeof main, forShadow: boolean) => {
      const set = (mode: number, model: Mat, progress = 0) => {
        gl.uniform1i(prog.u('uMode'), mode);
        gl.uniformMatrix4fv(prog.u('uModel'), false, model);
        gl.uniform1f(prog.u('uProgress'), progress);
      };
      const emissive = (v: number) => !forShadow && gl.uniform1f(prog.u('uEmissive'), v);
      const tint = (c: number[], snow: number) => {
        if (forShadow) return;
        gl.uniform3f(prog.u('uTint'), c[0], c[1], c[2]);
        gl.uniform1f(prog.u('uSnow'), snow);
      };
      emissive(DEBUG_SHADOW ? -1 : 0);
      tint(L.tint, L.snow);
      set(0, none);
      for (const n of near) {
        bind(buffers.world, worldRanges[n].start, worldRanges[n].start);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, worldRanges[n].count);
      }
      if (festRange && heroNear && festAmt > 0.01) {
        set(0, festModel);
        bind(buffers.festive, festRange.start, festRange.start);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, festRange.count);
      }
      tint(L.tint, L.snow * 0.5); // a dusting on Roy's hair and shoulders, not a snowman
      set(0, royModel);
      bind(buffers.roy, royRange.start, royRange.start);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, royRange.count);
      // The totem pool: from the model of station i to the model of station i + 1.
      tint(L.tint, L.snow * 0.6);
      set(1, none, q);
      bind(buffers.totems, i * totems.count, (i + 1) * totems.count);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, totems.count);
      if (birdVox.count > 0 && L.rain + L.snow < 0.5) {
        // Clockwise around the island Roy is on; the sprite faces left, so it flies tail-first
        // unless it is turned to follow the circle. It sits out rain and snow.
        const a = clock * 0.45;
        const home = camX - 30; // follows the camera, so it never pops from island to island
        tint(L.tint, 0);
        set(0, trs(home + Math.cos(a) * 118, 132 + Math.sin(a * 2.3) * 10, Math.sin(a) * 70 - 24, a, 1, 1));
        bind(buffers.bird, 0, 0);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, birdVox.count);
      }
      if (forShadow) return;

      // Flames: small, bright, flickering. They read by day and glow at night.
      if (flameCubes > 0 && heroNear && festAmt > 0.5) {
        tint([1, 1, 1], 0);
        emissive(1.6 + L.night * 2.2);
        set(5, festModel);
        bind(buffers.flames, flameRange!.start, flameRange!.start);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, flameCubes);
      }

      // Clouds: each placement is the same few shapes under its own matrix.
      const placeCloud = (c: (typeof cloudPool)[number], size: number, flat: number) => {
        const rel = ((((c.x + cloudDrift * c.speed - camX * 0.45) % CLOUD_SPAN) + CLOUD_SPAN) % CLOUD_SPAN) - CLOUD_SPAN / 2;
        set(0, trs(camX + rel, c.y, c.z, 0, c.size * size, c.size * size * flat));
        const shape = cloudShapes[c.shape];
        bind(buffers.clouds, shape.start, shape.start);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, shape.count);
      };
      if (cloudsOut > 0) {
        tint(L.cloudTint, 0);
        emissive(0.5 * (1 - L.night) + 0.05);
        for (let n = 0; n < cloudsOut; n++) placeCloud(cloudPool[n], L.cloudScale, 1);
      }
      if (L.mist > 0.04 && quality < 3) {
        tint(L.bottom.map(v => 0.55 + v * 0.5), 0);
        emissive(0.35 * (1 - L.night) + 0.04);
        const wisps = Math.round(mistPool.length * Math.min(1, L.mist));
        for (let n = 0; n < wisps; n++) placeCloud(mistPool[n], 1, 0.3);
      }

      if (quality < 3 && L.rain + L.snow < 0.6) {
        tint([1, 1, 1], 0);
        set(2, none);
        emissive(lerp(0.35, 3.0, L.night));
        for (const n of near) {
          bind(buffers.motes, moteRanges[n].start, moteRanges[n].start);
          gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, moteRanges[n].count);
        }
      }

      // Rain, snow and confetti need the clock: frozen streaks in the air would look broken.
      if (animate) {
        const fall = (count: number, start: number, speed: number, slant: number, sway: number, stretch: V3, colour: number[], glow: number) => {
          if (count < 1) return;
          tint(colour, 0);
          emissive(glow);
          gl.uniform1f(prog.u('uFall'), speed);
          gl.uniform1f(prog.u('uSlant'), slant);
          gl.uniform1f(prog.u('uSway'), sway);
          gl.uniform3f(prog.u('uStretch'), stretch[0], stretch[1], stretch[2]);
          gl.uniform3f(prog.u('uBox'), PRECIP_BOX[0], PRECIP_BOX[1], PRECIP_BOX[2]);
          set(4, trs(camX, 0, 30, 0, 1, 1));
          bind(buffers.precip, start, start);
          gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, Math.min(count, precip.count));
        };
        const dayGlow = 0.25 + 0.75 * (1 - L.night);
        fall(Math.round((300 + 1400 * L.rain) * L.rain * qualityScale), 0, 330, 0.12 + L.wind * 0.55, 0, [0.42, 12, 0.42], [0.72, 0.8, 0.95], 0.5 * dayGlow + 0.12);
        fall(Math.round(900 * L.snow * qualityScale), 0, 30, L.wind * 0.9, 7, [2.1, 2.1, 2.1], [1, 1, 1], 0.45 * dayGlow + 0.2);
        if (festShown === 'purim' && heroNear) {
          tint([1, 1, 1], 0);
          const count = Math.round(precip.confetti.count * festAmt * qualityScale);
          if (count > 0) {
            emissive(0.5);
            gl.uniform1f(prog.u('uFall'), 22);
            gl.uniform1f(prog.u('uSlant'), 0.25);
            gl.uniform1f(prog.u('uSway'), 12);
            gl.uniform3f(prog.u('uStretch'), 2.6, 0.7, 2.2);
            gl.uniform3f(prog.u('uBox'), 300, 210, PRECIP_BOX[2]);
            set(4, trs(festive.at[0] - 30, 0, 10, 0, 1, 1));
            bind(buffers.precip, precip.confetti.start, precip.confetti.start);
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, count);
          }
        }
        // Fireworks on Independence Day, after dark: two bursts taking turns.
        if (festShown === 'independence' && L.night > 0.5 && quality < 3) {
          tint([1, 1, 1], 0);
          emissive(3.2);
          fireworks.forEach((_, k) => {
            const cycle = (clock + k * 1.45) / 2.9;
            const p = cycle % 1;
            if (p > 0.72) return;
            const round = Math.floor(cycle);
            const wander = ((round * 0.618 + k * 0.37) % 1) - 0.5;
            gl.uniform1f(prog.u('uBurst'), p / 0.9);
            set(3, trs(camX + 30 + wander * 240, 210 + (k ? 28 : 0) + wander * 30, -170, 0, 1, 1));
            bind(buffers.fireworks[k], 0, FIREWORK);
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, FIREWORK);
          });
        }
      }

      const b = (clock - jumpAt) / 0.9;
      if (b > 0 && b < 1) {
        tint([1, 1, 1], 0);
        gl.uniform1f(prog.u('uBurst'), b);
        set(3, trs(lastRoyX, 0, ROY_Z, 0, 1, 1));
        emissive(1.2);
        bind(buffers.burst, 0, BURST);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, BURST);
      }
    };

    gl.bindVertexArray(vao);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    if (shadows) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
      gl.viewport(0, 0, SHADOW, SHADOW);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(depth.p);
      gl.uniformMatrix4fv(depth.u('uViewProj'), false, lightVP);
      gl.uniformMatrix4fv(depth.u('uLightVP'), false, lightVP);
      gl.uniform2f(depth.u('uShift'), 0, 0);
      gl.uniform1f(depth.u('uTime'), clock);
      drawScene(depth, true);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    // Sky first, with depth off: the gradient, the horizon's glow, stars, sun and moon.
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(null); // the sky is one triangle made from gl_VertexID: no attributes
    gl.useProgram(sky.p);
    gl.uniform3fv(sky.u('uTop'), L.top);
    gl.uniform3fv(sky.u('uBottom'), L.bottom);
    gl.uniform3fv(sky.u('uGlow'), L.glow);
    gl.uniform3fv(sky.u('uSunCol'), L.sunCol);
    // A touch of parallax against the pointer, so the sky is not painted on the glass.
    gl.uniform2f(sky.u('uSun'), L.sun[0] - gaze.x * 0.012, L.sun[1]);
    gl.uniform2f(sky.u('uMoon'), L.moon[0] - gaze.x * 0.012, L.moon[1]);
    gl.uniform1f(sky.u('uSunVis'), L.sunVis);
    gl.uniform1f(sky.u('uMoonVis'), L.moonVis);
    gl.uniform1f(sky.u('uStars'), L.stars);
    gl.uniform1f(sky.u('uFlash'), flash * 0.5);
    gl.uniform2f(sky.u('uRes'), canvas.width, canvas.height);
    gl.uniform1f(sky.u('uTime'), clock);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(vao);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.useProgram(main.p);
    gl.uniformMatrix4fv(main.u('uViewProj'), false, viewProj);
    gl.uniformMatrix4fv(main.u('uLightVP'), false, lightVP);
    gl.uniform2f(main.u('uShift'), shift[0], shift[1]);
    gl.uniform1f(main.u('uTime'), clock);
    gl.uniform3fv(main.u('uLightDir'), LIGHT_DIR);
    gl.uniform3f(main.u('uKey'), L.key[0] + flash * 1.3, L.key[1] + flash * 1.4, L.key[2] + flash * 1.7);
    gl.uniform3f(main.u('uSkyAmb'), L.skyAmb[0] + flash * 0.25, L.skyAmb[1] + flash * 0.27, L.skyAmb[2] + flash * 0.35);
    gl.uniform3fv(main.u('uGroundAmb'), L.groundAmb);
    // Fog is the colour of the sky at the horizon, so far islands melt into it.
    gl.uniform3fv(main.u('uFog'), L.bottom.map(v => Math.pow(Math.min(1, v + flash * 0.2), 2.2)));
    gl.uniform3fv(main.u('uCam'), eye);
    // Roy carries a warm lamp at night. When candles burn beside him on the hero island, the
    // light moves between them and is on (faintly) even by day.
    const candle = flameCubes > 0 && heroNear ? festAmt * Math.max(0, 1 - pos * 1.6) : 0;
    const glowUp = candle * (0.3 + 0.9 * L.night);
    gl.uniform3f(main.u('uLamp'), L.lamp[0] + 1.5 * glowUp, L.lamp[1] + 0.9 * glowUp, L.lamp[2] + 0.4 * glowUp);
    gl.uniform3f(
      main.u('uLampPos'),
      lerp(royX + 26, festive.at[0] - 6, candle * 0.7), lerp(58 + royY, 50, candle * 0.7), lerp(ROY_Z + 46, festive.at[2] + 34, candle * 0.7),
    );
    gl.uniform1f(main.u('uFogNear'), L.fogNear);
    gl.uniform1f(main.u('uFogFar'), L.fogFar);
    gl.uniform1f(main.u('uShadowOn'), shadows ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.uniform1i(main.u('uShadow'), 0);
    drawScene(main, false);

    // Where Roy is on screen, for "tap him and he jumps".
    const cx = royX, cy = 46 + royY, cz = ROY_Z;
    const w = viewProj[3] * cx + viewProj[7] * cy + viewProj[11] * cz + viewProj[15];
    const sx = (viewProj[0] * cx + viewProj[4] * cy + viewProj[8] * cz + viewProj[12]) / w + shift[0];
    const sy = (viewProj[1] * cx + viewProj[5] * cy + viewProj[9] * cz + viewProj[13]) / w + shift[1];
    royScreen = {
      x: (sx * 0.5 + 0.5) * canvas.clientWidth,
      y: (1 - (sy * 0.5 + 0.5)) * canvas.clientHeight,
      r: ((46 * 1.9) / w / Math.tan(0.26)) * canvas.clientHeight * 0.5,
    };

    if (!ready) {
      ready = true;
      opts.onReady();
    }
    // Still scenes (paused, reduced motion) redraw only when something changed.
    dirty = resized || lookMoving || Math.abs(targetX - camX) > 0.05;
    if (animate || dirty) schedule();
  }
  let ready = false;
  const schedule = () => {
    if (!raf && !destroyed && !document.hidden) raf = requestAnimationFrame(frame);
  };

  // ── Events ────────────────────────────────────────────────────────────────────────────
  const onPointer = (e: PointerEvent) => {
    pointer = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    schedule();
  };
  const jump = () => {
    if (clock - jumpAt < 0.9) return;
    if (opts.reducedMotion || paused) return; // a jump is motion: not when motion is off
    jumpAt = clock;
    schedule();
  };
  const onDown = (e: PointerEvent) => {
    // Only a tap on the scene itself: never steal a click from a link, a button or a panel.
    if ((e.target as Element | null)?.closest?.('a, button, dialog, input, [data-solid]')) return;
    if (Math.hypot(e.clientX - royScreen.x, e.clientY - royScreen.y) < Math.max(44, royScreen.r)) jump();
  };
  const onVisible = () => {
    last = performance.now();
    schedule();
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    destroyed = true;
    opts.onLost();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', onVisible);
  canvas.addEventListener('webglcontextlost', onLost);
  schedule();

  return {
    setAmbience(next) {
      hostSetAmbience = true;
      // don't touch / the capture flags (?hour, ?wx, ...) are applied last, so they win.
      ambience = withOverrides({ ...next }, search);
      schedule();
    },
    setTheme(theme) {
      // Only for a caller that never sends an ambience: real data must not be overruled.
      if (hostSetAmbience) return;
      ambience = withOverrides({ ...ambience, hour: theme === 'night' ? 22.5 : 13 }, search);
      schedule();
    },
    setPaused(value) {
      paused = value;
      last = performance.now();
      schedule();
    },
    jump,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', onVisible);
      canvas.removeEventListener('webglcontextlost', onLost);
      // don't touch / no loseContext() here: React StrictMode mounts twice on the same canvas,
      // and a context lost by the first mount is the one the second mount would get back.
    },
  };
}
