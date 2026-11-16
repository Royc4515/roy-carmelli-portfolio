/**
 * The hero's one WebGL moment: a field of neurons whose spikes travel along faint connections,
 * a nod to the voltage-imaging and spike-train work on the neuroscience side of the degree.
 *
 * Raw WebGL, no library: it is one full-screen triangle and one fragment shader, and three.js
 * would add about 186 kB gzip for that. The shader is written in GLSL ES 1.00 so the same
 * source runs on a WebGL2 context and on the WebGL1 fallback.
 *
 * The field is stateless (no feedback buffer): every frame is a pure function of time and the
 * pointer, so a paused or reduced-motion frame is just one draw call.
 */

export type Rgb = readonly [number, number, number];

export interface FieldColors {
  /** Card ground. */
  bg: Rgb;
  /** Resting cells and connections. */
  ink: Rgb;
  /** A spike. */
  spike: Rgb;
  /** Cells excited by the pointer. */
  touch: Rgb;
  /** 1 on a dark ground (light adds up, like fluorescence), 0 on a light one (ink mixes in). */
  additive: number;
}

export interface NeuralField {
  setColors(colors: FieldColors): void;
  /** Pointer in CSS pixels relative to the canvas box, or null when it left. */
  setPointer(point: { x: number; y: number } | null): void;
  /** Start or stop the animation loop. Stopped, the last frame stays on screen. */
  setRunning(running: boolean): void;
  /** Re-read the canvas box and draw one frame (after a resize or a colour change). */
  refresh(): void;
  destroy(): void;
}

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform float uDensity;   // cells across the canvas height
uniform vec3 uPointer;    // xy in cell units, z = strength 0..1
uniform vec3 uBg;
uniform vec3 uInk;
uniform vec3 uSpike;
uniform vec3 uTouch;
uniform float uAdd;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// A cell body: jittered off the grid so the lattice does not read as a grid, with a slow drift.
vec2 cellPoint(vec2 id) {
  float a = hash(id);
  float b = hash(id + 17.17);
  vec2 jitter = (vec2(a, b) - 0.5) * 0.66;
  vec2 drift = 0.05 * vec2(sin(uTime * 0.31 + a * 6.283), cos(uTime * 0.27 + b * 6.283));
  return id + 0.5 + jitter + drift;
}

// A spike: sharp onset, exponential decay (f runs 0..1 over one cycle of a wave).
float spike(float f, float decay) {
  return smoothstep(0.0, 0.035, f) * exp(-decay * f);
}

// Phase of travelling wave i at position q. Three slow sources that wander off-canvas.
float wavePhase(vec2 q, int i) {
  vec2 s;
  float k;
  float v;
  float o;
  if (i == 0) { s = vec2(-7.0 + sin(uTime * 0.05) * 2.0, 3.0); k = 0.115; v = 0.21; o = 0.0; }
  else if (i == 1) { s = vec2(6.0, -6.0 + cos(uTime * 0.04) * 2.0); k = 0.092; v = 0.16; o = 0.37; }
  else { s = vec2(2.0 + sin(uTime * 0.03) * 3.0, 8.0); k = 0.14; v = 0.125; o = 0.71; }
  return uTime * v - length(q - s) * k + o;
}

