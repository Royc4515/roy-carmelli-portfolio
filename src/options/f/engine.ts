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

/**
 * The voxel diorama: raw WebGL2, no library. Every cube is one instance of a single cube mesh;
 * the world (islands, trees, props), Roy's animation frames and the totem pool are instance
 * buffers on the GPU. A transition between stations is computed in the vertex shader from a
 * "from" and a "to" buffer and one progress number that the scroll position sets, so scrubbing
 * the page scrubs the animation and the CPU does no per-cube work.
 */

export interface VoxelWorld {
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
uniform float uProgress, uTime, uBurst;
uniform int uMode; // 0 still, 1 morph from->to, 2 drifting motes, 3 burst
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
uniform vec3 uLightDir, uKey, uSkyAmb, uGroundAmb, uFog, uCam, uLamp, uLampPos;
uniform float uEmissive, uShadowOn, uFogNear, uFogFar;
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
  vec3 base = pow(vColor, vec3(2.2));
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
uniform vec3 uTop, uBottom, uOrb;
uniform vec2 uOrbAt, uRes;
uniform float uNight, uTime;
out vec4 frag;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 c = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
  vec2 px = vUv * uRes;
  // Stars on a coarse grid, so each is a small square: pixel-art stars.
  vec2 cell = floor(px / 3.0);
  float star = step(0.9965, hash(cell)) * (0.55 + 0.45 * sin(uTime * 1.5 + hash(cell + 7.0) * 30.0));
  c += vec3(star) * uNight * smoothstep(0.25, 0.9, vUv.y);
  // A square sun and moon: this is a world of cubes.
  vec2 o = abs(px - uOrbAt * uRes) / uRes.y;
  float d = max(o.x, o.y);
  c += uOrb * (step(d, 0.034) + 0.22 * smoothstep(0.26, 0.0, length(o)));
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

const DAY = {
  top: [0.3, 0.56, 0.9], bottom: [0.78, 0.9, 0.97], key: [1.25, 1.16, 1.0], sky: [0.42, 0.52, 0.68],
  ground: [0.2, 0.18, 0.15], orb: [1.0, 0.95, 0.75], lamp: [0, 0, 0], emissive: 0.35,
};
const NIGHT = {
  top: [0.02, 0.035, 0.1], bottom: [0.09, 0.13, 0.27], key: [0.42, 0.5, 0.8], sky: [0.12, 0.16, 0.32],
  ground: [0.05, 0.05, 0.09], orb: [0.82, 0.86, 1.0], lamp: [1.5, 0.95, 0.45], emissive: 3.0,
};
const LIGHT_DIR = norm([0.5, 0.82, 0.55]);

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
      const a = Math.PI * (1.08 + (t / (trees - 1)) * 0.84) + (rand() - 0.5) * 0.2;
      const r = ISLAND_R * (0.5 + rand() * 0.22);
      buildTree(world, cx + Math.cos(a) * r, (Math.sin(a) * r) / 1.25, 9 + Math.floor(rand() * 5), palette, rand);
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

  const clouds = new Voxels(rand);
  for (let n = 0; n < 9; n++) buildCloud(clouds, -200 + n * 290 + rand() * 80, 150 + rand() * 90, -260 - rand() * 180, rand);

  // Motes: fireflies at night, pollen by day. A handful per island.
  const motes = new Voxels(rand);
  const moteRanges: Range[] = [];
  for (let i = 0; i < STATIONS; i++) {
    const start = motes.count;
    for (let n = 0; n < 34; n++) {
      motes.add(stationX(i) + (rand() - 0.5) * 220, 12 + rand() * 110, (rand() - 0.5) * 150, 1.5 + rand() * 1.2, [1, 0.92, 0.5]);
    }
    if (bird && i % 2 === 1) spriteVoxels(motes, bird, { x: stationX(i) - 70, y: 118 + rand() * 20, z: -30, maxDepth: 3 });
    moteRanges.push({ start, count: motes.count - start });
  }

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
  let quality = forced !== null ? Number(forced) || 0 : 0;
  let slowFrames = 0;
  let nightMix = document.documentElement.dataset.theme === 'night' ? 1 : 0;
  let nightTarget = nightMix;
  /** `?still` starts paused: one frame per change, for captures on machines without a GPU. */
  let paused = new URLSearchParams(window.location.search).has('still');
  let destroyed = false;
  let raf = 0;
  let last = performance.now();
  let clock = 0;
  let pointer = { x: 0, y: 0 }, look = { x: 0, y: 0 };
  let camX = royRestX(0) + 30;
  let jumpAt = -10;
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
    look.x += (pointer.x - look.x) * Math.min(1, dt * 4);
    look.y += (pointer.y - look.y) * Math.min(1, dt * 4);
    nightMix += (nightTarget - nightMix) * Math.min(1, dt * 3);
    const targetX = royX + (travelling ? 20 : i === 0 && q < 0.5 ? 6 : 44);
    camX += (targetX - camX) * (opts.reducedMotion ? 1 : Math.min(1, dt * 6));
    const aspect = canvas.width / Math.max(1, canvas.height);
    const wide = aspect > 1.05;
    const radius = wide ? 540 : 300 / Math.max(0.35, aspect);
    const yaw = (animate ? Math.sin(clock * 0.17) * 0.05 : 0) + look.x * 0.32 - 0.12;
    const pitch = 0.3 - look.y * 0.1;
    const target: V3 = [camX, 44 + royY * 0.25, 0];
    const eye: V3 = [
      target[0] + Math.sin(yaw) * Math.cos(pitch) * radius,
      target[1] + Math.sin(pitch) * radius,
      target[2] + Math.cos(yaw) * Math.cos(pitch) * radius,
    ];
    const viewProj = mul(perspective(0.52, aspect, 20, 3000), lookAt(eye, target));
    // Desktop: the scene sits in the right half, beside the text. Phones: in the top part.
    const shift: [number, number] = wide ? [0.36, 0.02] : [0, 0.42];

    const lightEye: V3 = [camX + LIGHT_DIR[0] * 600, LIGHT_DIR[1] * 600, LIGHT_DIR[2] * 600];
    const lightVP = mul(ortho(250, 50, 1300), lookAt(lightEye, [camX, 0, 0]));

    const royRange = royRanges.get(frameName) ?? royRanges.get('stand-1')!;
    const bodyYaw = travelling ? (facing > 0 ? 0 : Math.PI) : look.x * 0.4;
    const royModel = trs(royX, royY, ROY_Z, bodyYaw, 1 / Math.sqrt(squash), squash);
    const none = ident();
    const near = [i - 1, i, i + 1, i + 2].filter(n => n >= 0 && n < STATIONS);
    const shadows = quality < 2;

    const drawScene = (prog: typeof main, forShadow: boolean) => {
      const set = (mode: number, model: Mat, progress = 0) => {
        gl.uniform1i(prog.u('uMode'), mode);
        gl.uniformMatrix4fv(prog.u('uModel'), false, model);
        gl.uniform1f(prog.u('uProgress'), progress);
      };
      const emissive = (v: number) => !forShadow && gl.uniform1f(prog.u('uEmissive'), v);
      emissive(0);
      set(0, none);
      for (const n of near) {
        bind(buffers.world, worldRanges[n].start, worldRanges[n].start);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, worldRanges[n].count);
      }
      set(0, royModel);
      bind(buffers.roy, royRange.start, royRange.start);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, royRange.count);
      // The totem pool: from the model of station i to the model of station i + 1.
      set(1, none, q);
      bind(buffers.totems, i * totems.count, (i + 1) * totems.count);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, totems.count);
      if (forShadow) return;
      if (quality < 3) {
        set(0, none);
        emissive(lerp(0.25, 0.0, nightMix));
        bind(buffers.clouds, 0, 0);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, clouds.count);
        set(2, none);
        emissive(lerp(DAY.emissive, NIGHT.emissive, nightMix));
        for (const n of near) {
          bind(buffers.motes, moteRanges[n].start, moteRanges[n].start);
          gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, moteRanges[n].count);
        }
      }
      const b = (clock - jumpAt) / 0.9;
      if (b > 0 && b < 1) {
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
    const theme = {
      top: mix3(DAY.top, NIGHT.top, nightMix), bottom: mix3(DAY.bottom, NIGHT.bottom, nightMix),
      key: mix3(DAY.key, NIGHT.key, nightMix), sky: mix3(DAY.sky, NIGHT.sky, nightMix),
      ground: mix3(DAY.ground, NIGHT.ground, nightMix), orb: mix3(DAY.orb, NIGHT.orb, nightMix),
      lamp: mix3(DAY.lamp, NIGHT.lamp, nightMix),
    };
    // Sky first, with depth off: a gradient, the sun or the moon, and stars at night.
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(null); // the sky is one triangle made from gl_VertexID: no attributes
    gl.useProgram(sky.p);
    gl.uniform3fv(sky.u('uTop'), theme.top);
    gl.uniform3fv(sky.u('uBottom'), theme.bottom);
    gl.uniform3fv(sky.u('uOrb'), theme.orb.map(v => v * lerp(0.32, 0.8, nightMix)));
    gl.uniform2f(sky.u('uOrbAt'), wide ? 0.9 - look.x * 0.01 : 0.8, wide ? 0.82 : 0.9);
    gl.uniform2f(sky.u('uRes'), canvas.width, canvas.height);
    gl.uniform1f(sky.u('uNight'), nightMix);
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
    gl.uniform3fv(main.u('uKey'), theme.key);
    gl.uniform3fv(main.u('uSkyAmb'), theme.sky);
    gl.uniform3fv(main.u('uGroundAmb'), theme.ground);
    gl.uniform3fv(main.u('uFog'), theme.bottom.map(v => Math.pow(v, 2.2)));
    gl.uniform3fv(main.u('uCam'), eye);
    gl.uniform3fv(main.u('uLamp'), theme.lamp);
    gl.uniform3f(main.u('uLampPos'), royX + 26, 58 + royY, ROY_Z + 46);
    gl.uniform1f(main.u('uFogNear'), 520);
    gl.uniform1f(main.u('uFogFar'), 1500);
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
    dirty = resized || Math.abs(nightTarget - nightMix) > 0.002 || Math.abs(targetX - camX) > 0.05;
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
    setTheme(theme) {
      nightTarget = theme === 'night' ? 1 : 0;
      if (opts.reducedMotion) nightMix = nightTarget;
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