// x: activity from the travelling waves, y: activity caused by the pointer.
vec2 activity(vec2 q, vec2 id, float decay, float gated) {
  float a = 0.0;
  for (int i = 0; i < 3; i++) {
    float ph = wavePhase(q, i);
    // Not every cell answers every wave: a real population is sparse.
    float fires = mix(1.0, step(0.42, hash(id + floor(ph) * 7.13 + float(i) * 3.1)), gated);
    a += fires * spike(fract(ph), decay);
  }
  float dp = length(q - uPointer.xy);
  float ring = spike(fract(uTime * 0.55 - dp * 0.33), decay) * exp(-dp * 0.42);
  float near = exp(-dp * dp * 0.55);
  return vec2(a, uPointer.z * (ring + near));
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 q = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y * uDensity;
  float px = uDensity / uRes.y;          // one device pixel, in cell units
  vec2 id0 = floor(q);

  float line = 0.0;
  float body = 0.0;
  vec2 glow = vec2(0.0);

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = id0 + vec2(float(i), float(j));
      vec2 a = cellPoint(id);
      float h = hash(id + 3.7);

      float d = length(q - a);
      float r = 0.05 + 0.035 * h;
      body = max(body, smoothstep(r + px, r - px, d));
      vec2 act = activity(a, id, 4.5, 1.0);
      // A tight core plus a soft halo, scaled by how hard the cell is firing.
      glow += act * (exp(-d * d * 60.0) * 1.1 + exp(-d * d * 7.0) * 0.38);

      float w = px * 0.75;
      if (hash(id + 1.3) > 0.28) {
        line = max(line, smoothstep(w + px, w, segment(q, a, cellPoint(id + vec2(1.0, 0.0)))));
      }
      if (hash(id + 5.9) > 0.28) {
        line = max(line, smoothstep(w + px, w, segment(q, a, cellPoint(id + vec2(0.0, 1.0)))));
      }
      if (hash(id + 9.1) > 0.6) {
        vec2 diag = vec2(1.0, h > 0.5 ? 1.0 : -1.0);
        line = max(line, smoothstep(w + px, w, segment(q, a, cellPoint(id + diag))));
      }
    }
  }

  // Along a connection the wave is evaluated at the pixel itself, so a front runs down the line.
  vec2 travel = activity(q, id0, 9.0, 0.0);

  vec2 uv = gl_FragCoord.xy / uRes;
  float vignette = smoothstep(1.25, 0.25, length(uv - 0.5) * 1.5);

  vec3 col = uBg;
  col = mix(col, uInk, line * 0.2 * vignette);
  col = mix(col, uInk, body * 0.5 * vignette);

  float s = clamp(glow.x + line * travel.x * 0.8, 0.0, 1.0) * vignette;
  float t = clamp(glow.y + line * travel.y * 0.8, 0.0, 1.0) * vignette;
  col = mix(col, uSpike, s * 0.92) + uAdd * uSpike * s * 0.35;
  col = mix(col, uTouch, t * 0.92) + uAdd * uTouch * t * 0.35;

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Cap the backing store: a 3x phone would shade nine times the pixels for no visible gain. */
const MAX_DPR = 1.5;
const MAX_DPR_SMALL = 1.25;
/** Roughly one cell per this many CSS pixels, within sane bounds for tiny and huge canvases. */
const CELL_PX = 84;
/** The pointer's pull fades out this long after it last moved. */
const POINTER_IDLE_MS = 2600;
/** A still frame (paused from the start, or reduced motion) is drawn at a moment with spikes in view. */
const STILL_TIME = 23.4;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Returns null when the browser has no WebGL (or the shader does not compile on this GPU):
 * the caller then keeps the static CSS poster.
 */
export function createNeuralField(
  canvas: HTMLCanvasElement,
  initial: FieldColors,
  onFirstFrame: () => void,
): NeuralField | null {
  // jsdom (tests, the build-time prerender) has a canvas element whose getContext returns null.
  let gl: WebGLRenderingContext | null = null;
  try {
    const attrs: WebGLContextAttributes = { antialias: false, alpha: false, powerPreference: 'low-power' };
    gl =
      (canvas.getContext('webgl2', attrs) as WebGLRenderingContext | null) ??
      (canvas.getContext('webgl', attrs) as WebGLRenderingContext | null);
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const ctx = gl;

  let colors = initial;
  let program: WebGLProgram | null = null;
  let uniforms: Record<string, WebGLUniformLocation | null> = {};
  let running = false;
  let frame = 0;
  let last = 0;
  let time = STILL_TIME;
  let drawn = false;
  let lost = false;
  let destroyed = false;
  let density = 6;
  let cssHeight = 1;
  let pointer: { x: number; y: number } | null = null;
  let pointerAt = 0;
  let strength = 0;

  function init(): boolean {
    const vs = compile(ctx, ctx.VERTEX_SHADER, VERTEX);
    const fs = compile(ctx, ctx.FRAGMENT_SHADER, FRAGMENT);
    const prog = ctx.createProgram();
    if (!vs || !fs || !prog) return false;
    ctx.attachShader(prog, vs);
    ctx.attachShader(prog, fs);
    ctx.linkProgram(prog);
    if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) return false;
    ctx.useProgram(prog);
    // One triangle that covers the clip space: no index buffer, no seam down the diagonal.
    const buffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW);
    const loc = ctx.getAttribLocation(prog, 'aPos');
    ctx.enableVertexAttribArray(loc);
    ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
    program = prog;
    uniforms = {};
    for (const name of ['uRes', 'uTime', 'uDensity', 'uPointer', 'uBg', 'uInk', 'uSpike', 'uTouch', 'uAdd']) {
      uniforms[name] = ctx.getUniformLocation(prog, name);
    }
    return true;
  }

  function resize(): void {
    const box = canvas.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return;
    const cap = box.width < 600 ? MAX_DPR_SMALL : MAX_DPR;
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    const w = Math.round(box.width * dpr);
    const h = Math.round(box.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    cssHeight = box.height;
    density = Math.min(8, Math.max(3.6, box.height / CELL_PX));
    ctx.viewport(0, 0, w, h);
  }

  function draw(): void {
    if (lost || destroyed || !program) return;
    ctx.uniform2f(uniforms.uRes, canvas.width, canvas.height);
    ctx.uniform1f(uniforms.uTime, time);
    ctx.uniform1f(uniforms.uDensity, density);
    // CSS pixels (top-left origin) to the shader's cell units (centre origin, y up).
    const box = canvas.getBoundingClientRect();
    const px = pointer ? ((pointer.x - box.width / 2) / cssHeight) * density : 0;
    const py = pointer ? ((box.height / 2 - pointer.y) / cssHeight) * density : 0;
    ctx.uniform3f(uniforms.uPointer, px, py, strength);
    ctx.uniform3f(uniforms.uBg, ...colors.bg);
    ctx.uniform3f(uniforms.uInk, ...colors.ink);
    ctx.uniform3f(uniforms.uSpike, ...colors.spike);
    ctx.uniform3f(uniforms.uTouch, ...colors.touch);
    ctx.uniform1f(uniforms.uAdd, colors.additive);
    ctx.drawArrays(ctx.TRIANGLES, 0, 3);
    if (!drawn) {
      drawn = true;
      onFirstFrame();
    }
  }

  function tick(now: number): void {
    if (!running) return;
    // Clamp the step: after a background tab or a long task the field must not jump ahead.
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    const target = pointer && now - pointerAt < POINTER_IDLE_MS ? 1 : 0;
    strength += (target - strength) * Math.min(1, dt * 4);
    draw();
    frame = requestAnimationFrame(tick);
  }

  function onLost(event: Event): void {
    // don't touch / without preventDefault the browser never fires `webglcontextrestored`.
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
  }
  function onRestored(): void {
    lost = !init();
    if (lost) return;
    resize();
    draw();
    if (running) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  if (!init()) return null;
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  resize();
  draw();

  return {
    setColors(next) {
      colors = next;
      if (!running) draw();
    },
    setPointer(point) {
      pointer = point ?? pointer;
      // Leaving does not drop the last position: the glow fades where the pointer was.
      pointerAt = point ? performance.now() : 0;
    },
    setRunning(next) {
      if (next === running || destroyed) return;
      running = next;
      cancelAnimationFrame(frame);
      if (running && !lost) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    },
    refresh() {
      if (lost || destroyed) return;
      resize();
      if (!running) draw();
    },
    destroy() {
      destroyed = true;
      running = false;
      cancelAnimationFrame(frame);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    },
  };
}
